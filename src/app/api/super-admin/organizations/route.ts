import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            branches: true,
            users: true,
            jobCards: true,
            vehicles: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, organizations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const {
      name,
      code,
      taxNumber,
      phone,
      email,
      address,
      city,
      planCode = "STANDARD",
      ownerEmail,
      ownerPassword,
      ownerFirstName,
      ownerLastName,
      ownerPhone,
    } = body;

    if (!name || !code || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: "Business name, code, owner email and password are required" },
        { status: 400 }
      );
    }

    // Check unique code and email
    const existingOrg = await prisma.organization.findUnique({ where: { code } });
    if (existingOrg) {
      return NextResponse.json({ error: "Organization code already in use" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase().trim() } });
    if (existingUser) {
      return NextResponse.json({ error: "Owner email already exists" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription plan selected" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30); // 30 day initial period

    // Transactional tenant initialization
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name,
          code: code.toUpperCase(),
          taxNumber,
          phone,
          email,
          address,
          city,
          country: "LK",
          currency: "LKR",
          timezone: "Asia/Colombo",
          status: "ACTIVE",
        },
      });

      // 2. Assign Subscription
      await tx.subscription.create({
        data: {
          organizationId: org.id,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      // 3. Create Main Branch
      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          code: "MAIN-01",
          name: `${name} Main Branch`,
          address,
          phone,
          isMain: true,
          status: "ACTIVE",
        },
      });

      // 4. Create Default Warehouse
      await tx.warehouse.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          code: "WH-MAIN",
          name: "Main Spare Parts Warehouse",
          isDefault: true,
        },
      });

      // 5. Create Default Cash Register
      await tx.cashRegister.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          code: "POS-01",
          name: "Main POS Counter",
        },
      });

      // 6. Create Owner User
      const owner = await tx.user.create({
        data: {
          organizationId: org.id,
          email: ownerEmail.toLowerCase().trim(),
          passwordHash: hashedPassword,
          firstName: ownerFirstName || "Business",
          lastName: ownerLastName || "Owner",
          phone: ownerPhone || phone,
          status: "ACTIVE",
        },
      });

      // 7. Assign OWNER Role
      const ownerRole = await tx.role.findFirst({ where: { code: "OWNER" } });
      if (ownerRole) {
        await tx.userRole.create({
          data: {
            userId: owner.id,
            roleId: ownerRole.id,
          },
        });
      }

      // 8. Assign User to Main Branch
      await tx.userBranch.create({
        data: {
          userId: owner.id,
          branchId: branch.id,
          isDefault: true,
        },
      });

      return { org, owner, branch };
    });

    return NextResponse.json({ success: true, organization: result.org });
  } catch (err: any) {
    console.error("Create organization error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
