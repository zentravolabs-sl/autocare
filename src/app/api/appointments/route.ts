import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const createAppointmentSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  branchId: z.string().optional(),
  appointmentDate: z.string().min(1, "Appointment Date is required"),
  timeSlot: z.string().min(1, "Time slot is required"), // e.g. "09:00 - 10:00"
  serviceRequested: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const customerId = sp.get("customerId");
    const vehicleId = sp.get("vehicleId");
    const status = sp.get("status");

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        ...(customerId ? { customerId } : {}),
        ...(vehicleId ? { vehicleId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ appointmentDate: "desc" }, { timeSlot: "asc" }],
    });

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        appointmentDate: a.appointmentDate,
        timeSlot: a.timeSlot,
        serviceRequested: a.serviceRequested,
        status: a.status,
        notes: a.notes,
        customer: a.customer,
        vehicle: a.vehicle,
        branch: a.branch,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const body = createAppointmentSchema.parse(await req.json());
    const targetBranchId = body.branchId || branchId;

    if (!targetBranchId) {
      throw new BusinessRuleError("Branch ID is required to schedule an appointment");
    }

    const appointmentDate = new Date(body.appointmentDate);

    // Conflict Check: Prevent duplicate timeSlot bookings for the same vehicle on the same date
    const existing = await prisma.appointment.findFirst({
      where: {
        organizationId,
        vehicleId: body.vehicleId,
        appointmentDate,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existing) {
      throw new BusinessRuleError("An active appointment already exists for this vehicle on the selected date");
    }

    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        branchId: targetBranchId,
        customerId: body.customerId,
        vehicleId: body.vehicleId,
        appointmentDate,
        timeSlot: body.timeSlot,
        serviceRequested: body.serviceRequested,
        status: "CONFIRMED",
        notes: body.notes,
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
