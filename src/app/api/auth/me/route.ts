import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isSuperAdmin: true,
      organizationId: true,
      organization: {
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
          branches: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              code: true,
              name: true,
              isMain: true,
            },
          },
        },
      },
      userBranches: {
        select: {
          branchId: true,
          isDefault: true,
          branch: {
            select: {
              id: true,
              code: true,
              name: true,
              isMain: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      activeBranchId: session.branchId,
      roles: session.roles,
      permissions: session.permissions,
    },
  });
}
