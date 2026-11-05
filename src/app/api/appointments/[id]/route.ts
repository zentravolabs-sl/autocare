import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const updateAppointmentSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organizationId } = await getTenantContext();
    const body = updateAppointmentSchema.parse(await req.json());

    const appt = await prisma.appointment.findFirst({
      where: { id, organizationId },
    });
    if (!appt) throw new BusinessRuleError("Appointment not found");

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.notes ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    return apiError(err);
  }
}
