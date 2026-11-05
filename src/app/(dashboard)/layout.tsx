import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, getCurrentSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const branches = user.organization?.branches || [];
  const activeBranchId = session.branchId || branches[0]?.id || null;

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        organization: user.organization
          ? {
              name: user.organization.name,
              code: user.organization.code,
            }
          : null,
      }}
      branches={branches.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        isMain: b.isMain,
      }))}
      activeBranchId={activeBranchId}
    >
      {children}
    </DashboardShell>
  );
}
