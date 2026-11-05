import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.AUTH_SECRET || "autocare-pro-super-secret-jwt-key-sri-lanka-enterprise-2026";
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  organizationId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  name: string;
  [key: string]: any;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}
