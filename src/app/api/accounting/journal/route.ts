import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("accounting.view");
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "25")));
    const referenceType = sp.get("referenceType");

    const where = { organizationId, ...(referenceType ? { referenceType } : {}) };
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
        orderBy: [{ date: "desc" }, { entryNumber: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        entryNumber: e.entryNumber,
        date: e.date,
        description: e.description,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        lines: e.lines.map((l) => ({
          id: l.id,
          accountCode: l.account.code,
          accountName: l.account.name,
          debit: Number(l.debit),
          credit: Number(l.credit),
          description: l.description,
        })),
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return apiError(err);
  }
}
