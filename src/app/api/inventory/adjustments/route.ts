import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { stockAdjustmentSchema } from "@/lib/validation/inventory";
import { adjustPhysicalStock } from "@/lib/inventory/ledger";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();
    const validated = stockAdjustmentSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      return await adjustPhysicalStock(tx, {
        organizationId: ctx.organizationId,
        branchId: validated.branchId,
        warehouseId: validated.warehouseId,
        partId: validated.partId,
        countedQuantity: validated.countedQuantity,
        reason: validated.reason,
        createdById: ctx.userId,
      });
    });

    return NextResponse.json({
      success: true,
      variance: Number(result.diff),
      message: `Stock successfully adjusted. Variance: ${result.diff}`,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/adjustments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to adjust stock" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
