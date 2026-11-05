import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const clockAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  action: z.enum(["CLOCK_IN", "CLOCK_OUT"]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const dateStr = sp.get("date") || new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);

    const attendances = await prisma.attendance.findMany({
      where: {
        organizationId,
        branchId,
        date: targetDate,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { clockIn: "asc" },
    });

    return NextResponse.json({
      date: dateStr,
      attendances: attendances.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeCode: a.employee.employeeCode,
        employeeName: a.employee.user
          ? `${a.employee.user.firstName} ${a.employee.user.lastName}`
          : a.employee.employeeCode,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        totalHours: Number(a.totalHours),
        status: a.status,
        notes: a.notes,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const body = clockAttendanceSchema.parse(await req.json());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: body.employeeId,
          date: today,
        },
      },
    });

    if (body.action === "CLOCK_IN") {
      if (existing) {
        throw new BusinessRuleError("Employee has already clocked in today");
      }

      const attendance = await prisma.attendance.create({
        data: {
          organizationId,
          branchId,
          employeeId: body.employeeId,
          date: today,
          clockIn: new Date(),
          status: "PRESENT",
          notes: body.notes,
        },
      });

      return NextResponse.json({ attendance }, { status: 201 });
    } else {
      // CLOCK_OUT
      if (!existing) {
        throw new BusinessRuleError("No active clock-in found for today to clock out");
      }
      if (existing.clockOut) {
        throw new BusinessRuleError("Employee has already clocked out today");
      }

      const now = new Date();
      const diffMs = now.getTime() - existing.clockIn.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          clockOut: now,
          totalHours,
          notes: body.notes || existing.notes,
        },
      });

      return NextResponse.json({ attendance: updated });
    }
  } catch (err) {
    return apiError(err);
  }
}
