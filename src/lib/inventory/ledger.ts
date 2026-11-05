import { PrismaClient, StockMovementType, TransferStatus, PartIssueStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type PrismaTx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface RecordMovementParams {
  organizationId: string;
  branchId: string;
  warehouseId: string;
  partId: string;
  movementType: StockMovementType;
  quantity: number | Decimal; // positive for inbound, negative for outbound
  unitCost: number | Decimal;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById?: string;
  allowNegativeStock?: boolean;
}

/**
 * Atomic Stock Movement & Ledger Update.
 * RULE: Never update Stock balance without an immutable StockMovement entry.
 * Uses Weighted Average Costing (WAC) on inbound inventory.
 */
export async function recordStockMovement(tx: PrismaTx, params: RecordMovementParams) {
  const {
    organizationId,
    branchId,
    warehouseId,
    partId,
    movementType,
    quantity: rawQty,
    unitCost: rawUnitCost,
    referenceType,
    referenceId,
    notes,
    createdById,
    allowNegativeStock = false,
  } = params;

  const qty = new Decimal(rawQty.toString());
  const unitCost = new Decimal(rawUnitCost.toString());
  const totalCost = qty.abs().mul(unitCost);

  // 1. Fetch current stock balance (or initialize for warehouse/part)
  let stock = await tx.stock.findUnique({
    where: {
      warehouseId_partId: {
        warehouseId,
        partId,
      },
    },
  });

  if (!stock) {
    stock = await tx.stock.create({
      data: {
        organizationId,
        branchId,
        warehouseId,
        partId,
        quantityOnHand: new Decimal(0),
        quantityReserved: new Decimal(0),
        quantityAvailable: new Decimal(0),
        averageUnitCost: unitCost,
      },
    });
  }

  const currentQOH = new Decimal(stock.quantityOnHand);
  const currentReserved = new Decimal(stock.quantityReserved);
  const currentAvailable = new Decimal(stock.quantityAvailable);
  const currentAvgCost = new Decimal(stock.averageUnitCost);

  // 2. Validate outbound quantities if negative stock is disallowed
  if (qty.isNegative()) {
    const deductQty = qty.abs();
    // For non-job-issues (which draw from reserved), check quantityOnHand or quantityAvailable
    if (!allowNegativeStock && currentQOH.lessThan(deductQty)) {
      throw new Error(
        `Insufficient stock for Part ID ${partId} in Warehouse ${warehouseId}. Current On-Hand: ${currentQOH}, Requested: ${deductQty}`
      );
    }
  }

  // 3. Calculate new quantity on hand
  const newQOH = currentQOH.add(qty);

  // 4. Calculate new available quantity
  let newAvailable: Decimal;
  if (movementType === "JOB_ISSUE") {
    // When issuing a previously reserved item, on-hand drops, reserved drops, available stays the same
    newAvailable = currentAvailable;
  } else {
    newAvailable = currentAvailable.add(qty);
  }

  // 5. Calculate Weighted Average Cost (WAC) for inbound receipts
  let newAvgCost = currentAvgCost;
  if (qty.isPositive() && (movementType === "PURCHASE_RECEIPT" || movementType === "PHYSICAL_ADJUSTMENT" || movementType === "BRANCH_TRANSFER_IN")) {
    if (newQOH.greaterThan(0)) {
      const priorValue = currentQOH.mul(currentAvgCost);
      const incomingValue = qty.mul(unitCost);
      newAvgCost = priorValue.add(incomingValue).div(newQOH);
    } else {
      newAvgCost = unitCost;
    }
  }

  // 6. Update cached Stock record
  await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantityOnHand: newQOH,
      quantityAvailable: newAvailable,
      averageUnitCost: newAvgCost,
    },
  });

  // 7. Append immutable StockMovement record
  const movement = await tx.stockMovement.create({
    data: {
      organizationId,
      branchId,
      warehouseId,
      partId,
      movementType,
      quantity: qty,
      unitCost,
      totalCost,
      referenceType,
      referenceId,
      notes,
      createdById,
    },
  });

  return {
    movement,
    newQOH,
    newAvailable,
    newAvgCost,
  };
}

/**
 * Reserve a part for a Job Card.
 * Increments quantityReserved and decrements quantityAvailable.
 */
export async function reservePartForJob(
  tx: PrismaTx,
  params: {
    organizationId: string;
    branchId: string;
    warehouseId: string;
    jobCardId: string;
    partId: string;
    quantity: number | Decimal;
    unitPrice: number | Decimal;
  }
) {
  const { organizationId, branchId, warehouseId, jobCardId, partId, quantity: rawQty, unitPrice: rawPrice } = params;
  const qty = new Decimal(rawQty.toString());
  const unitPrice = new Decimal(rawPrice.toString());

  // Check stock
  let stock = await tx.stock.findUnique({
    where: {
      warehouseId_partId: { warehouseId, partId },
    },
  });

  if (!stock || new Decimal(stock.quantityAvailable).lessThan(qty)) {
    const available = stock ? stock.quantityAvailable.toString() : "0";
    throw new Error(`Insufficient available stock for reservation. Available: ${available}, Requested: ${qty}`);
  }

  // Update stock reservation
  await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantityReserved: new Decimal(stock.quantityReserved).add(qty),
      quantityAvailable: new Decimal(stock.quantityAvailable).sub(qty),
    },
  });

  // Create JobPartIssue record
  const issue = await tx.jobPartIssue.create({
    data: {
      jobCardId,
      partId,
      warehouseId,
      quantity: qty,
      unitCost: stock.averageUnitCost,
      unitPrice,
      status: "RESERVED",
    },
    include: {
      part: true,
    },
  });

  return issue;
}

/**
 * Issue a reserved part to the Job Card workshop floor.
 * Deducts quantityOnHand and quantityReserved. Appends immutable JOB_ISSUE movement.
 */
export async function issuePartToJob(
  tx: PrismaTx,
  params: {
    jobPartIssueId: string;
    createdById?: string;
  }
) {
  const { jobPartIssueId, createdById } = params;

  const issue = await tx.jobPartIssue.findUnique({
    where: { id: jobPartIssueId },
    include: { jobCard: true, part: true },
  });

  if (!issue) {
    throw new Error("Job part issue record not found");
  }

  if (issue.status === "ISSUED") {
    throw new Error("Part has already been issued to workshop floor");
  }

  const stock = await tx.stock.findUnique({
    where: {
      warehouseId_partId: {
        warehouseId: issue.warehouseId,
        partId: issue.partId,
      },
    },
  });

  if (!stock) {
    throw new Error("Stock record not found for part and warehouse");
  }

  // Deduct from reserved
  await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantityReserved: new Decimal(stock.quantityReserved).sub(issue.quantity),
    },
  });

  // Record Stock Movement (JOB_ISSUE with negative quantity)
  await recordStockMovement(tx, {
    organizationId: issue.jobCard.organizationId,
    branchId: issue.jobCard.branchId,
    warehouseId: issue.warehouseId,
    partId: issue.partId,
    movementType: "JOB_ISSUE",
    quantity: new Decimal(issue.quantity).negated(),
    unitCost: issue.unitCost,
    referenceType: "JOB_CARD",
    referenceId: issue.jobCard.jobNumber,
    notes: `Issued to Job Card ${issue.jobCard.jobNumber}`,
    createdById,
    allowNegativeStock: true,
  });

  // Update JobPartIssue status
  const updatedIssue = await tx.jobPartIssue.update({
    where: { id: jobPartIssueId },
    data: {
      status: "ISSUED",
      issuedAt: new Date(),
    },
  });

  // Update JobCard actual parts cost
  const allIssued = await tx.jobPartIssue.findMany({
    where: {
      jobCardId: issue.jobCardId,
      status: "ISSUED",
    },
  });

  const totalPartsCost = allIssued.reduce(
    (sum, item) => sum.add(new Decimal(item.quantity).mul(item.unitPrice)),
    new Decimal(0)
  );

  await tx.jobCard.update({
    where: { id: issue.jobCardId },
    data: {
      actualPartsCost: totalPartsCost,
      actualTotalCost: new Decimal(issue.jobCard.actualLaborCost).add(totalPartsCost),
    },
  });

  return updatedIssue;
}

/**
 * Return an unused part from a Job Card back to inventory.
 * Adds back quantityOnHand and quantityAvailable.
 */
export async function returnPartFromJob(
  tx: PrismaTx,
  params: {
    jobPartIssueId: string;
    returnQuantity?: number | Decimal;
    createdById?: string;
  }
) {
  const { jobPartIssueId, returnQuantity, createdById } = params;

  const issue = await tx.jobPartIssue.findUnique({
    where: { id: jobPartIssueId },
    include: { jobCard: true },
  });

  if (!issue) {
    throw new Error("Job part issue record not found");
  }

  const qtyToReturn = returnQuantity ? new Decimal(returnQuantity.toString()) : new Decimal(issue.quantity);

  if (issue.status === "RESERVED") {
    // Simply cancel reservation
    const stock = await tx.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: issue.warehouseId,
          partId: issue.partId,
        },
      },
    });

    if (stock) {
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantityReserved: new Decimal(stock.quantityReserved).sub(qtyToReturn),
          quantityAvailable: new Decimal(stock.quantityAvailable).add(qtyToReturn),
        },
      });
    }

    return await tx.jobPartIssue.update({
      where: { id: jobPartIssueId },
      data: { status: "RETURNED", returnedAt: new Date() },
    });
  }

  // If already issued, record JOB_RETURN movement
  await recordStockMovement(tx, {
    organizationId: issue.jobCard.organizationId,
    branchId: issue.jobCard.branchId,
    warehouseId: issue.warehouseId,
    partId: issue.partId,
    movementType: "JOB_RETURN",
    quantity: qtyToReturn,
    unitCost: issue.unitCost,
    referenceType: "JOB_CARD",
    referenceId: issue.jobCard.jobNumber,
    notes: `Returned from Job Card ${issue.jobCard.jobNumber}`,
    createdById,
  });

  const updatedIssue = await tx.jobPartIssue.update({
    where: { id: jobPartIssueId },
    data: {
      status: "RETURNED",
      returnedAt: new Date(),
    },
  });

  // Recalculate Job Card parts cost
  const allIssued = await tx.jobPartIssue.findMany({
    where: {
      jobCardId: issue.jobCardId,
      status: "ISSUED",
    },
  });

  const totalPartsCost = allIssued.reduce(
    (sum, item) => sum.add(new Decimal(item.quantity).mul(item.unitPrice)),
    new Decimal(0)
  );

  await tx.jobCard.update({
    where: { id: issue.jobCardId },
    data: {
      actualPartsCost: totalPartsCost,
      actualTotalCost: new Decimal(issue.jobCard.actualLaborCost).add(totalPartsCost),
    },
  });

  return updatedIssue;
}

/**
 * Dispatch an inter-branch / inter-warehouse stock transfer.
 * Deducts stock from source warehouse with movement BRANCH_TRANSFER_OUT.
 */
export async function dispatchStockTransfer(
  tx: PrismaTx,
  params: {
    transferId: string;
    createdById?: string;
  }
) {
  const { transferId, createdById } = params;

  const transfer = await tx.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error("Stock transfer not found");
  }

  if (transfer.status !== "DRAFT") {
    throw new Error(`Cannot dispatch transfer with status ${transfer.status}`);
  }

  // Deduct each item from source warehouse
  for (const item of transfer.items) {
    await recordStockMovement(tx, {
      organizationId: transfer.organizationId,
      branchId: transfer.fromBranchId,
      warehouseId: transfer.fromWarehouseId,
      partId: item.partId,
      movementType: "BRANCH_TRANSFER_OUT",
      quantity: new Decimal(item.quantity).negated(),
      unitCost: item.unitCost,
      referenceType: "STOCK_TRANSFER",
      referenceId: transfer.transferNumber,
      notes: `Transfer dispatch ${transfer.transferNumber}`,
      createdById,
    });
  }

  return await tx.stockTransfer.update({
    where: { id: transferId },
    data: {
      status: "IN_TRANSIT",
      dispatchedAt: new Date(),
    },
  });
}

/**
 * Receive an in-transit stock transfer at the destination warehouse.
 * Adds stock to destination warehouse with movement BRANCH_TRANSFER_IN.
 */
export async function receiveStockTransfer(
  tx: PrismaTx,
  params: {
    transferId: string;
    createdById?: string;
  }
) {
  const { transferId, createdById } = params;

  const transfer = await tx.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: true },
  });

  if (!transfer) {
    throw new Error("Stock transfer not found");
  }

  if (transfer.status !== "IN_TRANSIT") {
    throw new Error(`Cannot receive transfer with status ${transfer.status}. Must be IN_TRANSIT.`);
  }

  // Add each item to destination warehouse
  for (const item of transfer.items) {
    await recordStockMovement(tx, {
      organizationId: transfer.organizationId,
      branchId: transfer.toBranchId,
      warehouseId: transfer.toWarehouseId,
      partId: item.partId,
      movementType: "BRANCH_TRANSFER_IN",
      quantity: new Decimal(item.quantity),
      unitCost: item.unitCost,
      referenceType: "STOCK_TRANSFER",
      referenceId: transfer.transferNumber,
      notes: `Transfer received ${transfer.transferNumber}`,
      createdById,
    });
  }

  return await tx.stockTransfer.update({
    where: { id: transferId },
    data: {
      status: "COMPLETED",
      receivedAt: new Date(),
    },
  });
}

/**
 * Physical stock cycle count adjustment.
 * Reconciles theoretical system QOH with physical count.
 */
export async function adjustPhysicalStock(
  tx: PrismaTx,
  params: {
    organizationId: string;
    branchId: string;
    warehouseId: string;
    partId: string;
    countedQuantity: number | Decimal;
    reason: string;
    createdById?: string;
  }
) {
  const { organizationId, branchId, warehouseId, partId, countedQuantity: rawCount, reason, createdById } = params;
  const counted = new Decimal(rawCount.toString());

  const stock = await tx.stock.findUnique({
    where: {
      warehouseId_partId: { warehouseId, partId },
    },
  });

  const currentQOH = stock ? new Decimal(stock.quantityOnHand) : new Decimal(0);
  const diff = counted.sub(currentQOH);

  if (diff.isZero()) {
    return { stock, diff: new Decimal(0) };
  }

  const unitCost = stock ? stock.averageUnitCost : new Decimal(0);

  const res = await recordStockMovement(tx, {
    organizationId,
    branchId,
    warehouseId,
    partId,
    movementType: "PHYSICAL_ADJUSTMENT",
    quantity: diff,
    unitCost,
    referenceType: "AUDIT_ADJUSTMENT",
    notes: `Cycle count adjustment: ${reason}. Variance: ${diff}`,
    createdById,
    allowNegativeStock: true,
  });

  return { stock: res, diff };
}
