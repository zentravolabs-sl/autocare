import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { computeLine, computeInvoiceTotals, revenueAccountFor, settlementAccountFor } from "@/lib/billing/calc";
import {
  buildInvoiceJournalLines,
  buildPaymentJournalLines,
  normalizeAndValidateLines,
  UnbalancedJournalError,
} from "@/lib/accounting/journal";
import {
  buildTrialBalance,
  buildProfitAndLoss,
  buildBalanceSheet,
  naturalBalance,
  AccountSum,
} from "@/lib/accounting/reports";
import { ACCOUNT } from "@/lib/accounting/chart";

describe("Phase 05: Billing Calculations", () => {
  it("calculates 18% Sri Lanka VAT correctly with half-up rounding", () => {
    // 1 item @ 1000, 18% vat -> 180 vat, total 1180
    const line = computeLine({
      itemType: "PART",
      quantity: 1,
      unitPrice: 1000,
    });
    expect(line.netAmount.toNumber()).toBe(1000);
    expect(line.taxAmount.toNumber()).toBe(180);
    expect(line.totalAmount.toNumber()).toBe(1180);
  });

  it("handles line discount before tax", () => {
    // 2 items @ 500 = 1000, discount 100 -> net 900, 18% vat of 900 = 162, total 1062
    const line = computeLine({
      itemType: "LABOR",
      quantity: 2,
      unitPrice: 500,
      discountAmount: 100,
    });
    expect(line.netAmount.toNumber()).toBe(900);
    expect(line.taxAmount.toNumber()).toBe(162);
    expect(line.totalAmount.toNumber()).toBe(1062);
  });

  it("computes multi-line invoice totals correctly", () => {
    const totals = computeInvoiceTotals([
      { itemType: "LABOR", quantity: 1, unitPrice: 2000, discountAmount: 200 }, // net 1800, tax 324, total 2124
      { itemType: "PART", quantity: 3, unitPrice: 1000, discountAmount: 0 },    // net 3000, tax 540, total 3540
    ]);
    expect(totals.subtotal.toNumber()).toBe(5000);
    expect(totals.discountAmount.toNumber()).toBe(200);
    expect(totals.netAmount.toNumber()).toBe(4800);
    expect(totals.taxAmount.toNumber()).toBe(864);
    expect(totals.totalAmount.toNumber()).toBe(5664);
  });

  it("maps item types and payment methods to correct accounts", () => {
    expect(revenueAccountFor("LABOR")).toBe(ACCOUNT.REVENUE_LABOR);
    expect(revenueAccountFor("PART")).toBe(ACCOUNT.REVENUE_PARTS);
    expect(settlementAccountFor("CASH")).toBe(ACCOUNT.CASH);
    expect(settlementAccountFor("CREDIT_CARD")).toBe(ACCOUNT.BANK);
    expect(settlementAccountFor("BANK_TRANSFER")).toBe(ACCOUNT.BANK);
  });
});

describe("Phase 05: Double-Entry Journal Lines", () => {
  it("validates that balanced lines pass and unbalanced throw", () => {
    const valid = [
      { accountCode: "1010", debit: 500, credit: 0 },
      { accountCode: "1200", debit: 0, credit: 500 },
    ];
    expect(() => normalizeAndValidateLines(valid)).not.toThrow();

    const unbalanced = [
      { accountCode: "1010", debit: 500, credit: 0 },
      { accountCode: "1200", debit: 0, credit: 400 },
    ];
    expect(() => normalizeAndValidateLines(unbalanced)).toThrow(UnbalancedJournalError);
  });

  it("builds a balanced invoice journal entry with VAT & COGS", () => {
    const lines = buildInvoiceJournalLines({
      netByType: {
        PART: 1000,
        LABOR: 0,
      },
      taxAmount: 180,
      cogs: 600, // cost of inventory sold
    });

    const sumDebits = lines.reduce((acc, l) => acc.add(new Decimal(l.debit ?? 0)), new Decimal(0));
    const sumCredits = lines.reduce((acc, l) => acc.add(new Decimal(l.credit ?? 0)), new Decimal(0));
    expect(sumDebits.equals(sumCredits)).toBe(true);
    expect(sumDebits.toNumber()).toBe(1780); // 1180 (AR) + 600 (COGS)
  });

  it("builds a balanced payment journal entry", () => {
    const lines = buildPaymentJournalLines([{ method: "CASH", amount: 1180 }]);
    expect(lines).toHaveLength(2);
    expect(lines[0].accountCode).toBe(ACCOUNT.CASH);
    expect(Number(lines[0].debit)).toBe(1180);
    expect(lines[1].accountCode).toBe(ACCOUNT.RECEIVABLE);
    expect(Number(lines[1].credit)).toBe(1180);
  });
});

describe("Phase 05: Financial Reports Pure Builders", () => {
  const balancedSums: AccountSum[] = [
    { accountId: "1", code: "1010", name: "Cash", type: "ASSET", debit: new Decimal(3680), credit: new Decimal(0) },
    { accountId: "2", code: "1300", name: "Inventory", type: "ASSET", debit: new Decimal(1000), credit: new Decimal(600) },
    { accountId: "3", code: "2010", name: "Accounts Payable", type: "LIABILITY", debit: new Decimal(0), credit: new Decimal(1000) },
    { accountId: "4", code: "2050", name: "VAT Payable", type: "LIABILITY", debit: new Decimal(0), credit: new Decimal(180) },
    { accountId: "5", code: "3010", name: "Equity", type: "EQUITY", debit: new Decimal(0), credit: new Decimal(2500) },
    { accountId: "6", code: "4020", name: "Parts Revenue", type: "REVENUE", debit: new Decimal(0), credit: new Decimal(1000) },
    { accountId: "7", code: "5010", name: "COGS", type: "EXPENSE", debit: new Decimal(600), credit: new Decimal(0) },
  ];

  it("builds a balanced trial balance", () => {
    const tb = buildTrialBalance(balancedSums);
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebit.equals(tb.totalCredit)).toBe(true);
  });

  it("computes net profit correctly in P&L", () => {
    const pnl = buildProfitAndLoss(balancedSums);
    expect(pnl.totalRevenue.toNumber()).toBe(1000);
    expect(pnl.totalExpenses.toNumber()).toBe(600);
    expect(pnl.netProfit.toNumber()).toBe(400); // 1000 - 600
  });

  it("balances the balance sheet by adding net profit to equity", () => {
    const bs = buildBalanceSheet(balancedSums);
    expect(bs.totalAssets.toNumber()).toBe(4080);
    expect(bs.totalLiabilities.toNumber()).toBe(1180);
    expect(bs.totalEquity.toNumber()).toBe(2900);
    expect(bs.isBalanced).toBe(true);
  });
});

