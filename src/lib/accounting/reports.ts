import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType, isDebitNormal } from "@/lib/accounting/chart";

export interface AccountSum {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: Decimal;
  credit: Decimal;
}

const ZERO = new Decimal(0);

/** Natural-side balance: debits minus credits for assets/expenses, the reverse otherwise. */
export function naturalBalance(row: Pick<AccountSum, "type" | "debit" | "credit">): Decimal {
  return isDebitNormal(row.type) ? row.debit.sub(row.credit) : row.credit.sub(row.debit);
}

export function buildTrialBalance(rows: AccountSum[]) {
  const lines = rows
    .filter((r) => !r.debit.isZero() || !r.credit.isZero())
    .map((r) => {
      const net = r.debit.sub(r.credit);
      return {
        code: r.code,
        name: r.name,
        type: r.type,
        debit: net.isPositive() ? net : ZERO,
        credit: net.isNegative() ? net.abs() : ZERO,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
  const totalDebit = lines.reduce((a, l) => a.add(l.debit), ZERO);
  const totalCredit = lines.reduce((a, l) => a.add(l.credit), ZERO);
  return { lines, totalDebit, totalCredit, isBalanced: totalDebit.equals(totalCredit) };
}

export function buildProfitAndLoss(rows: AccountSum[]) {
  const pick = (type: AccountType) =>
    rows
      .filter((r) => r.type === type && (!r.debit.isZero() || !r.credit.isZero()))
      .map((r) => ({ code: r.code, name: r.name, amount: naturalBalance(r) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  const revenue = pick("REVENUE");
  const expenses = pick("EXPENSE");
  const totalRevenue = revenue.reduce((a, l) => a.add(l.amount), ZERO);
  const totalExpenses = expenses.reduce((a, l) => a.add(l.amount), ZERO);
  return { revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue.sub(totalExpenses) };
}

/** Balance sheet from cumulative sums; current-period earnings roll into equity. */
export function buildBalanceSheet(rows: AccountSum[]) {
  const pick = (type: AccountType) =>
    rows
      .filter((r) => r.type === type && (!r.debit.isZero() || !r.credit.isZero()))
      .map((r) => ({ code: r.code, name: r.name, amount: naturalBalance(r) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  const assets = pick("ASSET");
  const liabilities = pick("LIABILITY");
  const equity = pick("EQUITY");
  const pnl = buildProfitAndLoss(rows);

  const totalAssets = assets.reduce((a, l) => a.add(l.amount), ZERO);
  const totalLiabilities = liabilities.reduce((a, l) => a.add(l.amount), ZERO);
  const equityAccounts = equity.reduce((a, l) => a.add(l.amount), ZERO);
  const totalEquity = equityAccounts.add(pnl.netProfit);
  return {
    assets,
    liabilities,
    equity,
    earnings: pnl.netProfit,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: totalAssets.equals(totalLiabilities.add(totalEquity)),
  };
}

/** Per-account debit/credit totals for posted entries within an optional date window. */
export async function fetchAccountSums(
  prisma: PrismaClient,
  organizationId: string,
  window: { from?: Date; to?: Date } = {}
): Promise<AccountSum[]> {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (window.from) dateFilter.gte = window.from;
  if (window.to) dateFilter.lte = window.to;

  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({ where: { organizationId }, orderBy: { code: "asc" } }),
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        journalEntry: {
          organizationId,
          isPosted: true,
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        },
      },
      _sum: { debit: true, credit: true },
    }),
  ]);
  const sumById = new Map(sums.map((s) => [s.accountId, s._sum]));
  return accounts.map((a) => {
    const s = sumById.get(a.id);
    return {
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type as AccountType,
      debit: new Decimal(s?.debit?.toString() ?? 0),
      credit: new Decimal(s?.credit?.toString() ?? 0),
    };
  });
}
