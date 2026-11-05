import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db/prisma";

describe("Phase 03: Job Card Mechanical Workflow Integration", () => {
  let orgId: string;
  let branchId: string;
  let customerId: string;
  let vehicleId: string;
  let jobCardId: string;

  beforeAll(async () => {
    // 1. Create Organization & Branch
    const org = await prisma.organization.create({
      data: {
        code: `JC-TEST-${Date.now()}`,
        name: "Job Card Workshop Integration",
        currency: "LKR",
      },
    });
    orgId = org.id;

    const branch = await prisma.branch.create({
      data: {
        organizationId: orgId,
        code: "JC-BR-01",
        name: "Test Mechanical Bay Branch",
      },
    });
    branchId = branch.id;

    // 2. Create Customer & Vehicle
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        customerCode: "CUST-JC-01",
        firstName: "Malik",
        lastName: "De Silva",
        phone: "+94 77 444 5555",
      },
    });
    customerId = customer.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: orgId,
        customerId,
        registrationNumber: "WP KV-7788",
        vehicleType: "HYBRID",
        make: "Toyota",
        model: "Aqua NHP10",
        fuelType: "Hybrid",
        transmission: "e-CVT",
        mileage: 94000,
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("creates a job card at VEHICLE_RECEPTION and progresses mileage", async () => {
    const jobCard = await prisma.jobCard.create({
      data: {
        organizationId: orgId,
        branchId,
        jobNumber: "JC-2026-TEST-001",
        customerId,
        vehicleId,
        stage: "VEHICLE_RECEPTION",
        priority: "HIGH",
        currentMileage: 95500, // +1500 km
        fuelLevel: "1/2",
        customerComplaints: "Hybrid warning indicator ON",
      },
    });
    jobCardId = jobCard.id;

    expect(jobCard.stage).toBe("VEHICLE_RECEPTION");
    expect(jobCard.jobNumber).toBe("JC-2026-TEST-001");

    // Update vehicle mileage
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { mileage: 95500 },
    });

    const updatedVehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    expect(updatedVehicle?.mileage).toBe(95500);
  });

  it("adds task and logs technician time work accurately", async () => {
    const task = await prisma.jobTask.create({
      data: {
        jobCardId,
        name: "Hybrid Inverter Coolant & Water Pump Replacement",
        estimatedHours: 2.5,
        hourlyRate: 5000,
        status: "PENDING",
      },
    });

    expect(task.name).toContain("Hybrid Inverter");
    expect(Number(task.estimatedHours)).toBe(2.5);

    // Simulate work completion
    const updatedTask = await prisma.jobTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        actualHours: 2.25,
      },
    });

    expect(updatedTask.status).toBe("COMPLETED");
    expect(Number(updatedTask.actualHours)).toBe(2.25);
  });

  it("logs OBD-II diagnostic trouble code", async () => {
    const session = await prisma.diagnosticSession.create({
      data: {
        jobCardId,
        deviceUsed: "Autel MaxiSys",
        codes: {
          create: {
            dtcCode: "P0A93",
            severity: "CRITICAL",
            description: "Inverter Cooling System Performance",
            suggestedAction: "Replace dedicated electric inverter water pump",
            status: "DETECTED",
          },
        },
      },
      include: { codes: true },
    });

    expect(session.codes.length).toBe(1);
    expect(session.codes[0].dtcCode).toBe("P0A93");
    expect(session.codes[0].severity).toBe("CRITICAL");
  });

  it("creates and approves an Estimate advancing the workflow", async () => {
    const estimate = await prisma.estimate.create({
      data: {
        jobCardId,
        versionNumber: 1,
        subtotalLabor: 12500,
        subtotalParts: 35000,
        discountAmount: 2500,
        taxAmount: 8100, // 18% VAT
        totalAmount: 53100,
        status: "SENT",
        items: {
          create: [
            {
              itemType: "LABOR",
              description: "Inverter Pump Labor",
              quantity: 1,
              unitPrice: 12500,
              totalPrice: 12500,
            },
            {
              itemType: "PART",
              description: "Toyota OEM Inverter Pump G9020-47031",
              quantity: 1,
              unitPrice: 35000,
              totalPrice: 35000,
            },
          ],
        },
      },
    });

    expect(estimate.status).toBe("SENT");
    expect(Number(estimate.totalAmount)).toBe(53100);

    // Customer approves estimate
    const approved = await prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        customerSignature: "Malik De Silva",
      },
    });

    expect(approved.status).toBe("APPROVED");
    expect(approved.customerSignature).toBe("Malik De Silva");
  });
});
