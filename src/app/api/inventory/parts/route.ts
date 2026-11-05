import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createPartSchema } from "@/lib/validation/inventory";
import { recordStockMovement } from "@/lib/inventory/ledger";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: {
          category: true,
          stocks: {
            include: {
              warehouse: {
                select: { id: true, code: true, name: true, branchId: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.part.count({ where }),
    ]);

    // Aggregate total stock across warehouses and evaluate lowStock filter
    const formattedParts = parts.map((part) => {
      const totalQOH = part.stocks.reduce(
        (sum, s) => sum + Number(s.quantityOnHand),
        0
      );
      const totalReserved = part.stocks.reduce(
        (sum, s) => sum + Number(s.quantityReserved),
        0
      );
      const totalAvailable = part.stocks.reduce(
        (sum, s) => sum + Number(s.quantityAvailable),
        0
      );
      const isLowStock = totalQOH <= part.reorderLevel;

      return {
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
        category: part.category,
        totalQOH,
        totalReserved,
        totalAvailable,
        isLowStock,
        stocks: part.stocks.map((s) => ({
          warehouseId: s.warehouseId,
          warehouseCode: s.warehouse.code,
          warehouseName: s.warehouse.name,
          quantityOnHand: Number(s.quantityOnHand),
          quantityReserved: Number(s.quantityReserved),
          quantityAvailable: Number(s.quantityAvailable),
          averageUnitCost: Number(s.averageUnitCost),
        })),
      };
    });

    const result = lowStock
      ? formattedParts.filter((p) => p.isLowStock)
      : formattedParts;

    return NextResponse.json({
      parts: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/inventory/parts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch parts" },
      { status: error.message?.includes("Authentication") ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createPartSchema.parse(body);

    // Check SKU duplicate within organization
    const existingSku = await prisma.part.findUnique({
      where: {
        organizationId_sku: {
          organizationId: ctx.organizationId,
          sku: validated.sku,
        },
      },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: `Part with SKU '${validated.sku}' already exists in your organization` },
        { status: 409 }
      );
    }

    // Execute part creation & optional initial stock movement atomically
    const part = await prisma.$transaction(async (tx) => {
      const created = await tx.part.create({
        data: {
          organizationId: ctx.organizationId,
          categoryId: validated.categoryId,
          sku: validated.sku,
          barcode: validated.barcode || null,
          name: validated.name,
          brand: validated.brand,
          unit: validated.unit,
          purchasePrice: new Decimal(validated.purchasePrice),
          sellingPrice: new Decimal(validated.sellingPrice),
          minStockLevel: validated.minStockLevel,
          reorderLevel: validated.reorderLevel,
          isServicePart: validated.isServicePart,
          isActive: validated.isActive,
        },
        include: {
          category: true,
        },
      });

      // If initial opening balance is provided, record atomic movement
      if (validated.initialStock && validated.initialStock.quantity > 0) {
        await recordStockMovement(tx, {
          organizationId: ctx.organizationId,
          branchId: validated.initialStock.branchId,
          warehouseId: validated.initialStock.warehouseId,
          partId: created.id,
          movementType: "PHYSICAL_ADJUSTMENT",
          quantity: validated.initialStock.quantity,
          unitCost: validated.initialStock.unitCost,
          referenceType: "OPENING_BALANCE",
          notes: "Initial inventory opening stock balance",
          createdById: ctx.userId,
        });
      }

      return created;
    });

    return NextResponse.json({ part }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/inventory/parts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create part" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
