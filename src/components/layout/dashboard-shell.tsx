"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { OfflineSyncStatusBanner } from "@/components/offline/offline-sync-banner";

interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    isSuperAdmin?: boolean;
    organization?: {
      name: string;
      code: string;
    } | null;
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    isMain: boolean;
  }>;
  activeBranchId: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  branches,
  activeBranchId,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const isBentoHome = pathname === "/dashboard" || pathname === "/dashboard/";

  if (isBentoHome) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-cyan-500/20 selection:text-slate-900">
        <OfflineSyncStatusBanner />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          organization: user.organization || null,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
          }}
          branches={branches}
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

