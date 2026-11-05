import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, getCurrentSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { OfflineSyncStatusBanner } from "@/components/offline/offline-sync-banner";

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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      <Sidebar
        user={{
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
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={{
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
          }}
          branches={branches.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            isMain: b.isMain,
          }))}
          activeBranchId={activeBranchId}
        />
        <OfflineSyncStatusBanner />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {children}
        </main>
      </div>
    </div>
  );
}
