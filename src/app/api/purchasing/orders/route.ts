import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createPurchaseOrderSchema } from "@/lib/validation/inventory";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || "";
    const supplierId = searchParams.get("supplierId") || "";

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true, phone: true },
        },
        branch: {
          select: { id: true, code: true, name: true },
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
      orders: orders.map((o) => ({
        id: o.id,
        poNumber: o.poNumber,
        orderDate: o.orderDate,
        expectedDate: o.expectedDate,
        status: o.status,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.taxAmount),
        totalAmount: Number(o.totalAmount),
        notes: o.notes,
        supplier: o.supplier,
        branch: o.branch,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          partId: i.partId,
          sku: i.part.sku,
          name: i.part.name,
          unit: i.part.unit,
          quantityOrdered: Number(i.quantityOrdered),
          quantityReceived: Number(i.quantityReceived),
          unitCost: Number(i.unitCost),
          taxRate: Number(i.taxRate),
          totalCost: Number(i.totalCost),
        })),
      })),
    });
  } catch (error: any) {
    console.error("GET /api/purchasing/orders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createPurchaseOrderSchema.parse(body);

    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;

    const lastPO = await prisma.purchaseOrder.findFirst({
      where: {
        organizationId: ctx.organizationId,
        poNumber: { startsWith: prefix },
      },
      orderBy: { poNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastPO) {
      const match = lastPO.poNumber.match(/PO-\d{4}-(\d+)/);
      if (match) nextSeq = parseInt(match[1]) + 1;
    }
    const poNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Calculate totals
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    const formattedItems = validated.items.map((item) => {
      const itemSubtotal = new Decimal(item.quantityOrdered).mul(new Decimal(item.unitCost));
      const itemTax = itemSubtotal.mul(new Decimal(item.taxRate).div(100));
      const itemTotal = itemSubtotal.add(itemTax);

      subtotal = subtotal.add(itemSubtotal);
      taxAmount = taxAmount.add(itemTax);

      return {
        partId: item.partId,
        quantityOrdered: new Decimal(item.quantityOrdered),
        quantityReceived: new Decimal(0),
        unitCost: new Decimal(item.unitCost),
        taxRate: new Decimal(item.taxRate),
        totalCost: itemTotal,
      };
    });

    const totalAmount = subtotal.add(taxAmount);

    const order = await prisma.purchaseOrder.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: validated.branchId,
        supplierId: validated.supplierId,
        poNumber,
        expectedDate: validated.expectedDate ? new Date(validated.expectedDate) : null,
        notes: validated.notes,
        status: "ISSUED",
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: formattedItems,
        },
      },
      include: {
        supplier: true,
        items: { include: { part: true } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/purchasing/orders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create purchase order" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
