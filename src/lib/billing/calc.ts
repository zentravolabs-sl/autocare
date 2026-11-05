import { Decimal } from "@prisma/client/runtime/library";
import { ACCOUNT } from "@/lib/accounting/chart";

export const DEFAULT_VAT_RATE = 18; // Sri Lanka VAT, percent

export type InvoiceItemType = "LABOR" | "PART" | "EXTERNAL" | "CHARGE";

export interface LineInput {
  itemType: InvoiceItemType;
  quantity: number | string | Decimal;
  unitPrice: number | string | Decimal;
  discountAmount?: number | string | Decimal;
}

export interface ComputedLine {
  itemType: InvoiceItemType;
  quantity: Decimal;
  unitPrice: Decimal;
  discountAmount: Decimal;
  /** quantity * unitPrice - discount, before tax */
  netAmount: Decimal;
  taxAmount: Decimal;
  /** netAmount + taxAmount */
  totalAmount: Decimal;
}

export interface InvoiceTotals {
  lines: ComputedLine[];
  /** Sum of quantity * unitPrice before discounts */
  subtotal: Decimal;
  discountAmount: Decimal;
  netAmount: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
}

/** Money is always rounded half-up to 2 decimal places. */
export function round2(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function computeLine(line: LineInput, vatRate: number = DEFAULT_VAT_RATE): ComputedLine {
  const quantity = new Decimal(line.quantity);
  const unitPrice = new Decimal(line.unitPrice);
  const discountAmount = round2(line.discountAmount ?? 0);

  if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
    throw new Error("Line quantity must be greater than zero");
  }
  if (!unitPrice.isFinite() || unitPrice.isNegative()) {
    throw new Error("Line unit price cannot be negative");
  }
  if (discountAmount.isNegative()) {
    throw new Error("Line discount cannot be negative");
  }

  const gross = round2(quantity.mul(unitPrice));
  if (discountAmount.greaterThan(gross)) {
    throw new Error("Line discount cannot exceed the line amount");
  }

  const netAmount = gross.sub(discountAmount);
  const taxAmount = round2(netAmount.mul(vatRate).div(100));
  return {
    itemType: line.itemType,
    quantity,
    unitPrice,
    discountAmount,
    netAmount,
    taxAmount,
    totalAmount: netAmount.add(taxAmount),
  };
}

export function computeInvoiceTotals(
  inputs: LineInput[],
  vatRate: number = DEFAULT_VAT_RATE
): InvoiceTotals {
  const lines = inputs.map((l) => computeLine(l, vatRate));
  const zero = new Decimal(0);
  const sum = (pick: (l: ComputedLine) => Decimal) =>
    lines.reduce((acc, l) => acc.add(pick(l)), zero);

  const subtotal = sum((l) => round2(l.quantity.mul(l.unitPrice)));
  const discountAmount = sum((l) => l.discountAmount);
  const netAmount = sum((l) => l.netAmount);
  const taxAmount = sum((l) => l.taxAmount);
  return {
    lines,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalAmount: netAmount.add(taxAmount),
  };
}

export function revenueAccountFor(itemType: InvoiceItemType): string {
  switch (itemType) {
    case "LABOR":
      return ACCOUNT.REVENUE_LABOR;
    case "PART":
      return ACCOUNT.REVENUE_PARTS;
    default:
      return ACCOUNT.REVENUE_OTHER;
  }
}

export type PaymentMethodCode =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "CHEQUE";

/** Cash goes to the till; every other accepted method settles into the bank account. */
export function settlementAccountFor(method: PaymentMethodCode): string {
  return method === "CASH" ? ACCOUNT.CASH : ACCOUNT.BANK;
}
