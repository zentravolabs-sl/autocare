import { describe, it, expect } from "vitest";
import { validateStageTransition, ORDERED_STAGES } from "../../src/lib/workflow/job-card-fsm";

describe("Job Card 14-Stage Finite State Machine (FSM)", () => {
  it("allows sequential progression through standard workflow stages", () => {
    const res1 = validateStageTransition("VEHICLE_RECEPTION", "INITIAL_INSPECTION");
    expect(res1.allowed).toBe(true);

    const res2 = validateStageTransition("INITIAL_INSPECTION", "CUSTOMER_COMPLAINT");
    expect(res2.allowed).toBe(true);

    const res3 = validateStageTransition("CUSTOMER_COMPLAINT", "DIAGNOSTIC_INSPECTION");
    expect(res3.allowed).toBe(true);

    const res4 = validateStageTransition("DIAGNOSTIC_INSPECTION", "ESTIMATE_CREATION");
    expect(res4.allowed).toBe(true);
  });

  it("prevents advancing to QUALITY_INSPECTION if mandatory tasks are incomplete", () => {
    const check = validateStageTransition("REPAIR_IN_PROGRESS", "QUALITY_INSPECTION", {
      pendingTasksCount: 2,
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("incomplete");
  });

  it("allows advancing to QUALITY_INSPECTION once all mandatory tasks are finished", () => {
    const check = validateStageTransition("REPAIR_IN_PROGRESS", "QUALITY_INSPECTION", {
      pendingTasksCount: 0,
    });
    expect(check.allowed).toBe(true);
  });

  it("prevents final invoice generation if quality inspection was not passed", () => {
    const check = validateStageTransition("QUALITY_INSPECTION", "FINAL_INVOICE", {
      hasQualityCheck: false,
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Quality Inspection");
  });

  it("prevents closing a job card if the invoice balance is unpaid", () => {
    const check = validateStageTransition("VEHICLE_DELIVERY", "CLOSED", {
      isInvoicePaid: false,
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("settled");
  });

  it("allows cancellation from any active stage but blocks cancellation once CLOSED", () => {
    expect(validateStageTransition("REPAIR_IN_PROGRESS", "CANCELLED").allowed).toBe(true);
    expect(validateStageTransition("CLOSED", "CANCELLED").allowed).toBe(false);
  });
});
