import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { reservePartForJob, issuePartToJob, returnPartFromJob } from "@/lib/inventory/ledger";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();

    if (body.action === "issue") {
      if (!body.jobPartIssueId) {
        return NextResponse.json({ error: "jobPartIssueId is required for issue action" }, { status: 400 });
      }

      const issued = await prisma.$transaction(async (tx) => {
        return await issuePartToJob(tx, {
          jobPartIssueId: body.jobPartIssueId,
          createdById: ctx.userId,
        });
      }, { maxWait: 15000, timeout: 30000 });

      return NextResponse.json({ success: true, issue: issued });
    }

    // Default action: Reserve part for Job Card
    const { jobCardId, partId, warehouseId, quantity, unitPrice } = body;
    if (!jobCardId || !partId || !warehouseId || !quantity) {
      return NextResponse.json({ error: "Missing required reservation fields" }, { status: 400 });
    }

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, organizationId: ctx.organizationId },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job Card not found" }, { status: 404 });
    }

    const reserved = await prisma.$transaction(async (tx) => {
      return await reservePartForJob(tx, {
        organizationId: ctx.organizationId,
        branchId: jobCard.branchId,
        warehouseId,
        jobCardId,
        partId,
        quantity,
        unitPrice: unitPrice ?? 0,
      });
    }, { maxWait: 15000, timeout: 30000 });

    return NextResponse.json({ success: true, reservation: reserved }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/inventory/job-parts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process job part request" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req);
    const body = await req.json();

    if (!body.jobPartIssueId) {
      return NextResponse.json({ error: "jobPartIssueId is required" }, { status: 400 });
    }

    const returned = await prisma.$transaction(async (tx) => {
      return await returnPartFromJob(tx, {
        jobPartIssueId: body.jobPartIssueId,
        returnQuantity: body.returnQuantity,
        createdById: ctx.userId,
      });
    }, { maxWait: 15000, timeout: 30000 });

    return NextResponse.json({ success: true, return: returned });
  } catch (error: any) {
    console.error("PUT /api/inventory/job-parts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to return job part" },
      { status: 500 }
    );
  }
}
