import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db/prisma";
import { normalizeRegistrationNumber } from "../../src/lib/validation/vehicle";

describe("Phase 02: Customer Vault & Vehicle Fleet Integration", () => {
  let testOrgId: string;
  let customerId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: {
        code: `FLEET-TEST-${Date.now()}`,
        name: "Fleet Test Auto Care",
        country: "LK",
        currency: "LKR",
      },
    });
    testOrgId = org.id;

    // Create Customer
    const customer = await prisma.customer.create({
      data: {
        organizationId: testOrgId,
        customerCode: "CUST-9001",
        firstName: "Rukshan",
        lastName: "Perera",
        phone: "+94 77 888 9999",
        creditLimit: 150000,
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (testOrgId) {
      await prisma.organization.delete({ where: { id: testOrgId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("creates a vehicle with normalized registration plate linked to customer", async () => {
    const rawPlate = "wp   cbb - 4567";
    const normalized = normalizeRegistrationNumber(rawPlate);
    expect(normalized).toBe("WP CBB-4567");

    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: testOrgId,
        customerId,
        registrationNumber: normalized,
        vehicleType: "HYBRID",
        make: "Honda",
        model: "Vezel RU3",
        variant: "Z Orange Package",
        year: 2016,
        fuelType: "Hybrid",
        transmission: "7-Speed Dual Clutch",
        mileage: 82100,
      },
    });

    expect(vehicle.registrationNumber).toBe("WP CBB-4567");
    expect(vehicle.vehicleType).toBe("HYBRID");
    expect(vehicle.customerId).toBe(customerId);
  });

  it("prevents duplicate registration plates within the same tenant", async () => {
    await expect(
      prisma.vehicle.create({
        data: {
          organizationId: testOrgId,
          customerId,
          registrationNumber: "WP CBB-4567",
          vehicleType: "CAR",
          make: "Duplicate",
          model: "Car",
          fuelType: "Petrol",
          transmission: "Manual",
        },
      })
    ).rejects.toThrow();
  });

  it("retrieves full customer profile with multiple linked fleet vehicles", async () => {
    // Add second vehicle
    await prisma.vehicle.create({
      data: {
        organizationId: testOrgId,
        customerId,
        registrationNumber: "WP GA-1234",
        vehicleType: "CAR",
        make: "Suzuki",
        model: "WagonR FX",
        fuelType: "Petrol",
        transmission: "CVT",
        mileage: 45000,
      },
    });

    const retrievedCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { vehicles: true },
    });

    expect(retrievedCustomer).toBeDefined();
    expect(retrievedCustomer?.vehicles.length).toBe(2);
    expect(retrievedCustomer?.vehicles.map((v) => v.registrationNumber)).toContain("WP CBB-4567");
    expect(retrievedCustomer?.vehicles.map((v) => v.registrationNumber)).toContain("WP GA-1234");
  });
});
