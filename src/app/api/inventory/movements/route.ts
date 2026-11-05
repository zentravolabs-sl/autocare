import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const partId = searchParams.get("partId") || "";
    const warehouseId = searchParams.get("warehouseId") || "";
    const movementType = searchParams.get("movementType") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (partId) where.partId = partId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (movementType) where.movementType = movementType;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          part: {
            select: { id: true, sku: true, name: true, unit: true, brand: true },
          },
          warehouse: {
            select: { id: true, code: true, name: true },
          },
          branch: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements: movements.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        notes: m.notes,
        createdAt: m.createdAt,
        part: m.part,
        warehouse: m.warehouse,
        branch: m.branch,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/inventory/movements error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
