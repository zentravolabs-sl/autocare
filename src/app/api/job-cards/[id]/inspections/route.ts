import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { inspectionSubmitSchema } from "@/lib/validation/job-card";
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

    const validated = inspectionSubmitSchema.parse({ ...body, jobCardId });

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, organizationId },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const inspection = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleInspection.create({
        data: {
          jobCardId,
          inspectorId: userId,
          status: "COMPLETED",
          overallNotes: validated.overallNotes || null,
        },
      });

      for (const res of validated.results) {
        await tx.inspectionResult.create({
          data: {
            inspectionId: created.id,
            category: res.category,
            itemName: res.itemName,
            condition: res.condition,
            notes: res.notes || null,
          },
        });
      }

      // If job card was in INITIAL_INSPECTION, advance to CUSTOMER_COMPLAINT or DIAGNOSTIC_INSPECTION
      if (jobCard.stage === "INITIAL_INSPECTION" || jobCard.stage === "VEHICLE_RECEPTION") {
        await tx.jobCard.update({
          where: { id: jobCardId },
          data: { stage: "INITIAL_INSPECTION" },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, inspection }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
