import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const createWarrantySchema = z.object({
  jobCardId: z.string().min(1, "Job Card ID is required"),
  invoiceId: z.string().optional(),
  warrantyType: z.enum(["SERVICE_WARRANTY", "PARTS_WARRANTY"]),
  durationMonths: z.number().int().min(1).max(60).default(6),
  maxMileage: z.number().int().min(1000).default(10000),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const vehicleId = sp.get("vehicleId");

    const warranties = await prisma.warranty.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        ...(vehicleId ? { vehicleId } : {}),
      },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { registrationNumber: true, make: true, model: true } },
        jobCard: { select: { jobNumber: true } },
        claims: {
          select: {
            id: true,
            claimNumber: true,
            status: true,
            costBorne: true,
            claimDate: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      warranties: warranties.map((w) => ({
        id: w.id,
        warrantyType: w.warrantyType,
        startDate: w.startDate,
        endDate: w.endDate,
        maxMileage: w.maxMileage,
        status: w.status,
        notes: w.notes,
        customer: w.customer,
        vehicle: w.vehicle,
        jobCard: w.jobCard,
        claims: w.claims.map((c) => ({
          ...c,
          costBorne: Number(c.costBorne),
        })),
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const body = createWarrantySchema.parse(await req.json());

    const jc = await prisma.jobCard.findFirst({
      where: { id: body.jobCardId, organizationId },
      include: { customer: true, vehicle: true },
    });
    if (!jc) throw new BusinessRuleError("Job Card not found");

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + body.durationMonths);

    const warranty = await prisma.warranty.create({
      data: {
        organizationId,
        jobCardId: body.jobCardId,
        invoiceId: body.invoiceId,
        customerId: jc.customerId,
        vehicleId: jc.vehicleId,
        warrantyType: body.warrantyType,
        startDate,
        endDate,
        maxMileage: jc.currentMileage + body.maxMileage,
        status: "ACTIVE",
        notes: body.notes,
      },
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
