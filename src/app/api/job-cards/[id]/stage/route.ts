import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { validateStageTransition } from "@/lib/workflow/job-card-fsm";
import { jobCardUpdateStageSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("job-card.update");
    const { organizationId, userId } = await getTenantContext();
    const { id } = await params;
    const body = await req.json();

    const validated = jobCardUpdateStageSchema.parse(body);

    const jobCard = await prisma.jobCard.findFirst({
      where: { id, organizationId },
      include: {
        tasks: true,
        inspections: true,
        invoices: true,
      },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    // Check prerequisites
    const pendingTasks = jobCard.tasks.filter((t) => t.isMandatory && t.status !== "COMPLETED");
    const hasQualityCheck = jobCard.inspections.some((i) => i.status === "COMPLETED");
    const latestInvoice = jobCard.invoices[0];
    const isInvoicePaid = latestInvoice ? latestInvoice.status === "PAID" : false;

    const transition = validateStageTransition(jobCard.stage, validated.stage, {
      pendingTasksCount: pendingTasks.length,
      hasQualityCheck,
      isInvoicePaid,
    });

    if (!transition.allowed) {
      return NextResponse.json(
        { error: transition.reason || "Stage transition not permitted" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const jc = await tx.jobCard.update({
        where: { id },
        data: {
          stage: validated.stage,
        },
      });

      // If completing/delivering or closing, release workshop bay
      if (
        (validated.stage === "CLOSED" || validated.stage === "VEHICLE_DELIVERY" || validated.stage === "CANCELLED") &&
        jc.bayId
      ) {
        await tx.workshopBay.update({
          where: { id: jc.bayId },
          data: { status: "AVAILABLE" },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: "UPDATE_STAGE",
          entity: "JOB_CARD",
          entityId: id,
          oldValues: { stage: jobCard.stage },
          newValues: { stage: validated.stage, notes: validated.notes },
        },
      });

      return jc;
    });

    return NextResponse.json({ success: true, jobCard: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
