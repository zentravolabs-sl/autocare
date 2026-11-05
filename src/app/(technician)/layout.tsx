import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { OfflineSyncStatusBanner } from "@/components/offline/offline-sync-banner";

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      <OfflineSyncStatusBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
