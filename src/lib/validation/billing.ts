import { z } from "zod";

export const PAYMENT_METHODS = ["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "CHEQUE"] as const;

export const invoiceLineSchema = z
  .object({
    itemType: z.enum(["LABOR", "PART", "EXTERNAL", "CHARGE"]),
    partId: z.string().min(1).optional(),
    warehouseId: z.string().min(1).optional(),
    description: z.string().trim().max(200).optional(),
    quantity: z.coerce.number().positive("Quantity must be greater than zero").max(100000),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").optional(),
    discountAmount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  })
  .refine((l) => l.itemType !== "PART" || (l.partId && l.warehouseId), {
    message: "Part lines require a part and a source warehouse",
  })
  .refine((l) => l.itemType === "PART" || (l.description && l.unitPrice !== undefined), {
    message: "Non-part lines require a description and a unit price",
  });

export const createInvoiceSchema = z
  .object({
    jobCardId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(invoiceLineSchema).max(100).optional(),
  })
  .refine((v) => v.jobCardId || (v.items && v.items.length > 0), {
    message: "Provide a jobCardId or at least one line item",
  })
  .refine((v) => !(v.jobCardId && v.items && v.items.length > 0), {
    message: "Provide either a jobCardId or POS line items, not both",
  });

export const receivePaymentsSchema = z.object({
  payments: z
    .array(
      z.object({
        method: z.enum(PAYMENT_METHODS),
        amount: z.coerce.number().positive("Payment amount must be greater than zero"),
        transactionReference: z.string().trim().max(100).optional(),
      })
    )
    .min(1, "At least one payment is required")
    .max(10),
});
