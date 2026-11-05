import { z } from "zod";

export const VehicleTypeEnum = z.enum([
  "CAR",
  "VAN",
  "SUV",
  "MOTORCYCLE",
  "THREE_WHEELER",
  "TRUCK",
  "BUS",
  "HYBRID",
  "ELECTRIC",
]);

/**
 * Normalizes Sri Lankan vehicle registration numbers.
 * Examples:
 * - "wp cab - 1234" -> "WP CAB-1234"
 * - "cab-1234"      -> "CAB-1234"
 * - "19 - 4567"     -> "19-4567"
 * - "sp  caa 9999"  -> "SP CAA-9999"
 */
export function normalizeRegistrationNumber(raw: string): string {
  if (!raw) return "";

  // Trim and uppercase
  let cleaned = raw.trim().toUpperCase().replace(/\s+/g, " ");

  // Match pattern: Optional 2-letter province (WP, SP, CP, NW, NC, SG, VA, EP, UP) + space + 2-3 letters + optional dash/space + 4 digits
  const modernProvRegex = /^(WP|SP|CP|NW|NC|SG|VA|EP|UP)\s+([A-Z]{2,3})[\s-]*([0-9]{4})$/;
  const matchModernProv = cleaned.match(modernProvRegex);
  if (matchModernProv) {
    return `${matchModernProv[1]} ${matchModernProv[2]}-${matchModernProv[3]}`;
  }

  // Match pattern: 2-3 letters without province + optional dash/space + 4 digits (e.g. CAB 1234, CAA-5678)
  const modernRegex = /^([A-Z]{2,3})[\s-]*([0-9]{4})$/;
  const matchModern = cleaned.match(modernRegex);
  if (matchModern) {
    return `${matchModern[1]}-${matchModern[2]}`;
  }

  // Match pattern: Vintage number dash number (e.g. 19-1234, 65 9876)
  const vintageRegex = /^([0-9]{1,3})[\s-]*([0-9]{4})$/;
  const matchVintage = cleaned.match(vintageRegex);
  if (matchVintage) {
    return `${matchVintage[1]}-${matchVintage[2]}`;
  }

  // Default clean: uppercase with hyphens preserved
  return cleaned.replace(/\s*-\s*/g, "-");
}

export const vehicleCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  registrationNumber: z
    .string()
    .min(3, "Valid registration plate is required")
    .transform(normalizeRegistrationNumber),
  vehicleType: VehicleTypeEnum.default("CAR"),
  make: z.string().min(1, "Manufacturer make is required (e.g. Toyota, Honda)").trim(),
  model: z.string().min(1, "Model is required (e.g. Prius, Vezel, Axio)").trim(),
  variant: z.string().trim().optional().nullable(),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
  engineNumber: z.string().trim().optional().nullable(),
  vinChassis: z.string().trim().optional().nullable(),
  fuelType: z.string().trim().default("Petrol"),
  transmission: z.string().trim().default("Automatic"),
  mileage: z.number().int().min(0, "Mileage cannot be negative").default(0),
  color: z.string().trim().optional().nullable(),
  licenseExpiry: z.string().optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
