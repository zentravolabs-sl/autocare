import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";
import { cancelDraftInvoice, TX_OPTIONS } from "@/lib/billing/invoice-service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("invoice.create");
    const tenant = await getTenantContext();
    const { id } = await params;
    const ctx = { organizationId: tenant.organizationId, branchId: tenant.branchId, userId: session.userId };

    await prisma.$transaction((tx) => cancelDraftInvoice(tx, ctx, id), TX_OPTIONS);
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
