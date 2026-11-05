import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";
import { finalizeInvoice, TX_OPTIONS } from "@/lib/billing/invoice-service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("invoice.finalize");
    const tenant = await getTenantContext();
    const { id } = await params;
    const ctx = { organizationId: tenant.organizationId, branchId: tenant.branchId, userId: session.userId };

    const invoice = await prisma.$transaction((tx) => finalizeInvoice(tx, ctx, id), TX_OPTIONS);
    return NextResponse.json({
      success: true,
      invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status },
    });
  } catch (err) {
    return apiError(err);
  }
}
