import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifySessionToken, SessionPayload } from "./jwt";

export const SESSION_COOKIE_NAME = "autocare_session_token";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getAuthenticatedUser() {
  const session = await getCurrentSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      organization: {
        include: {
          branches: {
            where: { status: "ACTIVE" },
          },
          subscription: {
            include: {
              plan: {
                include: {
                  features: true,
                },
              },
            },
          },
        },
      },
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      userBranches: {
        include: {
          branch: true,
        },
      },
    },
  });

  return user;
}
