import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { jobTaskCreateSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("job-card.update");
    const { organizationId, userId } = await getTenantContext();
    const { id: jobCardId } = await params;
    const body = await req.json();

    const validated = jobTaskCreateSchema.parse({ ...body, jobCardId });

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, organizationId },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.jobTask.create({
        data: {
          jobCardId,
          serviceId: validated.serviceId || null,
          name: validated.name,
          description: validated.description || null,
          estimatedHours: validated.estimatedHours,
          hourlyRate: validated.hourlyRate,
          isMandatory: validated.isMandatory,
          status: "PENDING",
        },
      });

      // Assign technicians if provided
      if (validated.technicianIds && validated.technicianIds.length > 0) {
        for (const techId of validated.technicianIds) {
          await tx.jobTaskAssignment.create({
            data: {
              jobTaskId: createdTask.id,
              technicianId: techId,
            },
          });
        }
        await tx.jobTask.update({
          where: { id: createdTask.id },
          data: { status: "ASSIGNED" },
        });
      }

      // Update estimated labor cost on job card
      const laborCost = Number(validated.estimatedHours) * Number(validated.hourlyRate);
      if (laborCost > 0) {
        await tx.jobCard.update({
          where: { id: jobCardId },
          data: {
            estimatedLaborCost: { increment: laborCost },
            estimatedTotalCost: { increment: laborCost },
          },
        });
      }

      return createdTask;
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
