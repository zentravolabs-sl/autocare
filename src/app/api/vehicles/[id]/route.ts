import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { vehicleUpdateSchema, normalizeRegistrationNumber } from "@/lib/validation/vehicle";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getTenantContext();
    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        customer: true,
        jobCards: {
          orderBy: { receivedAt: "desc" },
          include: {
            branch: { select: { id: true, code: true, name: true } },
            tasks: {
              include: {
                assignments: {
                  include: {
                    employee: { select: { id: true, employeeCode: true, designation: true } },
                  },
                },
              },
            },
            partsIssued: {
              include: {
                part: { select: { id: true, sku: true, name: true, brand: true } },
              },
            },
            diagnostics: {
              include: {
                codes: true,
              },
            },
            inspections: {
              include: {
                results: true,
              },
            },
          },
        },
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 5,
        },
        warranties: {
          orderBy: { startDate: "desc" },
          include: {
            claims: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vehicle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("vehicle.create");
    const { organizationId, userId } = await getTenantContext();
    const { id } = await params;
    const body = await req.json();

    const validated = vehicleUpdateSchema.parse(body);

    const existing = await prisma.vehicle.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // If changing registration plate, check uniqueness
    if (validated.registrationNumber && validated.registrationNumber !== existing.registrationNumber) {
      const normalized = normalizeRegistrationNumber(validated.registrationNumber);
      const duplicate = await prisma.vehicle.findFirst({
        where: {
          organizationId,
          registrationNumber: normalized,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Vehicle registration '${normalized}' already exists in this organization` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        registrationNumber: validated.registrationNumber
          ? normalizeRegistrationNumber(validated.registrationNumber)
          : undefined,
        vehicleType: validated.vehicleType,
        make: validated.make,
        model: validated.model,
        variant: validated.variant,
        year: validated.year,
        engineNumber: validated.engineNumber,
        vinChassis: validated.vinChassis,
        fuelType: validated.fuelType,
        transmission: validated.transmission,
        mileage: validated.mileage,
        color: validated.color,
        licenseExpiry: validated.licenseExpiry ? new Date(validated.licenseExpiry) : undefined,
        insuranceExpiry: validated.insuranceExpiry ? new Date(validated.insuranceExpiry) : undefined,
        notes: validated.notes,
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "UPDATE",
        entity: "VEHICLE",
        entityId: id,
        oldValues: { plate: existing.registrationNumber, mileage: existing.mileage },
        newValues: { plate: updated.registrationNumber, mileage: updated.mileage },
      },
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
