import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { updateSupplierSchema } from "@/lib/validation/inventory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;

    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        goodsReceipts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error: any) {
    console.error("GET /api/purchasing/suppliers/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch supplier" },
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
    const validated = updateSupplierSchema.parse(body);

    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ supplier: updated });
  } catch (error: any) {
    console.error("PUT /api/purchasing/suppliers/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update supplier" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
