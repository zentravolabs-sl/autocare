import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { checkEntitlement, recordUsage } from "@/lib/entitlements/engine";
import { jobCardCreateSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get("query")?.trim() || "";
    const stage = searchParams.get("stage");
    const priority = searchParams.get("priority");
    const branchId = searchParams.get("branchId");
    const vehicleId = searchParams.get("vehicleId");
    const customerId = searchParams.get("customerId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (branchId) where.branchId = branchId;
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;
    if (vehicleId) where.vehicleId = vehicleId;
    if (customerId) where.customerId = customerId;

    if (query) {
      where.OR = [
        { jobNumber: { contains: query, mode: "insensitive" } },
        { customerComplaints: { contains: query, mode: "insensitive" } },
        {
          vehicle: {
            OR: [
              { registrationNumber: { contains: query, mode: "insensitive" } },
              { make: { contains: query, mode: "insensitive" } },
              { model: { contains: query, mode: "insensitive" } },
            ],
          },
        },
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

    const [total, jobCards] = await Promise.all([
      prisma.jobCard.count({ where }),
      prisma.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: "desc" },
        include: {
          customer: true,
          vehicle: true,
          branch: true,
          bay: true,
          _count: {
            select: {
              tasks: true,
              partsIssued: true,
              inspections: true,
              diagnostics: true,
              estimates: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      jobCards,
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
    await requirePermission("job-card.create");
    const { organizationId, userId } = await getTenantContext();
    const body = await req.json();

    const validated = jobCardCreateSchema.parse(body);

    // ENFORCE PLAN ENTITLEMENT FOR MAX JOB CARDS PER MONTH
    const entitlement = await checkEntitlement(organizationId, "maxJobCardsPerMonth", 1);
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error: entitlement.reason || "Monthly job card limit reached for your subscription plan. Please upgrade.",
          limit: entitlement.limit,
          currentUsage: entitlement.currentUsage,
        },
        { status: 403 }
      );
    }

    // Verify Vehicle & Customer exist in tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: validated.vehicleId, organizationId },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in organization" }, { status: 404 });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, organizationId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found in organization" }, { status: 404 });
    }

    // Generate unique job number: JC-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.jobCard.count({
      where: {
        organizationId,
        receivedAt: {
          gte: new Date(currentYear, 0, 1),
        },
      },
    });
    const jobNumber = `JC-${currentYear}-${String(countThisYear + 1).padStart(4, "0")}`;

    // Transactional Job Card Intake
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Job Card
      const jc = await tx.jobCard.create({
        data: {
          organizationId,
          branchId: validated.branchId,
          jobNumber,
          customerId: validated.customerId,
          vehicleId: validated.vehicleId,
          advisorId: validated.advisorId || userId,
          bayId: validated.bayId || null,
          stage: "VEHICLE_RECEPTION",
          priority: validated.priority,
          currentMileage: validated.currentMileage,
          fuelLevel: validated.fuelLevel,
          expectedDelivery: validated.expectedDelivery ? new Date(validated.expectedDelivery) : null,
          customerComplaints: validated.customerComplaints,
          conditionNotes: validated.conditionNotes || null,
          estimatedLaborCost: validated.estimatedLaborCost || 0,
          estimatedPartsCost: validated.estimatedPartsCost || 0,
          estimatedTotalCost: (validated.estimatedLaborCost || 0) + (validated.estimatedPartsCost || 0),
        },
      });

      // 2. Update Vehicle Current Mileage (mileage progression)
      if (validated.currentMileage > vehicle.mileage) {
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { mileage: validated.currentMileage },
        });
      }

      // 3. If bay assigned, mark bay as OCCUPIED
      if (validated.bayId) {
        await tx.workshopBay.update({
          where: { id: validated.bayId },
          data: { status: "OCCUPIED" },
        });
      }

      // 4. Initial services/tasks if provided
      if (validated.initialServices && validated.initialServices.length > 0) {
        for (const s of validated.initialServices) {
          await tx.jobTask.create({
            data: {
              jobCardId: jc.id,
              serviceId: s.serviceId || null,
              name: s.name,
              description: s.description || null,
              estimatedHours: s.estimatedHours,
              hourlyRate: s.hourlyRate,
              status: "PENDING",
            },
          });
        }
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          branchId: validated.branchId,
          userId,
          action: "CREATE",
          entity: "JOB_CARD",
          entityId: jc.id,
          newValues: {
            jobNumber: jc.jobNumber,
            vehicle: vehicle.registrationNumber,
            mileage: validated.currentMileage,
          },
        },
      });

      return jc;
    });

    // Record usage counter
    await recordUsage(organizationId, "maxJobCardsPerMonth", 1);

    return NextResponse.json({ success: true, jobCard: result }, { status: 201 });
  } catch (err: any) {
    console.error("Job card intake error:", err);
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
