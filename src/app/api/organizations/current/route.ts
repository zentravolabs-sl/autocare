import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const { organizationId } = await getTenantContext();

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                features: true,
              },
            },
          },
        },
        branches: true,
        _count: {
          select: {
            users: true,
            jobCards: true,
            customers: true,
            vehicles: true,
            parts: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission("settings.manage");
    const { organizationId } = await getTenantContext();
    const body = await req.json();

    const {
      name,
      taxNumber,
      phone,
      email,
      website,
      address,
      city,
      currency,
      timezone,
    } = body;

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        taxNumber,
        phone,
        email,
        website,
        address,
        city,
        currency: currency || "LKR",
        timezone: timezone || "Asia/Colombo",
      },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
