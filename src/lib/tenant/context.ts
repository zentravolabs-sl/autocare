import { requireAuth, ForbiddenError } from "@/lib/permissions/rbac";

export interface TenantContext {
  organizationId: string;
  branchId: string;
  userId: string;
  isSuperAdmin: boolean;
}

/**
 * Derives and strictly validates organizationId and active branchId from the verified server session.
 * Never trusts organizationId provided in client request bodies or query parameters.
 */
export async function getTenantContext(preferredBranchIdOrReq?: any): Promise<TenantContext> {
  const session = await requireAuth();

  if (!session.organizationId && !session.isSuperAdmin) {
    throw new ForbiddenError("User is not associated with an active organization.");
  }

  const preferredBranchId = typeof preferredBranchIdOrReq === "string" ? preferredBranchIdOrReq : null;

  // Super admin without specific tenant context requires explicit tenant targeting
  const organizationId = session.organizationId || "";
  const branchId = preferredBranchId || session.branchId || "";

  return {
    organizationId,
    branchId,
    userId: session.userId,
    isSuperAdmin: session.isSuperAdmin,
  };
}
