import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const entity = sp.get("entity");
    const action = sp.get("action");
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

    const where: any = { organizationId };
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        oldValues: l.oldValues,
        newValues: l.newValues,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
        user: l.user ? `${l.user.firstName} ${l.user.lastName}` : "System / Automated",
        userEmail: l.user?.email || null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
