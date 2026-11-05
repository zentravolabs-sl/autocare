/**
 * System account codes used by automated postings. These match the chart of
 * accounts seeded in prisma/seed.ts; changing a code here requires a matching
 * change in the tenant's chart of accounts.
 */
export const ACCOUNT = {
  CASH: "1010",
  BANK: "1020",
  RECEIVABLE: "1200",
  INVENTORY: "1300",
  PAYABLE: "2010",
  VAT_PAYABLE: "2050",
  EQUITY: "3010",
  REVENUE_LABOR: "4010",
  REVENUE_PARTS: "4020",
  REVENUE_OTHER: "4030",
  COGS: "5010",
} as const;

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

/** Assets and expenses increase with debits; everything else with credits. */
export function isDebitNormal(type: AccountType): boolean {
  return type === "ASSET" || type === "EXPENSE";
}
