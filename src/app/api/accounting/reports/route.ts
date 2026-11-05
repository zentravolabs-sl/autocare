import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { apiError, BusinessRuleError } from "@/lib/api/errors";
import {
  buildBalanceSheet,
  buildProfitAndLoss,
  buildTrialBalance,
  fetchAccountSums,
} from "@/lib/accounting/reports";

function parseDate(v: string | null, endOfDay = false): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  if (isNaN(d.getTime())) throw new BusinessRuleError(`Invalid date: ${v}`);
  return d;
}

const num = (d: { toNumber(): number }) => d.toNumber();

export async function GET(req: NextRequest) {
  try {
    await requirePermission("accounting.view");
    const { organizationId } = await getTenantContext();
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") || "trial-balance";
    const from = parseDate(sp.get("from"));
    const to = parseDate(sp.get("to"), true);

    if (type === "pnl") {
      const rows = await fetchAccountSums(prisma, organizationId, { from, to });
      const r = buildProfitAndLoss(rows);
      return NextResponse.json({
        type,
        revenue: r.revenue.map((l) => ({ ...l, amount: num(l.amount) })),
        expenses: r.expenses.map((l) => ({ ...l, amount: num(l.amount) })),
        totalRevenue: num(r.totalRevenue),
        totalExpenses: num(r.totalExpenses),
        netProfit: num(r.netProfit),
      });
    }

    // Trial balance and balance sheet are cumulative up to `to`.
    const rows = await fetchAccountSums(prisma, organizationId, { to });
    if (type === "balance-sheet") {
      const r = buildBalanceSheet(rows);
      const map = (ls: { code: string; name: string; amount: { toNumber(): number } }[]) =>
        ls.map((l) => ({ ...l, amount: num(l.amount) }));
      return NextResponse.json({
        type,
        assets: map(r.assets),
        liabilities: map(r.liabilities),
        equity: map(r.equity),
        earnings: num(r.earnings),
        totalAssets: num(r.totalAssets),
        totalLiabilities: num(r.totalLiabilities),
        totalEquity: num(r.totalEquity),
        isBalanced: r.isBalanced,
      });
    }
    if (type === "trial-balance") {
      const r = buildTrialBalance(rows);
      return NextResponse.json({
        type,
        lines: r.lines.map((l) => ({ ...l, debit: num(l.debit), credit: num(l.credit) })),
        totalDebit: num(r.totalDebit),
        totalCredit: num(r.totalCredit),
        isBalanced: r.isBalanced,
      });
    }
    throw new BusinessRuleError(`Unknown report type: ${type}`);
  } catch (err) {
    return apiError(err);
  }
}
