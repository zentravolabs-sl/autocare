import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";
import { createInvoiceSchema } from "@/lib/validation/billing";
import { createInvoiceFromJobCard, createPosInvoice, TX_OPTIONS } from "@/lib/billing/invoice-service";

const STATUSES = ["DRAFT", "FINALIZED", "PAID", "PARTIAL", "CANCELLED", "REFUNDED"] as const;

export async function GET(req: NextRequest) {
  try {
    await requirePermission("invoice.create");
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;

    const status = sp.get("status");
    const search = sp.get("search")?.trim();
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

    const where: Record<string, unknown> = { organizationId };
    if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [invoices, total, outstanding] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true } },
          jobCard: { select: { id: true, jobNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where: { organizationId, status: { in: ["FINALIZED", "PARTIAL"] } },
        _sum: { balanceAmount: true },
      }),
    ]);

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        type: i.type,
        status: i.status,
        customer: i.customer,
        jobCard: i.jobCard,
        totalAmount: Number(i.totalAmount),
        paidAmount: Number(i.paidAmount),
        balanceAmount: Number(i.balanceAmount),
        createdAt: i.createdAt,
        finalizedAt: i.finalizedAt,
      })),
      outstandingTotal: Number(outstanding._sum.balanceAmount ?? 0),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("invoice.create");
    const tenant = await getTenantContext();
    const ctx = { organizationId: tenant.organizationId, branchId: tenant.branchId, userId: session.userId };
    const body = createInvoiceSchema.parse(await req.json());

    const invoice = await prisma.$transaction(
      (tx) =>
        body.jobCardId
          ? createInvoiceFromJobCard(tx, ctx, body.jobCardId, body.notes)
          : createPosInvoice(tx, ctx, {
              branchId: body.branchId,
              customerId: body.customerId,
              notes: body.notes,
              items: body.items!.map((i) => ({
                itemType: i.itemType,
                partId: i.partId,
                warehouseId: i.warehouseId,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountAmount: i.discountAmount,
              })),
            }),
      TX_OPTIONS
    );

    return NextResponse.json(
      {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: Number(invoice.totalAmount),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
