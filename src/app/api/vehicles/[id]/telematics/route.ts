import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organizationId } = await getTenantContext();

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        jobCards: {
          include: {
            tasks: { select: { id: true, name: true, status: true, actualHours: true } },
            partsIssued: {
              include: {
                part: { select: { sku: true, name: true } },
              },
            },
            inspections: { select: { id: true, status: true, overallNotes: true, createdAt: true } },
            diagnostics: {
              include: {
                codes: { select: { dtcCode: true, severity: true, description: true } },
              },
            },
          },
          orderBy: { receivedAt: "desc" },
        },
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 5,
        },
        warranties: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!vehicle) throw new BusinessRuleError("Vehicle not found");

    const vehicleData = vehicle as any;

    // Mileage Timeline Telematics
    const telemetryTimeline = (vehicleData.jobCards || [])
      .map((jc: any) => ({
        date: jc.receivedAt,
        mileage: jc.currentMileage,
        jobNumber: jc.jobNumber,
        fuelLevel: jc.fuelLevel,
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      vehicle: {
        id: vehicleData.id,
        registrationNumber: vehicleData.registrationNumber,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        fuelType: vehicleData.fuelType,
        transmission: vehicleData.transmission,
        currentMileage: vehicleData.mileage,
        vinChassis: vehicleData.vinChassis,
        engineNumber: vehicleData.engineNumber,
        customer: vehicleData.customer,
        telemetryTimeline,
        serviceHistory: (vehicleData.jobCards || []).map((jc: any) => ({
          id: jc.id,
          jobNumber: jc.jobNumber,
          stage: jc.stage,
          date: jc.receivedAt,
          mileage: jc.currentMileage,
          complaints: jc.customerComplaints,
          tasksCount: jc.tasks?.length || 0,
          partsConsumed: (jc.partsIssued || []).map((p: any) => `${p.quantity}x ${p.part.name} (${p.part.sku})`),
          diagnostics: (jc.diagnostics || []).flatMap((d: any) => d.codes.map((c: any) => `${c.dtcCode} (${c.severity})`)),
        })),
        activeWarranties: (vehicleData.warranties || []).map((w: any) => ({
          id: w.id,
          type: w.warrantyType,
          endDate: w.endDate,
          maxMileage: w.maxMileage,
        })),
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
