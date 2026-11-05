import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";
import { receivePaymentsSchema } from "@/lib/validation/billing";
import { receivePayments, TX_OPTIONS } from "@/lib/billing/invoice-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("payment.receive");
    const tenant = await getTenantContext();
    const { id } = await params;
    const body = receivePaymentsSchema.parse(await req.json());
    const ctx = { organizationId: tenant.organizationId, branchId: tenant.branchId, userId: session.userId };

    const result = await prisma.$transaction((tx) => receivePayments(tx, ctx, id, body.payments), TX_OPTIONS);
    return NextResponse.json({
      success: true,
      status: result.status,
      paidTotal: Number(result.paidTotal),
      balance: Number(result.balance),
      payments: result.payments.map((p) => ({ id: p.id, paymentNumber: p.paymentNumber })),
    });
  } catch (err) {
    return apiError(err);
  }
}
