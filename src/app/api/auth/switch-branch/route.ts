import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { branchId } = await req.json();
  if (!branchId) {
    return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
  }

  // Verify user has access to this branch (or is super admin/owner)
  const isOwner = session.roles.includes("OWNER") || session.roles.includes("ADMIN");
  if (!session.isSuperAdmin && !isOwner) {
    const userBranch = await prisma.userBranch.findUnique({
      where: {
        userId_branchId: {
          userId: session.userId,
          branchId,
        },
      },
    });

    if (!userBranch) {
      return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
    }
  }

  // Update session payload with new active branchId
  const newPayload = {
    ...session,
    branchId,
  };

  const token = await signSessionToken(newPayload);

  const response = NextResponse.json({ success: true, activeBranchId: branchId });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return response;
}
