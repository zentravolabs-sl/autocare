import { getCurrentSession } from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Ensures user is authenticated. Returns the verified session.
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError("You must be logged in to perform this action.");
  }
  return session;
}

/**
 * Ensures user is a platform Super Admin.
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!session.isSuperAdmin) {
    throw new ForbiddenError("Super Admin access required.");
  }
  return session;
}

/**
 * Checks if the session has any of the specified permissions or roles.
 */
export function hasPermission(
  session: { isSuperAdmin: boolean; permissions: string[]; roles: string[] },
  permission: string
): boolean {
  if (session.isSuperAdmin) return true;
  if (session.roles.includes("OWNER") || session.roles.includes("ADMIN")) return true;
  return session.permissions.includes(permission);
}

/**
 * Enforces a required permission server-side.
 */
export async function requirePermission(permission: string) {
  const session = await requireAuth();
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
  return session;
}

/**
 * Enforces that the user has a specific role.
 */
export async function requireRole(roleCode: string) {
  const session = await requireAuth();
  if (session.isSuperAdmin) return session;
  if (!session.roles.includes(roleCode)) {
    throw new ForbiddenError(`Missing required role: ${roleCode}`);
  }
  return session;
}
