import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("invoice.create");
    const { organizationId } = await getTenantContext();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        payments: { orderBy: { receivedAt: "asc" } },
        customer: true,
        vehicle: { select: { registrationNumber: true, make: true, model: true } },
        jobCard: { select: { id: true, jobNumber: true } },
        branch: { select: { name: true, address: true, phone: true } },
      },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const [journalEntries, organization] = await Promise.all([
      prisma.journalEntry.findMany({
        where: {
          organizationId,
          referenceType: { in: ["INVOICE", "INVOICE_PAYMENT"] },
          referenceId: invoice.id,
        },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, taxNumber: true, address: true, phone: true, email: true },
      }),
    ]);

    const n = (v: unknown) => Number(v);
    return NextResponse.json({
      organization,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        status: invoice.status,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
        finalizedAt: invoice.finalizedAt,
        subtotal: n(invoice.subtotal),
        discountAmount: n(invoice.discountAmount),
        taxAmount: n(invoice.taxAmount),
        totalAmount: n(invoice.totalAmount),
        paidAmount: n(invoice.paidAmount),
        balanceAmount: n(invoice.balanceAmount),
        customer: {
          id: invoice.customer.id,
          name:
            invoice.customer.companyName ||
            `${invoice.customer.firstName} ${invoice.customer.lastName ?? ""}`.trim(),
          phone: invoice.customer.phone,
          taxNumber: invoice.customer.taxNumber,
        },
        vehicle: invoice.vehicle,
        jobCard: invoice.jobCard,
        branch: invoice.branch,
        items: invoice.items.map((i) => ({
          id: i.id,
          itemType: i.itemType,
          description: i.description,
          quantity: n(i.quantity),
          unitPrice: n(i.unitPrice),
          discountAmount: n(i.discountAmount),
          taxAmount: n(i.taxAmount),
          totalAmount: n(i.totalAmount),
        })),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          paymentNumber: p.paymentNumber,
          method: p.paymentMethod,
          amount: n(p.amount),
          transactionReference: p.transactionReference,
          receivedAt: p.receivedAt,
        })),
      },
      journalEntries: journalEntries.map((j) => ({
        id: j.id,
        entryNumber: j.entryNumber,
        description: j.description,
        date: j.date,
        lines: j.lines.map((l) => ({
          account: `${l.account.code} ${l.account.name}`,
          debit: n(l.debit),
          credit: n(l.credit),
        })),
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
