import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { estimateCreateSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("job-card.update");
    const { organizationId, userId } = await getTenantContext();
    const { id: jobCardId } = await params;
    const body = await req.json();

    const validated = estimateCreateSchema.parse({ ...body, jobCardId });

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, organizationId },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    // Determine next version number
    const count = await prisma.estimate.count({ where: { jobCardId } });
    const versionNumber = count + 1;

    // Calculate sub-totals
    let subtotalLabor = 0;
    let subtotalParts = 0;
    let subtotalOther = 0;
    let totalTax = 0;

    for (const item of validated.items) {
      const itemSubtotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      const itemTax = itemSubtotal * ((item.taxRate || 18) / 100);

      if (item.itemType === "LABOR") subtotalLabor += itemSubtotal;
      else if (item.itemType === "PART") subtotalParts += itemSubtotal;
      else subtotalOther += itemSubtotal;

      totalTax += itemTax;
    }

    const discountAmount = validated.discountAmount || 0;
    const totalAmount = subtotalLabor + subtotalParts + subtotalOther - discountAmount + totalTax;

    const estimate = await prisma.$transaction(async (tx) => {
      const created = await tx.estimate.create({
        data: {
          jobCardId,
          versionNumber,
          subtotalLabor,
          subtotalParts,
          subtotalOther,
          discountAmount,
          taxAmount: totalTax,
          totalAmount,
          status: "SENT",
          notes: validated.notes || null,
        },
      });

      for (const item of validated.items) {
        const itemTotal =
          item.quantity * item.unitPrice -
          (item.discountAmount || 0) +
          (item.quantity * item.unitPrice * (item.taxRate || 18)) / 100;

        await tx.estimateItem.create({
          data: {
            estimateId: created.id,
            itemType: item.itemType,
            referenceId: item.referenceId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount || 0,
            taxRate: item.taxRate || 18,
            totalPrice: itemTotal,
          },
        });
      }

      // Update Job Card estimated costs and advance stage
      await tx.jobCard.update({
        where: { id: jobCardId },
        data: {
          estimatedLaborCost: subtotalLabor,
          estimatedPartsCost: subtotalParts,
          estimatedTotalCost: totalAmount,
          stage: "ESTIMATE_CREATION",
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, estimate }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
