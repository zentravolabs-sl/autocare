import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { updatePOStatusSchema } from "@/lib/validation/inventory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            part: true,
          },
        },
        goodsReceipts: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        poNumber: order.poNumber,
        orderDate: order.orderDate,
        expectedDate: order.expectedDate,
        status: order.status,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        notes: order.notes,
        supplier: order.supplier,
        branch: order.branch,
        items: order.items.map((i) => ({
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
        goodsReceipts: order.goodsReceipts,
      },
    });
  } catch (error: any) {
    console.error("GET /api/purchasing/orders/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase order" },
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
    const validated = updatePOStatusSchema.parse(body);

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: validated.status,
        notes: validated.notes ? `${order.notes || ""}\n${validated.notes}`.trim() : order.notes,
      },
    });

    return NextResponse.json({ order: updated });
  } catch (error: any) {
    console.error("PUT /api/purchasing/orders/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update purchase order" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
