import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { estimateApprovalSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("job-card.approve");
    const { organizationId, userId } = await getTenantContext();
    const { id: jobCardId } = await params;
    const body = await req.json();

    const validated = estimateApprovalSchema.parse(body);

    const estimate = await prisma.estimate.findFirst({
      where: {
        id: validated.estimateId,
        jobCardId,
        jobCard: { organizationId },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const status = validated.isApproved ? "APPROVED" : "REJECTED";

      const updatedEstimate = await tx.estimate.update({
        where: { id: validated.estimateId },
        data: {
          status,
          approvedAt: validated.isApproved ? now : null,
          customerSignature: validated.customerSignature || null,
          notes: validated.notes || null,
        },
      });

      // Update Job Card stage to CUSTOMER_APPROVAL
      if (validated.isApproved) {
        await tx.jobCard.update({
          where: { id: jobCardId },
          data: { stage: "CUSTOMER_APPROVAL" },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: validated.isApproved ? "APPROVE_ESTIMATE" : "REJECT_ESTIMATE",
          entity: "ESTIMATE",
          entityId: estimate.id,
          newValues: { status, approvedAt: now.toISOString() },
        },
      });

      return updatedEstimate;
    });

    return NextResponse.json({ success: true, estimate: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
