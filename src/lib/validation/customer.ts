import { z } from "zod";

export const CustomerTypeEnum = z.enum(["INDIVIDUAL", "CORPORATE"]);

export const customerCreateSchema = z.object({
  type: CustomerTypeEnum.default("INDIVIDUAL"),
  firstName: z.string().min(1, "First name / business name is required").trim(),
  lastName: z.string().trim().optional().nullable(),
  companyName: z.string().trim().optional().nullable(),
  taxNumber: z.string().trim().optional().nullable(),
  phone: z
    .string()
    .min(9, "Valid phone number is required")
    .trim(),
  whatsapp: z.string().trim().optional().nullable(),
  email: z.string().email("Invalid email address").trim().optional().or(z.literal("")).nullable(),
  address: z.string().trim().optional().nullable(),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().trim().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
