import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { diagnosticSubmitSchema } from "@/lib/validation/job-card";
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

    const validated = diagnosticSubmitSchema.parse({ ...body, jobCardId });

    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, organizationId },
    });

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.diagnosticSession.create({
        data: {
          jobCardId,
          technicianId: userId,
          deviceUsed: validated.deviceUsed,
          scannerType: validated.scannerType,
          protocol: validated.protocol,
          sessionNotes: validated.sessionNotes || null,
        },
      });

      for (const code of validated.codes) {
        await tx.diagnosticCode.create({
          data: {
            sessionId: createdSession.id,
            dtcCode: code.dtcCode,
            severity: code.severity,
            description: code.description,
            symptoms: code.symptoms || null,
            suggestedAction: code.suggestedAction || null,
            status: "DETECTED",
          },
        });
      }

      // If job card was in DIAGNOSTIC_INSPECTION, advance
      if (jobCard.stage === "DIAGNOSTIC_INSPECTION" || jobCard.stage === "INITIAL_INSPECTION") {
        await tx.jobCard.update({
          where: { id: jobCardId },
          data: { stage: "DIAGNOSTIC_INSPECTION" },
        });
      }

      return createdSession;
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
