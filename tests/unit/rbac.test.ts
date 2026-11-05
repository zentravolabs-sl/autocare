import { describe, it, expect } from "vitest";
import { hasPermission } from "../../src/lib/permissions/rbac";

describe("RBAC Permission Logic", () => {
  it("allows super admin unrestricted access to all permissions", () => {
    const session = {
      isSuperAdmin: true,
      roles: ["SUPER_ADMIN"],
      permissions: [],
    };
    expect(hasPermission(session, "job-card.create")).toBe(true);
    expect(hasPermission(session, "finance.refund")).toBe(true);
    expect(hasPermission(session, "any.unlisted.permission")).toBe(true);
  });

  it("allows business owner and admin full access to tenant operations", () => {
    const ownerSession = {
      isSuperAdmin: false,
      roles: ["OWNER"],
      permissions: [],
    };
    expect(hasPermission(ownerSession, "job-card.create")).toBe(true);
    expect(hasPermission(ownerSession, "invoice.finalize")).toBe(true);

    const adminSession = {
      isSuperAdmin: false,
      roles: ["ADMIN"],
      permissions: [],
    };
    expect(hasPermission(adminSession, "inventory.adjust")).toBe(true);
  });

  it("strictly validates granular permissions for specialized staff roles", () => {
    const mechanicSession = {
      isSuperAdmin: false,
      roles: ["SENIOR_MECHANIC"],
      permissions: ["job-card.view", "job-card.update", "technician.clock"],
    };

    expect(hasPermission(mechanicSession, "job-card.view")).toBe(true);
    expect(hasPermission(mechanicSession, "technician.clock")).toBe(true);
    // Mechanic should NOT be allowed to finalize invoices or manage subscriptions
    expect(hasPermission(mechanicSession, "invoice.finalize")).toBe(false);
    expect(hasPermission(mechanicSession, "subscription.manage")).toBe(false);
  });
});
