import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ACCOUNT, AccountType, isDebitNormal } from "@/lib/accounting/chart";
import {
  InvoiceItemType,
  PaymentMethodCode,
  revenueAccountFor,
  round2,
  settlementAccountFor,
} from "@/lib/billing/calc";

type PrismaTx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface JournalLineInput {
  accountCode: string;
  debit?: Decimal.Value;
  credit?: Decimal.Value;
  description?: string;
}

export class UnbalancedJournalError extends Error {
  constructor(debit: Decimal, credit: Decimal) {
    super(`Journal entry is not balanced: debits ${debit} != credits ${credit}`);
    this.name = "UnbalancedJournalError";
  }
}

/** Drops zero lines, rounds to cents and verifies debits equal credits exactly. */
export function normalizeAndValidateLines(lines: JournalLineInput[]) {
  const cleaned = lines
    .map((l) => ({
      accountCode: l.accountCode,
      debit: round2(l.debit ?? 0),
      credit: round2(l.credit ?? 0),
      description: l.description,
    }))
    .filter((l) => !l.debit.isZero() || !l.credit.isZero());

  for (const l of cleaned) {
    if (l.debit.isNegative() || l.credit.isNegative()) {
      throw new Error("Journal line amounts cannot be negative");
    }
    if (!l.debit.isZero() && !l.credit.isZero()) {
      throw new Error("A journal line cannot carry both a debit and a credit");
    }
  }
  if (cleaned.length < 2) {
    throw new Error("A journal entry needs at least two non-zero lines");
  }

  const totalDebit = cleaned.reduce((a, l) => a.add(l.debit), new Decimal(0));
  const totalCredit = cleaned.reduce((a, l) => a.add(l.credit), new Decimal(0));
  if (!totalDebit.equals(totalCredit)) {
    throw new UnbalancedJournalError(totalDebit, totalCredit);
  }
  return { lines: cleaned, totalDebit, totalCredit };
}

/**
 * Builds the sales journal for a finalized invoice:
 *   Dr Accounts Receivable            (net sales + VAT)
 *     Cr Revenue (labor/parts/other)  (net of discounts)
 *     Cr VAT payable
 *   Dr Cost of goods sold             (inventory cost of parts sold)
 *     Cr Inventory
 */
export function buildInvoiceJournalLines(input: {
  netByType: Partial<Record<InvoiceItemType, Decimal.Value>>;
  taxAmount: Decimal.Value;
  cogs: Decimal.Value;
}): JournalLineInput[] {
  const revenueByAccount = new Map<string, Decimal>();
  for (const [type, amount] of Object.entries(input.netByType)) {
    const acc = revenueAccountFor(type as InvoiceItemType);
    revenueByAccount.set(acc, (revenueByAccount.get(acc) ?? new Decimal(0)).add(round2(amount ?? 0)));
  }
  const tax = round2(input.taxAmount);
  const cogs = round2(input.cogs);
  const revenueTotal = Array.from(revenueByAccount.values()).reduce((a, v) => a.add(v), new Decimal(0));

  const lines: JournalLineInput[] = [
    { accountCode: ACCOUNT.RECEIVABLE, debit: revenueTotal.add(tax), description: "Invoice receivable" },
  ];
  for (const [accountCode, credit] of revenueByAccount) {
    lines.push({ accountCode, credit, description: "Sales revenue" });
  }
  lines.push({ accountCode: ACCOUNT.VAT_PAYABLE, credit: tax, description: "Output VAT" });
  lines.push({ accountCode: ACCOUNT.COGS, debit: cogs, description: "Cost of parts sold" });
  lines.push({ accountCode: ACCOUNT.INVENTORY, credit: cogs, description: "Inventory relieved" });
  return lines;
}

/** Dr Cash / Bank per method, Cr Accounts Receivable for the whole receipt. */
export function buildPaymentJournalLines(
  payments: { method: PaymentMethodCode; amount: Decimal.Value }[]
): JournalLineInput[] {
  const byAccount = new Map<string, Decimal>();
  for (const p of payments) {
    const acc = settlementAccountFor(p.method);
    byAccount.set(acc, (byAccount.get(acc) ?? new Decimal(0)).add(round2(p.amount)));
  }
  const total = Array.from(byAccount.values()).reduce((a, v) => a.add(v), new Decimal(0));
  const lines: JournalLineInput[] = [];
  for (const [accountCode, debit] of byAccount) {
    lines.push({ accountCode, debit, description: "Payment received" });
  }
  lines.push({ accountCode: ACCOUNT.RECEIVABLE, credit: total, description: "Receivable settled" });
  return lines;
}

async function nextEntryNumber(tx: PrismaTx, organizationId: string): Promise<string> {
  const prefix = `JE-${new Date().getFullYear()}-`;
  const last = await tx.journalEntry.findFirst({
    where: { organizationId, entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });
  const seq = last ? parseInt(last.entryNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export interface PostJournalParams {
  organizationId: string;
  branchId: string;
  description: string;
  referenceType: string;
  referenceId: string;
  lines: JournalLineInput[];
  date?: Date;
}

/**
 * Posts a balanced journal entry and keeps the cached Account.balance in step.
 * Must run inside a transaction so the entry, its lines and the balances commit together.
 */
export async function postJournalEntry(tx: PrismaTx, params: PostJournalParams) {
  const { lines, totalDebit } = normalizeAndValidateLines(params.lines);

  const codes = Array.from(new Set(lines.map((l) => l.accountCode)));
  const accounts = await tx.account.findMany({
    where: { organizationId: params.organizationId, code: { in: codes }, isActive: true },
    select: { id: true, code: true, type: true },
  });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  for (const code of codes) {
    if (!byCode.has(code)) {
      throw new Error(`Account ${code} is missing or inactive in this organization's chart of accounts`);
    }
  }

  const entryNumber = await nextEntryNumber(tx, params.organizationId);
  const entry = await tx.journalEntry.create({
    data: {
      organizationId: params.organizationId,
      branchId: params.branchId,
      entryNumber,
      date: params.date ?? new Date(),
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description,
      isBalanced: true,
      isPosted: true,
      lines: {
        create: lines.map((l) => ({
          accountId: byCode.get(l.accountCode)!.id,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
  });

  const deltaByAccount = new Map<string, Decimal>();
  for (const l of lines) {
    const acc = byCode.get(l.accountCode)!;
    const net = isDebitNormal(acc.type as AccountType) ? l.debit.sub(l.credit) : l.credit.sub(l.debit);
    deltaByAccount.set(acc.id, (deltaByAccount.get(acc.id) ?? new Decimal(0)).add(net));
  }
  for (const [accountId, delta] of deltaByAccount) {
    await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
  }

  return { entry, totalAmount: totalDebit };
}

/**
 * Rebuilds the cached Account.balance column for an organization from its journal lines.
 * Journal lines are the source of truth; this repairs any drift.
 */
export async function recomputeAccountBalances(prisma: PrismaClient, organizationId: string) {
  const accounts = await prisma.account.findMany({ where: { organizationId } });
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { journalEntry: { organizationId } },
    _sum: { debit: true, credit: true },
  });
  const sumById = new Map(sums.map((s) => [s.accountId, s._sum]));
  for (const acc of accounts) {
    const s = sumById.get(acc.id);
    const debit = new Decimal(s?.debit?.toString() ?? 0);
    const credit = new Decimal(s?.credit?.toString() ?? 0);
    const balance = isDebitNormal(acc.type as AccountType) ? debit.sub(credit) : credit.sub(debit);
    await prisma.account.update({ where: { id: acc.id }, data: { balance } });
  }
}
