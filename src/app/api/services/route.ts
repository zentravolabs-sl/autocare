import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get("query")?.trim() || "";
    const categoryId = searchParams.get("categoryId");

    const where: any = { organizationId, isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (query) {
      where.OR = [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { code: "asc" },
    });

    const categories = await prisma.serviceCategory.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, services, categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("settings.manage");
    const { organizationId } = await getTenantContext();
    const body = await req.json();

    const {
      code,
      name,
      description,
      categoryId,
      standardLaborHours,
      laborRate,
      estimatedPrice,
      requiredSkills,
      compatibleVehicleTypes,
      warrantyDays,
      warrantyMileage,
    } = body;

    if (!code || !name || !categoryId) {
      return NextResponse.json({ error: "Code, name, and category are required" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        organizationId,
        categoryId,
        code: code.toUpperCase(),
        name,
        description: description || null,
        standardLaborHours: standardLaborHours || 1.0,
        laborRate: laborRate || 4500,
        estimatedPrice: estimatedPrice || (standardLaborHours || 1.0) * (laborRate || 4500),
        requiredSkills: requiredSkills || [],
        compatibleVehicleTypes: compatibleVehicleTypes || ["CAR", "SUV", "VAN", "HYBRID"],
        warrantyDays: warrantyDays || 30,
        warrantyMileage: warrantyMileage || 1000,
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
