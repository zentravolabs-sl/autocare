"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Car,
  Users,
  Package,
  Layers,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  BarChart3,
  Cpu,
  UserCheck,
  Truck,
  ShoppingCart,
  Settings,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    isSuperAdmin?: boolean;
    organization?: { name: string; code: string } | null;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mainNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Job Cards", href: "/dashboard/job-cards", icon: ClipboardList },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Vehicles", href: "/dashboard/vehicles", icon: Car },
    { name: "Mechanical Services", href: "/dashboard/services", icon: Wrench },
    { name: "Spare Parts & Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Billing & Payments", href: "/dashboard/pos", icon: CreditCard },
    { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
    { name: "Technicians", href: "/dashboard/employees", icon: UserCheck },
    { name: "Reports & Accounting", href: "/dashboard/accounting", icon: BarChart3 },
  ];

  const moreToolsItems = [
    { name: "Suppliers", href: "/dashboard/purchasing/suppliers", icon: Truck },
    { name: "Purchases", href: "/dashboard/purchasing/orders", icon: ShoppingCart },
    { name: "Workshop Bays", href: "/dashboard/bays", icon: Layers },
    { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
    { name: "Branch Management", href: "/dashboard/branches", icon: Building2 },
    { name: "Settings & Plan", href: "/dashboard/subscription", icon: Settings },
  ];

  const advancedGroups = [
    {
      title: "Business & Workshop",
      items: [
        { name: "Diagnostics", href: "/dashboard/diagnostics", icon: Sliders },
        { name: "AI Insights", href: "/dashboard/ai-bi", icon: Sparkles },
        { name: "Warranty Claims", href: "/dashboard/warranties", icon: ShieldCheck },
        { name: "Technician Jobs", href: "/technician", icon: Cpu },
        { name: "Stock Movements", href: "/dashboard/inventory/movements", icon: Layers },
        { name: "Audit Logs", href: "/dashboard/audit-logs", icon: ShieldCheck },
      ],
    },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-800 bg-[#0F172A] text-slate-300 transition-all duration-300 select-none z-30 shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80 bg-[#0B1120]">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-base tracking-tight leading-tight">
                AutoCare <span className="text-teal-400">Pro</span>
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {user?.organization?.name || "Service Center"}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {user?.isSuperAdmin && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Platform Admin
              </p>
            )}
            <Link
              href="/super-admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                pathname.startsWith("/super-admin")
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200"
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
              {!isCollapsed && <span>Super Admin Portal</span>}
            </Link>
          </div>
        )}

        {/* Main 8 Modules */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Main Modules
            </p>
          )}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* More Tools */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              More Tools
            </p>
          )}
          {moreToolsItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Collapsible Advanced Section */}
        {!isCollapsed && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span>Advanced Tools</span>
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showAdvanced &&
              advancedGroups.map((group, idx) => (
                <div key={idx} className="space-y-1 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all group",
                          isActive
                            ? "bg-teal-600 text-white font-semibold"
                            : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="border-t border-slate-800 bg-[#0B1120] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 text-teal-400 font-bold border border-teal-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.name || "Staff User"}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.email}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
