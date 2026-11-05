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
  LogOut,
  Sliders,
  DollarSign,
  Activity,
  Cpu,
  UserCheck,
  WifiOff,
  ShoppingBag,
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

  const navGroups = [
    {
      title: "CORE WORKSHOP",
      items: [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Job Cards", href: "/dashboard/job-cards", icon: ClipboardList, badge: "Live" },
        { name: "AI Health & BI", href: "/dashboard/ai-bi", icon: Sparkles, badge: "AI" },
        { name: "Workshop Bays", href: "/dashboard/bays", icon: Building2, badge: "Lifts" },
        { name: "Services Master", href: "/dashboard/services", icon: Wrench },
        { name: "Technician Floor", href: "/technician", icon: Cpu, badge: "Mobile" },
      ],
    },
    {
      title: "FLEET & CLIENTS",
      items: [
        { name: "Customers Vault", href: "/dashboard/customers", icon: Users },
        { name: "Vehicle Profiles", href: "/dashboard/vehicles", icon: Car },
        { name: "Service Bookings", href: "/dashboard/appointments", icon: Calendar, badge: "Slots" },
        { name: "Technicians & HR", href: "/dashboard/employees", icon: UserCheck },
        { name: "Client Tracker", href: "/portal", icon: Sparkles, badge: "Public" },
      ],
    },
    {
      title: "INVENTORY & STOCK",
      items: [
        { name: "Spare Parts Master", href: "/dashboard/inventory", icon: Package },
        { name: "Stock Ledger Audit", href: "/dashboard/inventory/movements", icon: Layers },
        { name: "Branch Transfers", href: "/dashboard/inventory/transfers", icon: Sliders },
      ],
    },
    {
      title: "PURCHASING & SUPPLY",
      items: [
        { name: "Suppliers Directory", href: "/dashboard/purchasing/suppliers", icon: Building2 },
        { name: "Purchase Orders", href: "/dashboard/purchasing/orders", icon: FileText },
        { name: "Goods Receipts (GRN)", href: "/dashboard/purchasing/grn", icon: ShoppingBag },
      ],
    },
    {
      title: "BILLING & ASSURANCE",
      items: [
        { name: "POS Checkout", href: "/dashboard/pos", icon: DollarSign, badge: "Counter" },
        { name: "Tax Invoices", href: "/dashboard/invoices", icon: FileText },
        { name: "General Ledger & P&L", href: "/dashboard/accounting", icon: Activity },
        { name: "Warranties & Claims", href: "/dashboard/warranties", icon: ShieldCheck },
      ],
    },
    {
      title: "ENTERPRISE & SETTINGS",
      items: [
        { name: "Branches & Stores", href: "/dashboard/branches", icon: Building2 },
        { name: "Subscription & Limits", href: "/dashboard/subscription", icon: CreditCard },
        { name: "Security Audit Trail", href: "/dashboard/audit-logs", icon: ShieldCheck, badge: "Logs" },
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
        "flex flex-col border-r border-slate-800 bg-[#0B132B] text-slate-300 transition-all duration-300 select-none z-30 shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80 bg-[#080E20]">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
            <Wrench className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-base tracking-tight leading-tight">
                AUTOCARE <span className="text-blue-400">PRO</span>
              </span>
              <span className="text-[10px] text-blue-300 font-mono tracking-widest uppercase">
                {user?.organization?.code || "ENTERPRISE"}
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
                SaaS Platform Super Admin
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
              {!isCollapsed && <span>SaaS Admin Portal</span>}
            </Link>
          </div>
        )}

        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="border-t border-slate-800 bg-[#080E20] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400 font-bold border border-blue-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">{user?.name || "Staff User"}</span>
                <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
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
