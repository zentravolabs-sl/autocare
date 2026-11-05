import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getTenantContext();
    const { id } = await params;

    const jobCard = await prisma.jobCard.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        vehicle: true,
        branch: true,
        bay: true,
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            service: true,
            assignments: {
              include: {
                employee: {
                  include: {
                    user: { select: { firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
              },
            },
            timeLogs: {
              orderBy: { startTime: "desc" },
              include: {
                employee: true,
              },
            },
          },
        },
        inspections: {
          orderBy: { createdAt: "desc" },
          include: {
            template: true,
            results: true,
          },
        },
        diagnostics: {
          orderBy: { createdAt: "desc" },
          include: {
            codes: true,
          },
        },
        estimates: {
          orderBy: { versionNumber: "desc" },
          include: {
            items: true,
          },
        },
        partsIssued: {
          include: {
            part: true,
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, jobCard });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
