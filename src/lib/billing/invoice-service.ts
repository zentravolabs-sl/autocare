import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { BusinessRuleError } from "@/lib/api/errors";
import { postJournalEntry, buildInvoiceJournalLines, buildPaymentJournalLines } from "@/lib/accounting/journal";
import { recordStockMovement } from "@/lib/inventory/ledger";
import {
  computeInvoiceTotals,
  DEFAULT_VAT_RATE,
  InvoiceItemType,
  PaymentMethodCode,
  round2,
} from "@/lib/billing/calc";

type PrismaTx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface BillingContext {
  organizationId: string;
  branchId: string;
  userId: string;
}

/** Interactive transactions run against a remote database; give them room. */
export const TX_OPTIONS = { maxWait: 15000, timeout: 60000 } as const;

interface DraftLine {
  itemType: InvoiceItemType;
  description: string;
  quantity: number | Decimal;
  unitPrice: number | Decimal;
  discountAmount: number | Decimal;
  referenceId?: string;
  partId?: string;
  warehouseId?: string;
  unitCost?: number | Decimal;
}

async function nextNumber(
  tx: PrismaTx,
  kind: "INV" | "PAY",
  organizationId: string,
  count = 1
): Promise<string[]> {
  const prefix = `${kind}-${new Date().getFullYear()}-`;
  let last: string | undefined;
  if (kind === "INV") {
    last = (
      await tx.invoice.findFirst({
        where: { organizationId, invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
        select: { invoiceNumber: true },
      })
    )?.invoiceNumber;
  } else {
    last = (
      await tx.payment.findFirst({
        where: { organizationId, paymentNumber: { startsWith: prefix } },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      })
    )?.paymentNumber;
  }
  const start = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(5, "0")}`);
}

async function persistInvoice(
  tx: PrismaTx,
  ctx: BillingContext,
  input: {
    type: "JOB_CARD" | "COUNTER_SALE";
    branchId: string;
    customerId: string;
    vehicleId?: string | null;
    jobCardId?: string | null;
    notes?: string;
    lines: DraftLine[];
  }
) {
  if (input.lines.length === 0) {
    throw new BusinessRuleError("There is nothing to bill: no billable lines were found.");
  }
  const totals = computeInvoiceTotals(
    input.lines.map((l) => ({
      itemType: l.itemType,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountAmount: l.discountAmount,
    })),
    DEFAULT_VAT_RATE
  );
  if (totals.totalAmount.lessThanOrEqualTo(0)) {
    throw new BusinessRuleError("Invoice total must be greater than zero.");
  }

  const [invoiceNumber] = await nextNumber(tx, "INV", ctx.organizationId);
  return tx.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: input.branchId,
      invoiceNumber,
      customerId: input.customerId,
      vehicleId: input.vehicleId ?? null,
      jobCardId: input.jobCardId ?? null,
      type: input.type,
      status: "DRAFT",
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      balanceAmount: totals.totalAmount,
      notes: input.notes,
      items: {
        create: input.lines.map((l, i) => ({
          itemType: l.itemType,
          referenceId: l.referenceId,
          partId: l.partId,
          warehouseId: l.warehouseId,
          unitCost: l.unitCost !== undefined ? round2(l.unitCost) : 0,
          description: l.description,
          quantity: totals.lines[i].quantity,
          unitPrice: totals.lines[i].unitPrice,
          discountAmount: totals.lines[i].discountAmount,
          taxAmount: totals.lines[i].taxAmount,
          totalAmount: totals.lines[i].totalAmount,
        })),
      },
    },
    include: { items: true },
  });
}

/** Bills actual labor and parts already issued to the bay for a job card. */
export async function createInvoiceFromJobCard(
  tx: PrismaTx,
  ctx: BillingContext,
  jobCardId: string,
  notes?: string
) {
  const jobCard = await tx.jobCard.findFirst({
    where: { id: jobCardId, organizationId: ctx.organizationId },
    include: {
      tasks: true,
      partsIssued: { where: { status: "ISSUED" }, include: { part: true } },
    },
  });
  if (!jobCard) throw new BusinessRuleError("Job card not found.");

  const existing = await tx.invoice.findFirst({
    where: { jobCardId, organizationId: ctx.organizationId, status: { not: "CANCELLED" } },
    select: { invoiceNumber: true },
  });
  if (existing) {
    throw new BusinessRuleError(`Job card already has invoice ${existing.invoiceNumber}.`);
  }

  const lines: DraftLine[] = [];
  for (const task of jobCard.tasks) {
    if (task.status === "CANCELLED") continue;
    const actual = new Decimal(task.actualHours.toString());
    const hours = actual.greaterThan(0) ? actual : new Decimal(task.estimatedHours.toString());
    const rate = new Decimal(task.hourlyRate.toString());
    if (hours.isZero() || rate.isZero()) continue;
    lines.push({
      itemType: "LABOR",
      description: task.name,
      quantity: hours,
      unitPrice: rate,
      discountAmount: 0,
      referenceId: task.id,
    });
  }
  for (const issue of jobCard.partsIssued) {
    lines.push({
      itemType: "PART",
      description: `${issue.part.name} (${issue.part.sku})`,
      quantity: new Decimal(issue.quantity.toString()),
      unitPrice: new Decimal(issue.unitPrice.toString()),
      discountAmount: 0,
      referenceId: issue.id,
      partId: issue.partId,
      warehouseId: issue.warehouseId,
      unitCost: new Decimal(issue.unitCost.toString()),
    });
  }

  return persistInvoice(tx, ctx, {
    type: "JOB_CARD",
    branchId: jobCard.branchId,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
    jobCardId: jobCard.id,
    notes,
    lines,
  });
}

export interface PosLineInput {
  itemType: InvoiceItemType;
  partId?: string;
  warehouseId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discountAmount: number;
}

async function getOrCreateWalkInCustomer(tx: PrismaTx, organizationId: string) {
  const code = "WALK-IN";
  const existing = await tx.customer.findUnique({
    where: { organizationId_customerCode: { organizationId, customerCode: code } },
  });
  if (existing) return existing;
  return tx.customer.create({
    data: {
      organizationId,
      customerCode: code,
      type: "INDIVIDUAL",
      firstName: "Walk-in",
      lastName: "Customer",
      phone: "N/A",
    },
  });
}

/** Counter sale: parts from a chosen warehouse plus optional ad-hoc charges. */
export async function createPosInvoice(
  tx: PrismaTx,
  ctx: BillingContext,
  input: { branchId?: string; customerId?: string; notes?: string; items: PosLineInput[] }
) {
  const branchId = input.branchId || ctx.branchId;
  if (!branchId) throw new BusinessRuleError("No active branch selected.");
  const branch = await tx.branch.findFirst({
    where: { id: branchId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!branch) throw new BusinessRuleError("Branch not found in this organization.");

  const partIds = Array.from(new Set(input.items.filter((i) => i.partId).map((i) => i.partId!)));
  const warehouseIds = Array.from(new Set(input.items.filter((i) => i.warehouseId).map((i) => i.warehouseId!)));
  const [parts, warehouses] = await Promise.all([
    tx.part.findMany({ where: { id: { in: partIds }, organizationId: ctx.organizationId, isActive: true } }),
    tx.warehouse.findMany({ where: { id: { in: warehouseIds }, organizationId: ctx.organizationId } }),
  ]);
  const partById = new Map(parts.map((p) => [p.id, p]));
  const warehouseIdsOk = new Set(warehouses.map((w) => w.id));

  const lines: DraftLine[] = input.items.map((item) => {
    if (item.itemType === "PART") {
      const part = partById.get(item.partId!);
      if (!part) throw new BusinessRuleError("A selected part was not found or is inactive.");
      if (!warehouseIdsOk.has(item.warehouseId!)) {
        throw new BusinessRuleError("A selected warehouse was not found in this organization.");
      }
      return {
        itemType: "PART",
        description: `${part.name} (${part.sku})`,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? new Decimal(part.sellingPrice.toString()),
        discountAmount: item.discountAmount,
        referenceId: part.id,
        partId: part.id,
        warehouseId: item.warehouseId,
      };
    }
    return {
      itemType: item.itemType,
      description: item.description!,
      quantity: item.quantity,
      unitPrice: item.unitPrice!,
      discountAmount: item.discountAmount,
    };
  });

  let customerId = input.customerId;
  if (customerId) {
    const c = await tx.customer.findFirst({
      where: { id: customerId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!c) throw new BusinessRuleError("Customer not found in this organization.");
  } else {
    customerId = (await getOrCreateWalkInCustomer(tx, ctx.organizationId)).id;
  }

  return persistInvoice(tx, ctx, {
    type: "COUNTER_SALE",
    branchId,
    customerId,
    notes: input.notes,
    lines,
  });
}

/**
 * Locks a draft invoice, relieves stock for counter-sale parts, and posts the sales
 * journal (receivable, revenue, VAT, cost of goods sold).
 */
export async function finalizeInvoice(tx: PrismaTx, ctx: BillingContext, invoiceId: string) {
  const invoice = await tx.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.organizationId },
    include: { items: true },
  });
  if (!invoice) throw new BusinessRuleError("Invoice not found.");

  // Claim the draft atomically so two concurrent finalize calls cannot both post.
  const claimed = await tx.invoice.updateMany({
    where: { id: invoiceId, organizationId: ctx.organizationId, status: "DRAFT" },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new BusinessRuleError(`Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot be finalized.`);
  }

  const partLines = invoice.items.filter((i) => i.itemType === "PART" && i.partId && i.warehouseId);
  let cogs = new Decimal(0);

  if (invoice.type !== "JOB_CARD" && partLines.length > 0) {
    const stocks = await tx.stock.findMany({
      where: {
        OR: partLines.map((l) => ({ warehouseId: l.warehouseId!, partId: l.partId! })),
      },
    });
    const stockByKey = new Map(stocks.map((s) => [`${s.warehouseId}:${s.partId}`, s]));

    const needed = new Map<string, Decimal>();
    for (const l of partLines) {
      const key = `${l.warehouseId}:${l.partId}`;
      needed.set(key, (needed.get(key) ?? new Decimal(0)).add(l.quantity.toString()));
    }
    for (const [key, qty] of needed) {
      const stock = stockByKey.get(key);
      const available = new Decimal(stock?.quantityAvailable.toString() ?? 0);
      if (!stock || available.lessThan(qty)) {
        throw new BusinessRuleError(
          `Insufficient available stock for a line on ${invoice.invoiceNumber}: needs ${qty}, available ${available}.`
        );
      }
    }

    for (const line of partLines) {
      const stock = stockByKey.get(`${line.warehouseId}:${line.partId}`)!;
      const unitCost = new Decimal(stock.averageUnitCost.toString());
      await recordStockMovement(tx, {
        organizationId: ctx.organizationId,
        branchId: invoice.branchId,
        warehouseId: line.warehouseId!,
        partId: line.partId!,
        movementType: "COUNTER_SALE",
        quantity: new Decimal(line.quantity.toString()).negated(),
        unitCost,
        referenceType: "INVOICE",
        referenceId: invoice.invoiceNumber,
        notes: `Counter sale ${invoice.invoiceNumber}`,
        createdById: ctx.userId,
      });
      await tx.invoiceItem.update({ where: { id: line.id }, data: { unitCost } });
      cogs = cogs.add(new Decimal(line.quantity.toString()).mul(unitCost));
    }
  } else {
    // Job-card parts already left stock when issued; cost was captured on the invoice line.
    for (const line of partLines) {
      cogs = cogs.add(new Decimal(line.quantity.toString()).mul(line.unitCost.toString()));
    }
  }

  const netByType: Partial<Record<InvoiceItemType, Decimal>> = {};
  for (const item of invoice.items) {
    const type = item.itemType as InvoiceItemType;
    const net = new Decimal(item.totalAmount.toString()).sub(item.taxAmount.toString());
    netByType[type] = (netByType[type] ?? new Decimal(0)).add(net);
  }

  await postJournalEntry(tx, {
    organizationId: ctx.organizationId,
    branchId: invoice.branchId,
    description: `Sales invoice ${invoice.invoiceNumber}`,
    referenceType: "INVOICE",
    referenceId: invoice.id,
    lines: buildInvoiceJournalLines({ netByType, taxAmount: invoice.taxAmount.toString(), cogs }),
  });

  await tx.customer.update({
    where: { id: invoice.customerId },
    data: { outstandingBalance: { increment: invoice.totalAmount } },
  });
  await tx.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: invoice.branchId,
      userId: ctx.userId,
      action: "FINALIZE_INVOICE",
      entity: "INVOICE",
      entityId: invoice.id,
      newValues: { invoiceNumber: invoice.invoiceNumber, total: invoice.totalAmount.toString() },
    },
  });

  return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { items: true, payments: true } });
}

export interface PaymentInput {
  method: PaymentMethodCode;
  amount: number;
  transactionReference?: string;
}

/** Records one or more tendered payments (split tender) against a finalized invoice. */
export async function receivePayments(
  tx: PrismaTx,
  ctx: BillingContext,
  invoiceId: string,
  payments: PaymentInput[]
) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, organizationId: ctx.organizationId } });
  if (!invoice) throw new BusinessRuleError("Invoice not found.");
  if (invoice.status !== "FINALIZED" && invoice.status !== "PARTIAL") {
    throw new BusinessRuleError(`Invoice ${invoice.invoiceNumber} is ${invoice.status}; payments cannot be recorded.`);
  }

  const amounts = payments.map((p) => round2(p.amount));
  const total = amounts.reduce((a, v) => a.add(v), new Decimal(0));
  const balance = new Decimal(invoice.balanceAmount.toString());
  if (total.greaterThan(balance)) {
    throw new BusinessRuleError(`Payment of ${total} exceeds the outstanding balance of ${balance}.`);
  }

  const newBalance = balance.sub(total);
  // Optimistic guard: only apply if nobody else changed the balance since we read it.
  const updated = await tx.invoice.updateMany({
    where: { id: invoiceId, organizationId: ctx.organizationId, balanceAmount: invoice.balanceAmount },
    data: {
      paidAmount: new Decimal(invoice.paidAmount.toString()).add(total),
      balanceAmount: newBalance,
      status: newBalance.isZero() ? "PAID" : "PARTIAL",
    },
  });
  if (updated.count === 0) {
    throw new BusinessRuleError("The invoice was modified by another user. Reload and try again.");
  }

  const numbers = await nextNumber(tx, "PAY", ctx.organizationId, payments.length);
  const created = [];
  for (let i = 0; i < payments.length; i++) {
    created.push(
      await tx.payment.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: invoice.branchId,
          invoiceId,
          paymentNumber: numbers[i],
          paymentMethod: payments[i].method,
          amount: amounts[i],
          transactionReference: payments[i].transactionReference,
          receivedById: ctx.userId,
        },
      })
    );
  }

  await postJournalEntry(tx, {
    organizationId: ctx.organizationId,
    branchId: invoice.branchId,
    description: `Payment received for ${invoice.invoiceNumber}`,
    referenceType: "INVOICE_PAYMENT",
    referenceId: invoice.id,
    lines: buildPaymentJournalLines(payments.map((p, i) => ({ method: p.method, amount: amounts[i] }))),
  });

  await tx.customer.update({
    where: { id: invoice.customerId },
    data: { outstandingBalance: { decrement: total } },
  });
  await tx.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: invoice.branchId,
      userId: ctx.userId,
      action: "RECEIVE_PAYMENT",
      entity: "INVOICE",
      entityId: invoice.id,
      newValues: { amount: total.toString(), methods: payments.map((p) => p.method) },
    },
  });

  return { payments: created, paidTotal: total, balance: newBalance, status: newBalance.isZero() ? "PAID" : "PARTIAL" };
}

/** Only drafts can be cancelled; anything finalized has posted accounting and needs a credit note. */
export async function cancelDraftInvoice(tx: PrismaTx, ctx: BillingContext, invoiceId: string) {
  const res = await tx.invoice.updateMany({
    where: { id: invoiceId, organizationId: ctx.organizationId, status: "DRAFT" },
    data: { status: "CANCELLED" },
  });
  if (res.count === 0) {
    throw new BusinessRuleError("Only draft invoices can be cancelled.");
  }
}
