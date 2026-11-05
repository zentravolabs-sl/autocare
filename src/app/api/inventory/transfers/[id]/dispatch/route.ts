import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { dispatchStockTransfer } from "@/lib/inventory/ledger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(req);
    const { id } = await params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await dispatchStockTransfer(tx, {
        transferId: id,
        createdById: ctx.userId,
      });
    });

    return NextResponse.json({
      success: true,
      transfer: updated,
      message: `Transfer ${transfer.transferNumber} dispatched to IN_TRANSIT`,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/transfers/[id]/dispatch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch transfer" },
      { status: 500 }
    );
  }
}
