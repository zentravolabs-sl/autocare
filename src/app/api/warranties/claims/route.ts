import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const createClaimSchema = z.object({
  warrantyId: z.string().min(1, "Warranty ID is required"),
  description: z.string().min(5, "Claim description must be at least 5 characters"),
  costBorne: z.number().min(0).default(0),
});

const updateClaimSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
  resolutionNotes: z.string().optional(),
  costBorne: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");

    const claims = await prisma.warrantyClaim.findMany({
      where: {
        warranty: { organizationId },
        ...(status ? { status } : {}),
      },
      include: {
        warranty: {
          include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            vehicle: { select: { registrationNumber: true, make: true, model: true } },
            jobCard: { select: { jobNumber: true } },
          },
        },
      },
      orderBy: { claimDate: "desc" },
    });

    return NextResponse.json({
      claims: claims.map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        claimDate: c.claimDate,
        description: c.description,
        status: c.status,
        resolutionNotes: c.resolutionNotes,
        costBorne: Number(c.costBorne),
        warranty: {
          id: c.warranty.id,
          warrantyType: c.warranty.warrantyType,
          startDate: c.warranty.startDate,
          endDate: c.warranty.endDate,
          maxMileage: c.warranty.maxMileage,
          customer: c.warranty.customer,
          vehicle: c.warranty.vehicle,
          jobCard: c.warranty.jobCard,
        },
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const body = createClaimSchema.parse(await req.json());

    const warranty = await prisma.warranty.findFirst({
      where: { id: body.warrantyId, organizationId },
      include: { vehicle: true },
    });
    if (!warranty) throw new BusinessRuleError("Warranty policy not found");

    if (new Date() > warranty.endDate) {
      throw new BusinessRuleError("Warranty policy has expired by date");
    }
    if (warranty.vehicle.mileage > warranty.maxMileage) {
      throw new BusinessRuleError(
        `Warranty exceeded mileage limit (${warranty.vehicle.mileage}km vs ${warranty.maxMileage}km limit)`
      );
    }

    const count = await prisma.warrantyClaim.count({
      where: { warranty: { organizationId } },
    });
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const claim = await prisma.warrantyClaim.create({
      data: {
        warrantyId: body.warrantyId,
        claimNumber,
        description: body.description,
        costBorne: body.costBorne,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const claimId = sp.get("id");
    if (!claimId) throw new BusinessRuleError("Claim ID is required");

    const body = updateClaimSchema.parse(await req.json());

    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, warranty: { organizationId } },
    });
    if (!claim) throw new BusinessRuleError("Warranty claim not found");

    const updated = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: {
        status: body.status,
        ...(body.resolutionNotes ? { resolutionNotes: body.resolutionNotes } : {}),
        ...(body.costBorne !== undefined ? { costBorne: body.costBorne } : {}),
      },
    });

    return NextResponse.json({ claim: updated });
  } catch (err) {
    return apiError(err);
  }
}
