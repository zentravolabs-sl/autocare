import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createGRNSchema } from "@/lib/validation/inventory";
import { recordStockMovement } from "@/lib/inventory/ledger";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const supplierId = searchParams.get("supplierId") || "";

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (supplierId) where.supplierId = supplierId;

    const grns = await prisma.goodsReceipt.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        branch: {
          select: { id: true, code: true, name: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
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

    return NextResponse.json({
      grns: grns.map((g) => ({
        id: g.id,
        grnNumber: g.grnNumber,
        receivedDate: g.receivedDate,
        invoiceNumber: g.invoiceNumber,
        notes: g.notes,
        supplier: g.supplier,
        branch: g.branch,
        purchaseOrder: g.purchaseOrder,
        itemCount: g.items.length,
        totalValue: g.items.reduce((sum, i) => sum + Number(i.totalCost), 0),
        items: g.items.map((i) => ({
          id: i.id,
          partId: i.partId,
          sku: i.part.sku,
          name: i.part.name,
          unit: i.part.unit,
          quantityReceived: Number(i.quantityReceived),
          unitCost: Number(i.unitCost),
          totalCost: Number(i.totalCost),
        })),
      })),
    });
  } catch (error: any) {
    console.error("GET /api/purchasing/grn error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch goods receipts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createGRNSchema.parse(body);

    const currentYear = new Date().getFullYear();
    const prefix = `GRN-${currentYear}-`;

    const lastGRN = await prisma.goodsReceipt.findFirst({
      where: {
        organizationId: ctx.organizationId,
        grnNumber: { startsWith: prefix },
      },
      orderBy: { grnNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastGRN) {
      const match = lastGRN.grnNumber.match(/GRN-\d{4}-(\d+)/);
      if (match) nextSeq = parseInt(match[1]) + 1;
    }
    const grnNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Execute GRN creation, stock movements with WAC, and PO update in transaction
    const grn = await prisma.$transaction(async (tx) => {
      // 1. Create GoodsReceipt
      const createdGRN = await tx.goodsReceipt.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: validated.branchId,
          supplierId: validated.supplierId,
          purchaseOrderId: validated.purchaseOrderId || null,
          grnNumber,
          invoiceNumber: validated.invoiceNumber,
          notes: validated.notes,
          items: {
            create: validated.items.map((item) => {
              const qty = new Decimal(item.quantityReceived);
              const cost = new Decimal(item.unitCost);
              return {
                partId: item.partId,
                quantityReceived: qty,
                unitCost: cost,
                totalCost: qty.mul(cost),
              };
            }),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Record StockMovement for each received item (Weighted Average Costing recalculation)
      for (const item of validated.items) {
        await recordStockMovement(tx, {
          organizationId: ctx.organizationId,
          branchId: validated.branchId,
          warehouseId: validated.warehouseId,
          partId: item.partId,
          movementType: "PURCHASE_RECEIPT",
          quantity: item.quantityReceived,
          unitCost: item.unitCost,
          referenceType: "GOODS_RECEIPT",
          referenceId: grnNumber,
          notes: `GRN ${grnNumber} - Supplier Invoice ${validated.invoiceNumber || "N/A"}`,
          createdById: ctx.userId,
        });
      }

      // 3. Update Purchase Order if linked
      if (validated.purchaseOrderId) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: validated.purchaseOrderId },
          include: { items: true },
        });

        if (po) {
          let allCompleted = true;

          for (const grnItem of validated.items) {
            const poItem = po.items.find((i) => i.partId === grnItem.partId);
            if (poItem) {
              const newReceived = new Decimal(poItem.quantityReceived).add(
                new Decimal(grnItem.quantityReceived)
              );

              await tx.purchaseOrderItem.update({
                where: { id: poItem.id },
                data: { quantityReceived: newReceived },
              });

              if (newReceived.lessThan(poItem.quantityOrdered)) {
                allCompleted = false;
              }
            }
          }

          // Check other items in PO
          for (const poItem of po.items) {
            const grnReceived = validated.items.find((i) => i.partId === poItem.partId);
            if (!grnReceived && new Decimal(poItem.quantityReceived).lessThan(poItem.quantityOrdered)) {
              allCompleted = false;
            }
          }

          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: allCompleted ? "COMPLETED" : "PARTIAL_RECEIVED",
            },
          });
        }
      }

      return createdGRN;
    }, { maxWait: 15000, timeout: 30000 });

    return NextResponse.json({ grn }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/purchasing/grn error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Goods Receipt" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
