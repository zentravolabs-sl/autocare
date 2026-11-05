import { JobCardStage } from "@prisma/client";

export const ORDERED_STAGES: JobCardStage[] = [
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
];

export interface StageTransitionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a job card can transition from currentStage to targetStage.
 */
export function validateStageTransition(
  currentStage: JobCardStage,
  targetStage: JobCardStage,
  context?: {
    hasTasks?: boolean;
    pendingTasksCount?: number;
    hasApprovedEstimate?: boolean;
    hasInvoice?: boolean;
    isInvoicePaid?: boolean;
    hasQualityCheck?: boolean;
  }
): StageTransitionCheck {
  if (currentStage === targetStage) {
    return { allowed: true };
  }

  // Cancelled can occur from any stage except CLOSED
  if (targetStage === "CANCELLED") {
    if (currentStage === "CLOSED") {
      return { allowed: false, reason: "Cannot cancel a closed job card" };
    }
    return { allowed: true };
  }

  // Cannot transition out of CLOSED or CANCELLED
  if (currentStage === "CLOSED" || currentStage === "CANCELLED") {
    return {
      allowed: false,
      reason: `Job card is ${currentStage.toLowerCase()} and cannot be modified.`,
    };
  }

  const currentIndex = ORDERED_STAGES.indexOf(currentStage);
  const targetIndex = ORDERED_STAGES.indexOf(targetStage);

  if (currentIndex === -1 || targetIndex === -1) {
    return { allowed: false, reason: "Invalid workflow stage" };
  }

  // Pre-requisite validations based on business logic:

  // Rule 1: Cannot jump to QUALITY_INSPECTION or beyond if tasks are incomplete
  if (targetIndex >= ORDERED_STAGES.indexOf("QUALITY_INSPECTION")) {
    if (context?.pendingTasksCount && context.pendingTasksCount > 0) {
      return {
        allowed: false,
        reason: `Cannot advance: ${context.pendingTasksCount} mandatory task(s) are still incomplete.`,
      };
    }
  }

  // Rule 2: Cannot advance to FINAL_INVOICE without quality clearance
  if (targetIndex >= ORDERED_STAGES.indexOf("FINAL_INVOICE")) {
    if (context && context.hasQualityCheck === false) {
      return {
        allowed: false,
        reason: "Vehicle must pass Quality Inspection before generating final invoice.",
      };
    }
  }

  // Rule 3: Cannot close job card without payment received
  if (targetStage === "CLOSED") {
    if (context && context.isInvoicePaid === false) {
      return {
        allowed: false,
        reason: "Cannot close job card until invoice balance is fully settled.",
      };
    }
  }

  return { allowed: true };
}
