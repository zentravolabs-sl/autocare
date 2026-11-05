import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import { z } from "zod";

const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(20),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  designation: z.string().min(1).max(50),
  department: z.string().min(1).max(50),
  hourlyRate: z.number().min(0).default(0),
  monthlySalary: z.number().min(0).default(0),
  commissionRate: z.number().min(0).max(100).default(0),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const department = sp.get("department");
    const status = sp.get("status") || "ACTIVE";

    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        ...(department ? { department } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            taskAssignments: true,
            timeLogs: true,
            attendances: true,
          },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: e.user ? `${e.user.firstName} ${e.user.lastName}` : e.employeeCode,
        designation: e.designation,
        department: e.department,
        hourlyRate: Number(e.hourlyRate),
        monthlySalary: Number(e.monthlySalary),
        commissionRate: Number(e.commissionRate),
        status: e.status,
        joinedDate: e.joinedDate,
        branch: e.branch,
        email: e.user?.email || null,
        phone: e.user?.phone || null,
        stats: e._count,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, branchId } = await getTenantContext();
    const body = createEmployeeSchema.parse(await req.json());
    const targetBranchId = body.branchId || branchId;

    if (!targetBranchId) {
      throw new BusinessRuleError("Branch ID is required for employee enrollment");
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId,
        branchId: targetBranchId,
        employeeCode: body.employeeCode.toUpperCase().trim(),
        designation: body.designation.trim(),
        department: body.department.trim(),
        hourlyRate: body.hourlyRate,
        monthlySalary: body.monthlySalary,
        commissionRate: body.commissionRate,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
