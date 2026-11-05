import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  recordStockMovement,
  reservePartForJob,
  issuePartToJob,
  returnPartFromJob,
  dispatchStockTransfer,
  receiveStockTransfer,
} from "@/lib/inventory/ledger";
import { Decimal } from "@prisma/client/runtime/library";

describe("Inventory & Purchasing Integration Workflow", () => {
  let orgId: string;
  let branchId: string;
  let colomboWarehouseId: string;
  let kandyWarehouseId: string;
  let kandyBranchId: string;
  let categoryId: string;
  let partId: string;
  let testJobCardId: string;

  beforeAll(async () => {
    // Fetch demo organization
    const org = await prisma.organization.findFirst({
      where: { code: "APEX-LK" },
      include: {
        branches: {
          include: { warehouses: true },
        },
        partCategories: true,
      },
    });

    if (!org || org.branches.length < 2) {
      throw new Error("Seed organization with at least 2 branches required for integration tests");
    }

    orgId = org.id;
    branchId = org.branches[0].id;
    kandyBranchId = org.branches[1].id;
    colomboWarehouseId = org.branches[0].warehouses[0].id;
    kandyWarehouseId = org.branches[1].warehouses[0].id;
    categoryId = org.partCategories[0].id;

    // Create a dedicated test part
    const testSku = `TST-FILTER-${Date.now().toString().slice(-6)}`;
    const part = await prisma.part.create({
      data: {
        organizationId: orgId,
        categoryId,
        sku: testSku,
        name: "Test Oil Filter Integration",
        brand: "Denso Test",
        unit: "PCS",
        purchasePrice: new Decimal(2000),
        sellingPrice: new Decimal(3500),
        minStockLevel: 5,
        reorderLevel: 10,
      },
    });
    partId = part.id;

    // Fetch existing job card
    const jc = await prisma.jobCard.findFirst({
      where: { organizationId: orgId },
    });
    if (jc) {
      testJobCardId = jc.id;
    }
  });

  afterAll(async () => {
    // Clean up created test part & movements
    if (partId) {
      await prisma.stockMovement.deleteMany({ where: { partId } });
      await prisma.stock.deleteMany({ where: { partId } });
      await prisma.jobPartIssue.deleteMany({ where: { partId } });
      await prisma.stockTransferItem.deleteMany({ where: { partId } });
      await prisma.part.delete({ where: { id: partId } }).catch(() => {});
    }
  });

  it("1. intakes inventory with PURCHASE_RECEIPT and calculates WAC", async () => {
    // Initial GRN: 20 units @ 2,000 LKR
    await prisma.$transaction(async (tx) => {
      const result = await recordStockMovement(tx, {
        organizationId: orgId,
        branchId,
        warehouseId: colomboWarehouseId,
        partId,
        movementType: "PURCHASE_RECEIPT",
        quantity: 20,
        unitCost: 2000,
        referenceType: "GRN",
        referenceId: "GRN-TEST-001",
      });

      expect(result.newQOH.toNumber()).toBe(20);
      expect(result.newAvgCost.toNumber()).toBe(2000);
    });

    // Secondary GRN at higher cost: 10 units @ 2,600 LKR
    // Expected new WAC: (20 * 2000 + 10 * 2600) / 30 = (40,000 + 26,000) / 30 = 2,200 LKR
    await prisma.$transaction(async (tx) => {
      const result = await recordStockMovement(tx, {
        organizationId: orgId,
        branchId,
        warehouseId: colomboWarehouseId,
        partId,
        movementType: "PURCHASE_RECEIPT",
        quantity: 10,
        unitCost: 2600,
        referenceType: "GRN",
        referenceId: "GRN-TEST-002",
      });

      expect(result.newQOH.toNumber()).toBe(30);
      expect(result.newAvgCost.toNumber()).toBe(2200);
    });
  });

  it("2. enforces negative stock prevention on unauthorized over-issue", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await recordStockMovement(tx, {
          organizationId: orgId,
          branchId,
          warehouseId: colomboWarehouseId,
          partId,
          movementType: "JOB_ISSUE",
          quantity: -999, // Attempt to deduct 999 units when only 30 exist
          unitCost: 2200,
          allowNegativeStock: false,
        });
      })
    ).rejects.toThrow(/Insufficient stock/);
  });

  it("3. handles Job Card reservation and workshop issue lifecycle", async () => {
    if (!testJobCardId) return;

    let issueRecordId = "";

    // A. Reserve 5 parts for the Job Card
    await prisma.$transaction(async (tx) => {
      const issue = await reservePartForJob(tx, {
        organizationId: orgId,
        branchId,
        warehouseId: colomboWarehouseId,
        jobCardId: testJobCardId,
        partId,
        quantity: 5,
        unitPrice: 3500,
      });

      expect(issue.status).toBe("RESERVED");
      issueRecordId = issue.id;
    }, { maxWait: 15000, timeout: 30000 });

    // Verify stock record: QOH remains 30, Reserved is 5, Available is 25
    const stockAfterRes = await prisma.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: colomboWarehouseId,
          partId,
        },
      },
    });
    expect(Number(stockAfterRes?.quantityOnHand)).toBe(30);
    expect(Number(stockAfterRes?.quantityReserved)).toBe(5);
    expect(Number(stockAfterRes?.quantityAvailable)).toBe(25);

    // B. Issue reserved part to the workshop floor
    await prisma.$transaction(async (tx) => {
      const issued = await issuePartToJob(tx, {
        jobPartIssueId: issueRecordId,
      });
      expect(issued.status).toBe("ISSUED");
    }, { maxWait: 15000, timeout: 30000 });

    // Verify stock record after issue: QOH is 25, Reserved is 0, Available is 25
    const stockAfterIssue = await prisma.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: colomboWarehouseId,
          partId,
        },
      },
    });
    expect(Number(stockAfterIssue?.quantityOnHand)).toBe(25);
    expect(Number(stockAfterIssue?.quantityReserved)).toBe(0);
    expect(Number(stockAfterIssue?.quantityAvailable)).toBe(25);

    // C. Return 2 unused parts back to stock
    await prisma.$transaction(async (tx) => {
      const returned = await returnPartFromJob(tx, {
        jobPartIssueId: issueRecordId,
        returnQuantity: 2,
      });
      expect(returned.status).toBe("RETURNED");
    }, { maxWait: 15000, timeout: 30000 });

    // Verify stock record after return: QOH is 27, Available is 27
    const stockAfterReturn = await prisma.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: colomboWarehouseId,
          partId,
        },
      },
    });
    expect(Number(stockAfterReturn?.quantityOnHand)).toBe(27);
    expect(Number(stockAfterReturn?.quantityAvailable)).toBe(27);
  });

  it("4. dispatches and receives inter-branch stock transfers", async () => {
    // Create draft transfer: Colombo -> Kandy (10 units)
    const transferNumber = `TR-TEST-${Date.now().toString().slice(-6)}`;
    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId: orgId,
        transferNumber,
        fromBranchId: branchId,
        fromWarehouseId: colomboWarehouseId,
        toBranchId: kandyBranchId,
        toWarehouseId: kandyWarehouseId,
        status: "DRAFT",
        items: {
          create: [
            {
              partId,
              quantity: new Decimal(10),
              unitCost: new Decimal(2200),
            },
          ],
        },
      },
    });

    // A. Dispatch transfer (Colombo QOH drops by 10)
    await prisma.$transaction(async (tx) => {
      const dispatched = await dispatchStockTransfer(tx, {
        transferId: transfer.id,
      });
      expect(dispatched.status).toBe("IN_TRANSIT");
    }, { maxWait: 15000, timeout: 30000 });

    const colomboStock = await prisma.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: colomboWarehouseId,
          partId,
        },
      },
    });
    expect(Number(colomboStock?.quantityOnHand)).toBe(17); // 27 - 10 = 17

    // B. Receive transfer at Kandy (Kandy QOH increases by 10)
    await prisma.$transaction(async (tx) => {
      const received = await receiveStockTransfer(tx, {
        transferId: transfer.id,
      });
      expect(received.status).toBe("COMPLETED");
    }, { maxWait: 15000, timeout: 30000 });

    const kandyStock = await prisma.stock.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: kandyWarehouseId,
          partId,
        },
      },
    });
    expect(Number(kandyStock?.quantityOnHand)).toBe(10);
    expect(Number(kandyStock?.averageUnitCost)).toBe(2200);

    // Clean up transfer
    await prisma.stockTransferItem.deleteMany({ where: { transferId: transfer.id } });
    await prisma.stockTransfer.delete({ where: { id: transfer.id } });
  });
});
