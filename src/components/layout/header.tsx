"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Wifi,
  WifiOff,
  Building2,
  ChevronDown,
  PlusCircle,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: any;
  branches: Array<{ id: string; code: string; name: string; isMain: boolean }>;
  activeBranchId: string | null;
}

export function Header({ user, branches, activeBranchId }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleBranchSwitch = async (branchId: string) => {
    if (branchId === activeBranchId) return;
    setIsSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to switch branch:", e);
    } finally {
      setIsSwitching(false);
    }
  };

  const activeBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 transition-all">
      {/* Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-500/50 hover:text-cyan-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors shrink-0"
          title="Return to Bento Home Dashboard"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-cyan-500" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Job Card #, Vehicle Plate (e.g. CAB-1234), Customer..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Sync / Connectivity Status Indicator */}
        <div className="flex items-center">
          {isOnline ? (
            <Badge variant="success" className="gap-1.5 py-1 px-2.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="h-3 w-3" />
              <span>ONLINE</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 py-1 px-2.5">
              <WifiOff className="h-3 w-3" />
              <span>OFFLINE SYNC READY</span>
            </Badge>
          )}
        </div>

        {/* Branch Switcher Dropdown */}
        {branches && branches.length > 0 && (
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <select
                value={activeBranch?.id || ""}
                disabled={isSwitching}
                onChange={(e) => handleBranchSwitch(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {isSwitching && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Link href="/dashboard/job-cards">
          <Button size="sm" className="gap-1.5 font-semibold shadow-sm">
            <PlusCircle className="h-4 w-4" />
            <span>New Job Card</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
