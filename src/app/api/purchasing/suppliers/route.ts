import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { createSupplierSchema } from "@/lib/validation/inventory";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) where.status = status;

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchaseOrders: true, goodsReceipts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        taxNumber: s.taxNumber,
        paymentTermsDays: s.paymentTermsDays,
        status: s.status,
        poCount: s._count.purchaseOrders,
        grnCount: s._count.goodsReceipts,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/purchasing/suppliers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = createSupplierSchema.parse(body);

    const existingCode = await prisma.supplier.findUnique({
      where: {
        organizationId_code: {
          organizationId: ctx.organizationId,
          code: validated.code,
        },
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: `Supplier with code '${validated.code}' already exists` },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: ctx.organizationId,
        code: validated.code,
        name: validated.name,
        contactPerson: validated.contactPerson || null,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        taxNumber: validated.taxNumber || null,
        paymentTermsDays: validated.paymentTermsDays,
        status: validated.status,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/purchasing/suppliers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create supplier" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
