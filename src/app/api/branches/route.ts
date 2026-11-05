import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { checkEntitlement } from "@/lib/entitlements/engine";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const { organizationId } = await getTenantContext();

    const branches = await prisma.branch.findMany({
      where: { organizationId },
      include: {
        warehouses: true,
        cashRegisters: true,
        _count: {
          select: {
            userBranches: true,
            jobCards: true,
            workshopBays: true,
          },
        },
      },
      orderBy: { isMain: "desc" },
    });

    return NextResponse.json({ success: true, branches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("settings.manage");
    const { organizationId } = await getTenantContext();
    const body = await req.json();
    const { code, name, address, phone, email, managerName } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Branch code and name are required" }, { status: 400 });
    }

    // ENFORCE PLAN ENTITLEMENT FOR MAX BRANCHES
    const currentBranchCount = await prisma.branch.count({
      where: { organizationId },
    });

    const entitlement = await checkEntitlement(organizationId, "maxBranches", 1);
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error: entitlement.reason || "Branch limit reached for current subscription plan.",
          limit: entitlement.limit,
          currentUsage: currentBranchCount,
        },
        { status: 403 }
      );
    }

    const branch = await prisma.$transaction(async (tx) => {
      const newBranch = await tx.branch.create({
        data: {
          organizationId,
          code: code.toUpperCase(),
          name,
          address,
          phone,
          email,
          managerName,
          status: "ACTIVE",
        },
      });

      // Automatically create a default warehouse for this new branch
      await tx.warehouse.create({
        data: {
          organizationId,
          branchId: newBranch.id,
          code: `WH-${code.toUpperCase()}-01`,
          name: `${name} Main Store`,
          isDefault: true,
        },
      });

      // Automatically create a default cash register
      await tx.cashRegister.create({
        data: {
          organizationId,
          branchId: newBranch.id,
          code: `REG-${code.toUpperCase()}-01`,
          name: `${name} Reception Register`,
        },
      });

      return newBranch;
    });

    return NextResponse.json({ success: true, branch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
