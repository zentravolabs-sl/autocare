import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const updateBaySchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
  jobCardId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organizationId } = await getTenantContext();
    const body = updateBaySchema.parse(await req.json());

    const bay = await prisma.workshopBay.findFirst({
      where: { id, organizationId },
    });

    if (!bay) throw new BusinessRuleError("Workshop bay not found");

    if (body.jobCardId !== undefined) {
      if (body.jobCardId) {
        // Assign job card to this bay and mark bay OCCUPIED
        await prisma.$transaction([
          prisma.jobCard.update({
            where: { id: body.jobCardId },
            data: { bayId: id },
          }),
          prisma.workshopBay.update({
            where: { id },
            data: { status: "OCCUPIED" },
          }),
        ]);
      } else {
        // Unassign active job card from bay
        await prisma.$transaction([
          prisma.jobCard.updateMany({
            where: { bayId: id },
            data: { bayId: null },
          }),
          prisma.workshopBay.update({
            where: { id },
            data: { status: "AVAILABLE" },
          }),
        ]);
      }
    } else if (body.status || body.name) {
      await prisma.workshopBay.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.status ? { status: body.status } : {}),
        },
      });
    }

    const updated = await prisma.workshopBay.findUnique({
      where: { id },
      include: {
        jobCards: {
          where: { stage: { notIn: ["VEHICLE_DELIVERY", "CLOSED", "CANCELLED"] } },
          select: { id: true, jobNumber: true, stage: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ bay: updated });
  } catch (err) {
    return apiError(err);
  }
}
