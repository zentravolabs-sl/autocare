import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { vehicleCreateSchema, normalizeRegistrationNumber } from "@/lib/validation/vehicle";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get("query")?.trim() || "";
    const vehicleType = searchParams.get("type");
    const customerId = searchParams.get("customerId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    if (query) {
      const normalizedQuery = normalizeRegistrationNumber(query);
      where.OR = [
        { registrationNumber: { contains: query, mode: "insensitive" } },
        { registrationNumber: { contains: normalizedQuery, mode: "insensitive" } },
        { make: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
        { vinChassis: { contains: query, mode: "insensitive" } },
        { engineNumber: { contains: query, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              type: true,
            },
          },
          _count: {
            select: {
              jobCards: true,
              appointments: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("vehicle.create");
    const { organizationId, userId } = await getTenantContext();
    const body = await req.json();

    const validated = vehicleCreateSchema.parse(body);

    // Verify Customer exists in tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: validated.customerId,
        organizationId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found in this organization" }, { status: 404 });
    }

    // Check tenant-scoped registration duplicate
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        organizationId_registrationNumber: {
          organizationId,
          registrationNumber: validated.registrationNumber,
        },
      },
      include: { customer: true },
    });

    if (existingVehicle) {
      return NextResponse.json(
        {
          error: `Vehicle with registration '${validated.registrationNumber}' is already registered to ${existingVehicle.customer.firstName} ${existingVehicle.customer.lastName || ""}`,
        },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId,
        customerId: validated.customerId,
        registrationNumber: validated.registrationNumber,
        vehicleType: validated.vehicleType,
        make: validated.make,
        model: validated.model,
        variant: validated.variant || null,
        year: validated.year || null,
        engineNumber: validated.engineNumber || null,
        vinChassis: validated.vinChassis || null,
        fuelType: validated.fuelType,
        transmission: validated.transmission,
        mileage: validated.mileage || 0,
        color: validated.color || null,
        licenseExpiry: validated.licenseExpiry ? new Date(validated.licenseExpiry) : null,
        insuranceExpiry: validated.insuranceExpiry ? new Date(validated.insuranceExpiry) : null,
        notes: validated.notes || null,
      },
      include: {
        customer: true,
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "CREATE",
        entity: "VEHICLE",
        entityId: vehicle.id,
        newValues: {
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.make,
          model: vehicle.model,
          customerId: vehicle.customerId,
        },
      },
    });

    return NextResponse.json({ success: true, vehicle }, { status: 201 });
  } catch (err: any) {
    console.error("Create vehicle error:", err);
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
