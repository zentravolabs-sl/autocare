import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createStockTransferSchema } from "@/lib/validation/inventory";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || "";

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (status) where.status = status;

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        items: {
          include: {
            part: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch branch and warehouse metadata for resolution
    const [branches, warehouses] = await Promise.all([
      prisma.branch.findMany({ where: { organizationId: ctx.organizationId } }),
      prisma.warehouse.findMany({ where: { organizationId: ctx.organizationId } }),
    ]);

    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const formatted = transfers.map((t) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      status: t.status,
      notes: t.notes,
      dispatchedAt: t.dispatchedAt,
      receivedAt: t.receivedAt,
      createdAt: t.createdAt,
      fromBranch: branchMap.get(t.fromBranchId)?.name || "Unknown Branch",
      fromWarehouse: warehouseMap.get(t.fromWarehouseId)?.name || "Unknown Warehouse",
      toBranch: branchMap.get(t.toBranchId)?.name || "Unknown Branch",
      toWarehouse: warehouseMap.get(t.toWarehouseId)?.name || "Unknown Warehouse",
      itemCount: t.items.length,
      items: t.items.map((i) => ({
        id: i.id,
        partId: i.partId,
        sku: i.part.sku,
        name: i.part.name,
        unit: i.part.unit,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      })),
    }));

    return NextResponse.json({ transfers: formatted });
  } catch (error: any) {
    console.error("GET /api/inventory/transfers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createStockTransferSchema.parse(body);

    if (validated.fromWarehouseId === validated.toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses cannot be the same" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const prefix = `TR-${currentYear}-`;

    const lastTransfer = await prisma.stockTransfer.findFirst({
      where: {
        organizationId: ctx.organizationId,
        transferNumber: { startsWith: prefix },
      },
      orderBy: { transferNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastTransfer) {
      const match = lastTransfer.transferNumber.match(/TR-\d{4}-(\d+)/);
      if (match) nextSeq = parseInt(match[1]) + 1;
    }
    const transferNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Fetch parts to get current unit costs
    const partIds = validated.items.map((i) => i.partId);
    const stocks = await prisma.stock.findMany({
      where: {
        warehouseId: validated.fromWarehouseId,
        partId: { in: partIds },
      },
    });
    const costMap = new Map(stocks.map((s) => [s.partId, s.averageUnitCost]));

    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId: ctx.organizationId,
        transferNumber,
        fromBranchId: validated.fromBranchId,
        fromWarehouseId: validated.fromWarehouseId,
        toBranchId: validated.toBranchId,
        toWarehouseId: validated.toWarehouseId,
        notes: validated.notes,
        status: "DRAFT",
        items: {
          create: validated.items.map((item) => ({
            partId: item.partId,
            quantity: new Decimal(item.quantity),
            unitCost: costMap.get(item.partId) || new Decimal(0),
          })),
        },
      },
      include: {
        items: { include: { part: true } },
      },
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/inventory/transfers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transfer" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
