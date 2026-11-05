import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requireAuth } from "@/lib/permissions/rbac";
import { timeLogSchema } from "@/lib/validation/job-card";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { organizationId, userId } = await getTenantContext();
    const { id: jobCardId, taskId } = await params;
    const body = await req.json();

    const validated = timeLogSchema.parse(body);

    const task = await prisma.jobTask.findFirst({
      where: {
        id: taskId,
        jobCardId,
        jobCard: { organizationId },
      },
      include: {
        jobCard: true,
        assignments: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found on this job card" }, { status: 404 });
    }

    // Resolve employee for current user (or first assigned technician)
    const employee =
      (await prisma.employee.findFirst({
        where: { userId, organizationId },
      })) ||
      (task.assignments[0]
        ? await prisma.employee.findUnique({ where: { id: task.assignments[0].technicianId } })
        : await prisma.employee.findFirst({ where: { organizationId } }));

    if (!employee) {
      return NextResponse.json({ error: "No technician profile linked to this user" }, { status: 400 });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (validated.action === "START") {
        // Create new active time log
        const log = await tx.jobTimeLog.create({
          data: {
            jobTaskId: taskId,
            technicianId: employee.id,
            userId,
            startTime: now,
            notes: validated.notes || "Work started",
          },
        });

        // Set task status to IN_PROGRESS
        await tx.jobTask.update({
          where: { id: taskId },
          data: { status: "IN_PROGRESS" },
        });

        // Advance job card to REPAIR_IN_PROGRESS if in reception/assigned
        if (
          task.jobCard.stage === "VEHICLE_RECEPTION" ||
          task.jobCard.stage === "TECHNICIAN_ASSIGNMENT" ||
          task.jobCard.stage === "PARTS_RESERVATION"
        ) {
          await tx.jobCard.update({
            where: { id: jobCardId },
            data: { stage: "REPAIR_IN_PROGRESS" },
          });
        }

        return { action: "STARTED", log };
      }

      if (validated.action === "PAUSE" || validated.action === "COMPLETE") {
        // Find active open time log
        const openLog = await tx.jobTimeLog.findFirst({
          where: {
            jobTaskId: taskId,
            endTime: null,
          },
          orderBy: { startTime: "desc" },
        });

        let durationMins = 0;
        if (openLog) {
          durationMins = Math.max(1, Math.round((now.getTime() - openLog.startTime.getTime()) / 60000));
          await tx.jobTimeLog.update({
            where: { id: openLog.id },
            data: {
              endTime: now,
              durationMinutes: durationMins,
              notes: validated.notes || openLog.notes,
            },
          });
        }

        // Compute total duration across all time logs for this task
        const allLogs = await tx.jobTimeLog.findMany({
          where: { jobTaskId: taskId },
        });
        const totalMinutes = allLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
        const actualHours = parseFloat((totalMinutes / 60).toFixed(2));

        const newStatus = validated.action === "COMPLETE" ? "COMPLETED" : "PAUSED";

        const updatedTask = await tx.jobTask.update({
          where: { id: taskId },
          data: {
            status: newStatus,
            actualHours,
          },
        });

        // If completed, update actualLaborCost on Job Card
        if (validated.action === "COMPLETE") {
          const taskActualCost = actualHours * Number(task.hourlyRate || 0);
          if (taskActualCost > 0) {
            await tx.jobCard.update({
              where: { id: jobCardId },
              data: {
                actualLaborCost: { increment: taskActualCost },
                actualTotalCost: { increment: taskActualCost },
              },
            });
          }
        }

        return { action: validated.action, task: updatedTask, actualHours };
      }
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
