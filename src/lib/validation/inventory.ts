import { z } from "zod";

// ==========================================
// 1. PART & CATEGORY SCHEMAS
// ==========================================

export const createPartCategorySchema = z.object({
  code: z.string().trim().min(2, "Category code must be at least 2 characters").max(20).toUpperCase(),
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(100),
});

export const createPartSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  sku: z.string().trim().min(2, "SKU must be at least 2 characters").max(50).toUpperCase(),
  barcode: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().min(2, "Part name must be at least 2 characters").max(200),
  brand: z.string().trim().min(1, "Brand is required").max(100),
  unit: z.string().trim().default("PCS"),
  purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
  minStockLevel: z.coerce.number().int().min(0).default(5),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  isServicePart: z.boolean().default(false),
  isActive: z.boolean().default(true),
  // Optional initial stock opening balance
  initialStock: z.object({
    branchId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.coerce.number().min(0),
    unitCost: z.coerce.number().min(0),
  }).optional(),
});

export const updatePartSchema = createPartSchema.partial().omit({ initialStock: true });

// ==========================================
// 2. STOCK ADJUSTMENT SCHEMA
// ==========================================

export const stockAdjustmentSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  partId: z.string().min(1, "Part is required"),
  countedQuantity: z.coerce.number().min(0, "Counted quantity must be non-negative"),
  reason: z.string().trim().min(3, "Reason for adjustment is required"),
});

// ==========================================
// 3. SUPPLIER SCHEMAS
// ==========================================

export const createSupplierSchema = z.object({
  code: z.string().trim().min(2, "Supplier code is required").max(20).toUpperCase(),
  name: z.string().trim().min(2, "Supplier name is required").max(150),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  taxNumber: z.string().trim().max(50).optional().nullable(), // Sri Lankan VAT/TIN
  paymentTermsDays: z.coerce.number().int().min(0).default(30),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ==========================================
// 4. PURCHASE ORDER SCHEMAS
// ==========================================

export const poItemSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  quantityOrdered: z.coerce.number().positive("Quantity must be greater than zero"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
  taxRate: z.coerce.number().min(0).max(100).default(18), // Default 18% Sri Lankan VAT
});

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(poItemSchema).min(1, "At least one item is required in the Purchase Order"),
});

export const updatePOStatusSchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"]),
  notes: z.string().trim().optional(),
});

// ==========================================
// 5. GOODS RECEIPT NOTE (GRN) SCHEMAS
// ==========================================

export const grnItemSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  quantityReceived: z.coerce.number().positive("Quantity received must be greater than zero"),
  unitCost: z.coerce.number().min(0, "Unit landed cost cannot be negative"),
});

export const createGRNSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  warehouseId: z.string().min(1, "Receiving warehouse is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().optional().nullable(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(grnItemSchema).min(1, "At least one item is required for goods receipt"),
});

// ==========================================
// 6. INTER-BRANCH STOCK TRANSFER SCHEMAS
// ==========================================

export const transferItemSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  quantity: z.coerce.number().positive("Transfer quantity must be greater than zero"),
});

export const createStockTransferSchema = z.object({
  fromBranchId: z.string().min(1, "Source branch is required"),
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toBranchId: z.string().min(1, "Destination branch is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(transferItemSchema).min(1, "At least one item is required for transfer"),
});

// ==========================================
// 7. JOB CARD PART ALLOCATION SCHEMAS
// ==========================================

export const reserveJobPartSchema = z.object({
  jobCardId: z.string().min(1, "Job Card is required"),
  partId: z.string().min(1, "Part is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.coerce.number().positive("Reservation quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const returnJobPartSchema = z.object({
  jobPartIssueId: z.string().min(1, "Part Issue ID is required"),
  returnQuantity: z.coerce.number().positive().optional(),
});
