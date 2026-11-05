import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db/prisma";

describe("Multi-Tenant Data Isolation & Entitlement Engine", () => {
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    // Lookup standard plan
    const standardPlan = await prisma.subscriptionPlan.findFirst({
      where: { code: "STANDARD" },
    });

    if (!standardPlan) throw new Error("Plan not found");

    // Create Tenant A
    const orgA = await prisma.organization.create({
      data: {
        code: `TEST-ORG-A-${Date.now()}`,
        name: "Test Workshop Alpha",
        country: "LK",
        currency: "LKR",
      },
    });
    tenantAId = orgA.id;

    // Create Tenant B
    const orgB = await prisma.organization.create({
      data: {
        code: `TEST-ORG-B-${Date.now()}`,
        name: "Test Workshop Beta",
        country: "LK",
        currency: "LKR",
      },
    });
    tenantBId = orgB.id;

    // Create Customers for both
    await prisma.customer.create({
      data: {
        organizationId: tenantAId,
        customerCode: "CUST-A-01",
        firstName: "Alpha Client",
        phone: "+94 77 111 2222",
      },
    });

    await prisma.customer.create({
      data: {
        organizationId: tenantBId,
        customerCode: "CUST-B-01",
        firstName: "Beta Client",
        phone: "+94 77 333 4444",
      },
    });
  });

  afterAll(async () => {
    // Cleanup test organizations
    if (tenantAId) {
      await prisma.organization.delete({ where: { id: tenantAId } }).catch(() => {});
    }
    if (tenantBId) {
      await prisma.organization.delete({ where: { id: tenantBId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("strictly isolates customers by organizationId", async () => {
    const customersForA = await prisma.customer.findMany({
      where: { organizationId: tenantAId },
    });

    expect(customersForA.length).toBe(1);
    expect(customersForA[0].firstName).toBe("Alpha Client");

    // Ensure Tenant A cannot see Tenant B's customer
    const crossCheck = customersForA.find((c) => c.firstName === "Beta Client");
    expect(crossCheck).toBeUndefined();
  });

  it("prevents duplicate customer codes within same tenant but allows identical code in different tenant", async () => {
    // Allowed: Tenant B having code "CUST-A-01" because customerCode is scoped by organizationId
    const customerBwithSameCode = await prisma.customer.create({
      data: {
        organizationId: tenantBId,
        customerCode: "CUST-A-01",
        firstName: "Beta Duplicate Code Client",
        phone: "+94 77 555 6666",
      },
    });

    expect(customerBwithSameCode.customerCode).toBe("CUST-A-01");
    expect(customerBwithSameCode.organizationId).toBe(tenantBId);

    // Rejected: Tenant A attempting to duplicate "CUST-A-01"
    await expect(
      prisma.customer.create({
        data: {
          organizationId: tenantAId,
          customerCode: "CUST-A-01",
          firstName: "Illegal Duplicate",
          phone: "+94 77 777 8888",
        },
      })
    ).rejects.toThrow();
  });
});
