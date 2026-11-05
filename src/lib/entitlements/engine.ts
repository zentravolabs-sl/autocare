import { prisma } from "@/lib/db/prisma";

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number | null;
  currentUsage?: number;
}

/**
 * Validates whether an organization is entitled to a specific feature or limit.
 * Checks:
 * 1. Active subscription existence and status (ACTIVE or GRACE_PERIOD)
 * 2. Subscription expiration date
 * 3. Feature flag enabled state in PlanFeature
 * 4. Numeric usage limit vs current period usage
 */
export async function checkEntitlement(
  organizationId: string,
  featureKey: string,
  requiredQuantity = 1
): Promise<EntitlementCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  if (!subscription) {
    return {
      allowed: false,
      reason: "No active subscription found for this organization.",
    };
  }

  // Check status
  const now = new Date();
  if (subscription.status === "SUSPENDED" || subscription.status === "CANCELLED") {
    return {
      allowed: false,
      reason: `Subscription is ${subscription.status.toLowerCase()}. Access restricted.`,
    };
  }

  // Check expiration & grace period
  if (subscription.currentPeriodEnd < now) {
    if (subscription.gracePeriodEnd && subscription.gracePeriodEnd > now) {
      // In grace period - allowed with notice
    } else {
      // Expired beyond grace period
      return {
        allowed: false,
        reason: "Subscription has expired. Please renew your plan.",
      };
    }
  }

  // Find dynamic plan feature
  const feature = subscription.plan.features.find((f) => f.featureKey === featureKey);
  if (!feature) {
    return {
      allowed: false,
      reason: `Feature '${featureKey}' is not configured on your current plan (${subscription.plan.name}).`,
    };
  }

  if (!feature.isEnabled) {
    return {
      allowed: false,
      reason: `Feature '${feature.description || featureKey}' is not enabled on your plan. Upgrade to unlock.`,
    };
  }

  // If there is no numeric limit, feature is unlimited
  if (feature.limitValue === null || feature.limitValue === undefined) {
    return {
      allowed: true,
      limit: null,
    };
  }

  // Check current usage against metric
  const usage = await prisma.subscriptionUsage.findFirst({
    where: {
      organizationId,
      metricKey: featureKey,
      periodEnd: { gte: now },
    },
  });

  const currentCount = usage?.currentUsage || 0;

  if (currentCount + requiredQuantity > feature.limitValue) {
    return {
      allowed: false,
      reason: `Usage limit exceeded for ${feature.description || featureKey}. Current: ${currentCount}/${feature.limitValue}.`,
      limit: feature.limitValue,
      currentUsage: currentCount,
    };
  }

  return {
    allowed: true,
    limit: feature.limitValue,
    currentUsage: currentCount,
  };
}

/**
 * Increment usage metric for a tenant.
 */
export async function recordUsage(
  organizationId: string,
  metricKey: string,
  delta = 1
) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return prisma.subscriptionUsage.upsert({
    where: {
      organizationId_metricKey_periodStart: {
        organizationId,
        metricKey,
        periodStart,
      },
    },
    update: {
      currentUsage: { increment: delta },
    },
    create: {
      organizationId,
      metricKey,
      currentUsage: delta,
      periodStart,
      periodEnd,
    },
  });
}
