import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { updatePartSchema } from "@/lib/validation/inventory";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;

    const part = await prisma.part.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: {
              include: {
                branch: {
                  select: { id: true, code: true, name: true },
                },
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            warehouse: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const totalQOH = part.stocks.reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
    const totalReserved = part.stocks.reduce((sum, s) => sum + Number(s.quantityReserved), 0);
    const totalAvailable = part.stocks.reduce((sum, s) => sum + Number(s.quantityAvailable), 0);

    return NextResponse.json({
      part: {
        id: part.id,
        sku: part.sku,
        barcode: part.barcode,
        name: part.name,
        brand: part.brand,
        unit: part.unit,
        purchasePrice: Number(part.purchasePrice),
        sellingPrice: Number(part.sellingPrice),
        minStockLevel: part.minStockLevel,
        reorderLevel: part.reorderLevel,
        isServicePart: part.isServicePart,
        isActive: part.isActive,
        createdAt: part.createdAt,
        category: part.category,
        totalQOH,
        totalReserved,
        totalAvailable,
        isLowStock: totalQOH <= part.reorderLevel,
        stocks: part.stocks.map((s) => ({
          warehouseId: s.warehouseId,
          warehouseCode: s.warehouse.code,
          warehouseName: s.warehouse.name,
          branchName: s.warehouse.branch.name,
          quantityOnHand: Number(s.quantityOnHand),
          quantityReserved: Number(s.quantityReserved),
          quantityAvailable: Number(s.quantityAvailable),
          averageUnitCost: Number(s.averageUnitCost),
        })),
        recentMovements: part.stockMovements.map((m) => ({
          id: m.id,
          movementType: m.movementType,
          quantity: Number(m.quantity),
          unitCost: Number(m.unitCost),
          totalCost: Number(m.totalCost),
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          warehouseName: m.warehouse.name,
          notes: m.notes,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("GET /api/inventory/parts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch part" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;
    const body = await req.json();
    const validated = updatePartSchema.parse(body);

    const existing = await prisma.part.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const updateData: any = { ...validated };
    if (validated.purchasePrice !== undefined) {
      updateData.purchasePrice = new Decimal(validated.purchasePrice);
    }
    if (validated.sellingPrice !== undefined) {
      updateData.sellingPrice = new Decimal(validated.sellingPrice);
    }

    const updated = await prisma.part.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json({ part: updated });
  } catch (error: any) {
    console.error("PUT /api/inventory/parts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update part" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;

    // Check if part exists and soft-deactivate
    const part = await prisma.part.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const updated = await prisma.part.update({
      where: { id },
      data: { isActive: !part.isActive },
    });

    return NextResponse.json({
      success: true,
      isActive: updated.isActive,
      message: `Part ${updated.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error: any) {
    console.error("DELETE /api/inventory/parts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle part status" },
      { status: 500 }
    );
  }
}
