import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createPartCategorySchema } from "@/lib/validation/inventory";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);

    const categories = await prisma.partCategory.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        _count: {
          select: { parts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        partsCount: c._count.parts,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/inventory/categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createPartCategorySchema.parse(body);

    const existing = await prisma.partCategory.findUnique({
      where: {
        organizationId_code: {
          organizationId: ctx.organizationId,
          code: validated.code,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category with code '${validated.code}' already exists` },
        { status: 409 }
      );
    }

    const category = await prisma.partCategory.create({
      data: {
        organizationId: ctx.organizationId,
        code: validated.code,
        name: validated.name,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/inventory/categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
