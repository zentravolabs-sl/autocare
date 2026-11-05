import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const where: any = {
      organizationId: ctx.organizationId,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        branch: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { stocks: true },
        },
      },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({
      warehouses: warehouses.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        branchId: w.branchId,
        branchName: w.branch.name,
        branchCode: w.branch.code,
        isDefault: w.isDefault,
        status: w.status,
        stockLinesCount: w._count.stocks,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/inventory/warehouses error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}
