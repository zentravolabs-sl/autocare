import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const createBaySchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  bayType: z.enum(["MECHANICAL", "ELECTRICAL", "WASH", "ALIGNMENT", "DIAGNOSTIC", "GENERAL"]),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const filterBranchId = sp.get("branchId") || branchId;

    const bays = await prisma.workshopBay.findMany({
      where: {
        organizationId,
        ...(filterBranchId ? { branchId: filterBranchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        jobCards: {
          where: {
            stage: { notIn: ["VEHICLE_DELIVERY", "CLOSED", "CANCELLED"] },
          },
          select: {
            id: true,
            jobNumber: true,
            stage: true,
            priority: true,
            vehicle: { select: { registrationNumber: true, make: true, model: true } },
          },
          take: 1,
        },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      bays: (bays as any[]).map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        bayType: b.bayType,
        status: b.status,
        branch: b.branch,
        activeJobCard: b.jobCards?.[0] || null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const body = createBaySchema.parse(await req.json());
    const targetBranchId = body.branchId || branchId;

    if (!targetBranchId) {
      throw new BusinessRuleError("Branch ID is required to register a workshop bay");
    }

    const bay = await prisma.workshopBay.create({
      data: {
        organizationId,
        branchId: targetBranchId,
        code: body.code.toUpperCase().trim(),
        name: body.name.trim(),
        bayType: body.bayType,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json({ bay }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
