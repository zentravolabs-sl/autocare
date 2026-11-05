import { z } from "zod";

export const JobCardStageEnum = z.enum([
  "VEHICLE_RECEPTION",
  "INITIAL_INSPECTION",
  "CUSTOMER_COMPLAINT",
  "DIAGNOSTIC_INSPECTION",
  "ESTIMATE_CREATION",
  "CUSTOMER_APPROVAL",
  "TECHNICIAN_ASSIGNMENT",
  "PARTS_RESERVATION",
  "REPAIR_IN_PROGRESS",
  "QUALITY_INSPECTION",
  "FINAL_INVOICE",
  "PAYMENT",
  "VEHICLE_DELIVERY",
  "CLOSED",
  "CANCELLED",
]);

export const JobPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const jobCardCreateSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  advisorId: z.string().optional().nullable(),
  bayId: z.string().optional().nullable(),
  currentMileage: z.number().int().min(0, "Current mileage is required"),
  fuelLevel: z.enum(["EMPTY", "1/4", "1/2", "3/4", "FULL"]).default("1/2"),
  priority: JobPriorityEnum.default("NORMAL"),
  expectedDelivery: z.string().optional().nullable(),
  customerComplaints: z.string().min(1, "Customer complaints/requests are required").trim(),
  conditionNotes: z.string().trim().optional().nullable(),
  estimatedLaborCost: z.number().min(0).default(0),
  estimatedPartsCost: z.number().min(0).default(0),
  initialServices: z
    .array(
      z.object({
        serviceId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        estimatedHours: z.number().min(0.1).default(1.0),
        hourlyRate: z.number().min(0).default(0),
      })
    )
    .optional(),
});

export const jobCardUpdateStageSchema = z.object({
  stage: JobCardStageEnum,
  notes: z.string().optional(),
});

export const jobTaskCreateSchema = z.object({
  jobCardId: z.string().min(1),
  serviceId: z.string().optional().nullable(),
  name: z.string().min(1, "Task name is required").trim(),
  description: z.string().trim().optional().nullable(),
  estimatedHours: z.number().min(0.1).default(1.0),
  hourlyRate: z.number().min(0).default(0),
  technicianIds: z.array(z.string()).optional(),
  isMandatory: z.boolean().default(true),
});

export const timeLogSchema = z.object({
  action: z.enum(["START", "PAUSE", "COMPLETE"]),
  notes: z.string().optional(),
});

export const inspectionSubmitSchema = z.object({
  jobCardId: z.string().min(1),
  overallNotes: z.string().optional(),
  results: z.array(
    z.object({
      category: z.string().min(1),
      itemName: z.string().min(1),
      condition: z.enum(["GOOD", "ATTENTION", "NEEDS_REPAIR", "CRITICAL", "NOT_APPLICABLE"]),
      notes: z.string().optional(),
    })
  ),
});

export const diagnosticSubmitSchema = z.object({
  jobCardId: z.string().min(1),
  deviceUsed: z.string().default("OBD-II Scanner"),
  scannerType: z.string().default("OBD-II"),
  protocol: z.string().default("ISO 15765-4 (CAN)"),
  sessionNotes: z.string().optional(),
  codes: z.array(
    z.object({
      dtcCode: z.string().min(1).trim().toUpperCase(),
      severity: z.enum(["MINOR", "MODERATE", "CRITICAL"]).default("MODERATE"),
      description: z.string().min(1),
      symptoms: z.string().optional(),
      suggestedAction: z.string().optional(),
    })
  ),
});

export const estimateCreateSchema = z.object({
  jobCardId: z.string().min(1),
  notes: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  taxRatePercent: z.number().min(0).default(18), // 18% VAT standard Sri Lanka
  items: z.array(
    z.object({
      itemType: z.enum(["LABOR", "PART", "EXTERNAL", "OTHER"]),
      referenceId: z.string().optional(),
      description: z.string().min(1),
      quantity: z.number().min(0.1).default(1),
      unitPrice: z.number().min(0),
      discountAmount: z.number().min(0).default(0),
      taxRate: z.number().min(0).default(18),
    })
  ),
});

export const estimateApprovalSchema = z.object({
  estimateId: z.string().min(1),
  customerSignature: z.string().optional(),
  isApproved: z.boolean().default(true),
  notes: z.string().optional(),
});

export type JobCardCreateInput = z.infer<typeof jobCardCreateSchema>;
