"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Users,
  Car,
  Calendar,
  MapPin,
  Search,
  Bell,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  Coins,
  ClipboardList,
  Package,
  CreditCard,
  HardHat,
  BarChart3,
  Truck,
  Activity,
  Warehouse,
  Network,
  Settings,
  Sparkles,
  FileText,
  Receipt,
} from "lucide-react";

export interface BentoDashboardStats {
  organization: {
    name: string;
    code: string;
    currency: string;
    planName: string;
    subscriptionStatus: string;
    aiEnabled?: boolean;
  };
  jobCards: {
    activeCount: number;
    pendingCount: number;
    readyForDeliveryCount?: number;
    inProgressCount: number;
    completedCount: number;
    totalCount: number;
    recent: Array<{
      id: string;
      jobNumber: string;
      registrationNumber: string;
      vehicleName: string;
      customerName: string;
      stage: string;
      priority: string;
      estimatedTotalCost: number;
    }>;
  };
  inventory: {
    totalPartsCount: number;
    totalUnitsInStock: number;
    lowStockCount: number;
    healthyStockCount: number;
    inventoryValuation: number;
    stockItems: Array<{
      id: string;
      sku: string;
      name: string;
      qoh: number;
      minStockLevel: number;
      reorderLevel: number;
      fillPercent: number;
      isLow: boolean;
    }>;
  };
  services: {
    totalServicesCount: number;
    categoriesCount: number;
    activeTasksCount: number;
    completedTasksCount: number;
    topServices: Array<{
      id: string;
      code: string;
      name: string;
      estimatedPrice: number;
      standardLaborHours: number;
    }>;
  };
  finance: {
    todayIncome?: number;
    totalRevenue: number;
    totalCollected: number;
    totalExpenses: number;
    netProfit: number;
    wipPipelineValue: number;
    outstandingReceivables: number;
    chartPoints: Array<{
      label: string;
      revenue: number;
      expense: number;
    }>;
  };
  customers: {
    totalCount: number;
    corporateCount: number;
    recent?: Array<{
      id: string;
      code: string;
      name: string;
      phone: string;
    }>;
  };
  vehicles: {
    totalCount: number;
    hybridEvCount: number;
    recent?: Array<{
      id: string;
      registrationNumber: string;
      name: string;
    }>;
  };
  technicians: {
    totalCount: number;
    activeTimersCount: number;
  };
  appointments: {
    upcomingCount: number;
    totalCount: number;
  };
  diagnostics: {
    sessionsCount: number;
    activeDtcCount: number;
    latestDtcCode: string | null;
  };
  pos: {
    counterSalesCount: number;
    registersCount: number;
  };
  suppliers: {
    activeCount: number;
  };
  purchases: {
    ordersCount: number;
    grnCount: number;
  };
  branches: {
    activeCount: number;
  };
  bays: {
    totalCount: number;
    availableCount: number;
    occupiedCount: number;
    items: Array<{
      id: string;
      code: string;
      name: string;
      status: string;
    }>;
  };
  invoices: {
    totalCount: number;
    finalizedCount: number;
  };
  reports: {
    auditLogsCount: number;
    journalEntriesCount: number;
  };
  aiInsights: {
    monitoredVehicles: number;
    criticalAlertsCount: number;
    bayUtilizationPct: number;
  };
}

interface BentoDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    isSuperAdmin: boolean;
    roles: string[];
    permissions: string[];
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    isMain: boolean;
  }>;
  activeBranchId: string | null;
  stats: BentoDashboardStats;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  SUPER_ADMIN: "Platform Super Admin",
  OWNER: "Workshop Owner",
  ADMIN: "Organization Admin",
  BRANCH_MANAGER: "Branch Manager",
  SERVICE_MANAGER: "Service Manager",
  SERVICE_ADVISOR: "Service Advisor",
  SENIOR_MECHANIC: "Senior Mechanic",
  JUNIOR_MECHANIC: "Technician",
  AUTO_ELECTRICIAN: "Auto Electrician",
  HYBRID_TECHNICIAN: "Hybrid Specialist",
  STORE_KEEPER: "Parts & Store Manager",
  CASHIER: "Cashier & Billing",
  ACCOUNTANT: "Accountant",
  QC_OFFICER: "Quality Control Officer",
};

export function BentoDashboard({
  user,
  branches,
  activeBranchId,
  stats,
}: BentoDashboardProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBranchSwitch = async (branchId: string) => {
    if (branchId === activeBranchId) return;
    setIsSwitchingBranch(true);
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
      setIsSwitchingBranch(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const activeBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0] || null;

  const firstName = user.name?.split(" ")[0] || "User";
  const rawRoleCode = user.isSuperAdmin
    ? "SUPER_ADMIN"
    : user.roles[0] || "OWNER";
  const roleDisplayName =
    ROLE_DISPLAY_NAMES[rawRoleCode] || rawRoleCode.replace(/_/g, " ");

  const hour = currentTime.getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(currentTime);

  // Real database values for the 4 Hero KPI cards
  const activeJobsCount = stats.jobCards.activeCount;
  const waitingForApprovalCount = stats.jobCards.pendingCount;
  const readyForDeliveryCount = stats.jobCards.readyForDeliveryCount ?? 0;
  const todayIncomeAmount =
    stats.finance.todayIncome ?? stats.finance.totalRevenue;
  const currencyCode = stats.organization.currency || "LKR";

  // Live notifications derived from real database state
  const liveNotifications = [
    ...(stats.jobCards.activeCount > 0
      ? [
          {
            id: "active-jobs",
            title: `${stats.jobCards.activeCount} Active Job Card${stats.jobCards.activeCount > 1 ? "s" : ""}`,
            desc:
              stats.jobCards.recent[0]
                ? `Latest: ${stats.jobCards.recent[0].jobNumber} (${stats.jobCards.recent[0].registrationNumber})`
                : "Workshop jobs currently in progress",
            href: "/dashboard/job-cards",
          },
        ]
      : []),
    ...(stats.diagnostics.activeDtcCount > 0
      ? [
          {
            id: "dtc-alerts",
            title: `${stats.diagnostics.activeDtcCount} Diagnostic Fault Alert${stats.diagnostics.activeDtcCount > 1 ? "s" : ""}`,
            desc: stats.diagnostics.latestDtcCode
              ? `Active OBD-II DTC: ${stats.diagnostics.latestDtcCode}`
              : "Pending diagnostic repair codes",
            href: "/dashboard/diagnostics",
          },
        ]
      : []),
    ...(stats.inventory.lowStockCount > 0
      ? [
          {
            id: "low-stock",
            title: `${stats.inventory.lowStockCount} Low Stock Part${stats.inventory.lowStockCount > 1 ? "s" : ""}`,
            desc: "Parts at or below minimum stock safety level",
            href: "/dashboard/inventory",
          },
        ]
      : []),
    ...(stats.appointments.upcomingCount > 0
      ? [
          {
            id: "appointments",
            title: `${stats.appointments.upcomingCount} Upcoming Appointment${stats.appointments.upcomingCount > 1 ? "s" : ""}`,
            desc: "Confirmed customer service bookings",
            href: "/dashboard/appointments",
          },
        ]
      : []),
  ];

  // Combine real database records + modules for the global search bar
  const searchableDatabaseItems = [
    ...stats.jobCards.recent.map((jc) => ({
      id: `jc-${jc.id}`,
      category: "Job Card",
      title: `${jc.jobNumber} — ${jc.registrationNumber}`,
      subtitle: `${jc.customerName} • ${jc.vehicleName}`,
      href: "/dashboard/job-cards",
    })),
    ...(stats.customers.recent || []).map((c) => ({
      id: `cust-${c.id}`,
      category: "Customer",
      title: c.name,
      subtitle: `${c.code} • ${c.phone}`,
      href: "/dashboard/customers",
    })),
    ...(stats.vehicles.recent || []).map((v) => ({
      id: `veh-${v.id}`,
      category: "Vehicle",
      title: v.registrationNumber,
      subtitle: v.name,
      href: "/dashboard/vehicles",
    })),
    {
      id: "mod-job-cards",
      category: "Module",
      title: "Job Cards",
      subtitle: `${stats.jobCards.totalCount} total job cards`,
      href: "/dashboard/job-cards",
    },
    {
      id: "mod-customers",
      category: "Module",
      title: "Customers & Vehicles",
      subtitle: `${stats.customers.totalCount} customers • ${stats.vehicles.totalCount} vehicles`,
      href: "/dashboard/customers",
    },
    {
      id: "mod-services",
      category: "Module",
      title: "Mechanical Services",
      subtitle: `${stats.services.totalServicesCount} active repair packages`,
      href: "/dashboard/services",
    },
    {
      id: "mod-inventory",
      category: "Module",
      title: "Spare Parts & Inventory",
      subtitle: `${stats.inventory.totalPartsCount} SKUs • ${stats.inventory.totalUnitsInStock} units in stock`,
      href: "/dashboard/inventory",
    },
    {
      id: "mod-billing",
      category: "Module",
      title: "Billing & Payments (POS)",
      subtitle: `${stats.invoices.totalCount} invoices`,
      href: "/dashboard/pos",
    },
    {
      id: "mod-appointments",
      category: "Module",
      title: "Appointments",
      subtitle: `${stats.appointments.upcomingCount} upcoming bookings`,
      href: "/dashboard/appointments",
    },
    {
      id: "mod-technicians",
      category: "Module",
      title: "Technicians",
      subtitle: `${stats.technicians.totalCount} active staff`,
      href: "/dashboard/employees",
    },
    {
      id: "mod-reports",
      category: "Module",
      title: "Reports & Analytics",
      subtitle: `${stats.reports.journalEntriesCount} ledger entries`,
      href: "/dashboard/reports",
    },
  ];

  const filteredSearchResults = searchQuery.trim()
    ? searchableDatabaseItems
        .filter(
          (item) =>
            item.title
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase()) ||
            item.subtitle
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase()) ||
            item.category
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase())
        )
        .slice(0, 8)
    : [];

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* =================================================================== */}
      {/* 1. TOP NAVIGATION HEADER                                            */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          {/* Left: Brand Logo + Branch Selector */}
          <div className="flex items-center gap-4 lg:gap-7 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group shrink-0"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white shadow-sm transition-transform group-hover:scale-105">
                <Car className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                  AUTOCARE <span className="text-[#0891B2]">PRO</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Automotive Service Center
                </span>
              </div>
            </Link>

            {/* Real Branch Switcher Pill */}
            {branches.length > 0 && (
              <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-100/90 hover:bg-slate-200/60 border border-slate-200/80 px-4 py-2 transition-colors">
                <MapPin className="h-4 w-4 text-slate-700 shrink-0" />
                <div className="relative flex items-center">
                  <select
                    aria-label="Current branch selector"
                    value={activeBranch?.id || ""}
                    disabled={isSwitchingBranch}
                    onChange={(e) => handleBranchSwitch(e.target.value)}
                    className="appearance-none bg-transparent pr-6 text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[210px] truncate"
                  >
                    {branches.map((b) => (
                      <option
                        key={b.id}
                        value={b.id}
                        className="bg-white text-slate-900"
                      >
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {isSwitchingBranch ? (
                    <RefreshCw className="pointer-events-none absolute right-0 h-3.5 w-3.5 animate-spin text-[#0891B2]" />
                  ) : (
                    <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center: Live Global Search Bar */}
          <div className="relative flex-1 max-w-md mx-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, customers, vehicles..."
                className="h-10 w-full rounded-full bg-slate-100/90 border border-slate-200/70 pl-10 pr-9 text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/15 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                {filteredSearchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      router.push(item.href);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0891B2]">
                          {item.category}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Online Status Pill, Notification Bell, User Profile */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* Online / Offline Indicator */}
            <div
              className={`hidden sm:inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                isOnline
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/70"
                  : "bg-amber-50 text-amber-700 border border-amber-200/70"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Bell className="h-5 w-5 stroke-[2]" />
                {liveNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {liveNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 px-1">
                    <span className="text-xs font-bold text-slate-800">
                      Workshop Activity & Alerts
                    </span>
                    <span className="text-[11px] font-semibold text-[#0891B2]">
                      Live
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {liveNotifications.length > 0 ? (
                      liveNotifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setShowNotifications(false)}
                          className="block rounded-xl bg-slate-50 hover:bg-slate-100 p-2.5 transition-colors"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {n.desc}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-slate-400">
                        All workshop systems operating normally.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logged-in User Profile */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-sm font-extrabold text-white shadow-xs">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-sm font-extrabold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 leading-tight">
                    {roleDisplayName}
                  </span>
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-slate-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-13 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                  <div className="border-b border-slate-100 pb-2.5 mb-2 px-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user.email}
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-[#0891B2]">
                      <ShieldCheck className="h-3 w-3" />
                      <span>
                        {stats.organization.name} ({roleDisplayName})
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/dashboard/accounting"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Receipt className="h-4 w-4 text-slate-500" />
                      <span>Accounting & Ledger</span>
                    </Link>
                    <Link
                      href="/dashboard/ai-bi"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-[#0891B2]" />
                      <span>AI Workshop Insights</span>
                    </Link>
                    <Link
                      href="/dashboard/subscription"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      <span>Organization & Subscription</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT CONTAINER                                              */}
      {/* =================================================================== */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-8 py-5 space-y-6">
        {/* ================================================================= */}
        {/* 2. HERO BANNER WITH REAL GREETING, DATE & 4 LIVE KPI CARDS        */}
        {/* ================================================================= */}
        <section className="relative rounded-[28px] overflow-hidden shadow-md border border-slate-200/60 bg-[#072136]">
          {/* Workshop Car Background Image + Gradient Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/workshop-hero-banner.jpg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061A2C]/95 via-[#082C46]/75 to-[#09324A]/35" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/65 to-transparent" />

          <div className="relative z-10 px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6">
            {/* Top Greeting + Live Date Pill */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-7">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  <span>
                    {greeting}, {firstName}!
                  </span>
                  <span className="inline-block">👋</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-200/95 font-medium mt-1">
                  Here&apos;s what&apos;s happening at your workshop today.
                </p>
              </div>

              {/* Current Date Pill */}
              <div className="inline-flex items-center gap-2.5 self-start rounded-2xl border border-white/25 bg-[#0A273D]/80 backdrop-blur-md px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm">
                <Calendar className="h-4 w-4 text-cyan-300 shrink-0" />
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* 4 Live Database KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Active Jobs */}
              <Link
                href="/dashboard/job-cards"
                className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F4FAFF] via-[#EFF8FF] to-[#DFF1FE] border border-sky-200/80 p-4 sm:p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-55"
                >
                  <path
                    d="M0 55 Q 75 25, 150 50 T 300 35 L 300 80 L 0 80 Z"
                    fill="#BAE6FD"
                  />
                </svg>
                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#E0F2FE] text-[#0284C7] shadow-2xs">
                    <Car className="h-7 w-7 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-700 truncate">
                      Active Jobs
                    </p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 mt-0.5">
                      {activeJobsCount}
                    </p>
                  </div>
                </div>
                <ChevronRight className="relative z-10 h-5 w-5 text-[#0284C7] shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* KPI 2: Waiting for Approval */}
              <Link
                href="/dashboard/job-cards"
                className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#FFFDF7] via-[#FEF9EC] to-[#FDEFD2] border border-amber-200/80 p-4 sm:p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-50"
                >
                  <path
                    d="M0 55 Q 75 25, 150 50 T 300 35 L 300 80 L 0 80 Z"
                    fill="#FDE68A"
                  />
                </svg>
                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706] shadow-2xs">
                    <Clock className="h-7 w-7 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-700 truncate">
                      Waiting for Approval
                    </p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 mt-0.5">
                      {waitingForApprovalCount}
                    </p>
                  </div>
                </div>
                <ChevronRight className="relative z-10 h-5 w-5 text-[#D97706] shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* KPI 3: Ready for Delivery */}
              <Link
                href="/dashboard/job-cards"
                className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F7FEF9] via-[#F0FDF4] to-[#DCFCE7] border border-emerald-200/80 p-4 sm:p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-55"
                >
                  <path
                    d="M0 55 Q 75 25, 150 50 T 300 35 L 300 80 L 0 80 Z"
                    fill="#BBF7D0"
                  />
                </svg>
                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A] shadow-2xs">
                    <CheckCircle2 className="h-7 w-7 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-700 truncate">
                      Ready for Delivery
                    </p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 mt-0.5">
                      {readyForDeliveryCount}
                    </p>
                  </div>
                </div>
                <ChevronRight className="relative z-10 h-5 w-5 text-[#16A34A] shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* KPI 4: Today's Income */}
              <Link
                href="/dashboard/invoices"
                className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#FCF9FF] via-[#F8F3FF] to-[#EDE4FF] border border-purple-200/80 p-4 sm:p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-55"
                >
                  <path
                    d="M0 55 Q 75 25, 150 50 T 300 35 L 300 80 L 0 80 Z"
                    fill="#E9D5FF"
                  />
                </svg>
                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED] shadow-2xs">
                    <Coins className="h-7 w-7 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-700 truncate">
                      Today&apos;s Income
                    </p>
                    <p className="text-xl sm:text-2xl xl:text-[26px] font-black tracking-tight text-slate-950 mt-0.5 truncate">
                      {currencyCode} {todayIncomeAmount.toLocaleString("en-LK")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="relative z-10 h-5 w-5 text-[#7C3AED] shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. 8 MAIN COLORFUL GRADIENT FEATURE CARDS (2 ROWS × 4 COLUMNS)    */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Job Cards */}
          <Link
            href="/dashboard/job-cards"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#1E40AF] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <ClipboardList className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Job Cards
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Create and manage vehicle repair jobs
              </p>
            </div>
            <div className="
              absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30
            ">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 2: Customers & Vehicles */}
          <Link
            href="/dashboard/customers"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#9333EA] via-[#7E22CE] to-[#5B21B6] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <Users className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Customers &amp; Vehicles
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Customer profiles and vehicle information
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 3: Mechanical Services */}
          <Link
            href="/dashboard/services"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F59E0B] via-[#EA580C] to-[#C2410C] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <Wrench className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Mechanical Services
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Manage repair packages, inspections and labor
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 4: Spare Parts & Inventory */}
          <Link
            href="/dashboard/inventory"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#10B981] via-[#059669] to-[#0F766E] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <Package className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Spare Parts &amp; Inventory
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Stock, parts and warehouse management
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 5: Billing & Payments */}
          <Link
            href="/dashboard/pos"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F43F5E] via-[#E11D48] to-[#9D174D] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <CreditCard className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Billing &amp; Payments
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Create invoices and record payments
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 6: Appointments */}
          <Link
            href="/dashboard/appointments"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0EA5E9] via-[#0284C7] to-[#1D4ED8] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <Calendar className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Appointments
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Manage service bookings and schedules
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 7: Technicians */}
          <Link
            href="/dashboard/employees"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#22C55E] via-[#16A34A] to-[#0D9488] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <HardHat className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Technicians
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                Assign jobs and track technician work
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 8: Reports */}
          <Link
            href="/dashboard/reports"
            className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#312E81] p-6 min-h-[158px] flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-20"
            >
              <path
                d="M0 80 Q 120 30, 240 70 T 400 40 L 400 120 L 0 120 Z"
                fill="#FFFFFF"
              />
            </svg>
            <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 border border-white/25 backdrop-blur-xs text-white shadow-inner">
              <BarChart3 className="h-8 w-8 stroke-[2]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0 pr-7">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Reports
              </h2>
              <p className="text-xs sm:text-[13px] font-medium text-white/90 leading-snug mt-1">
                View income, expenses and workshop performance
              </p>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform group-hover:translate-x-0.5 group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </Link>
        </section>

        {/* ================================================================= */}
        {/* 4. MORE TOOLS SECTION                                             */}
        {/* ================================================================= */}
        <section className="pt-1 pb-4">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-3.5">
            More Tools
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Tool 1: Suppliers & Purchases */}
            <Link
              href="/dashboard/purchasing/suppliers"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F0F7FF] to-[#E6F1FE] border border-sky-200/70 px-4 py-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#0284C7] shadow-2xs">
                  <Truck className="h-5 w-5 stroke-[2.1]" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  Suppliers &amp; Purchases
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#0284C7] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Tool 2: Diagnostics */}
            <Link
              href="/dashboard/diagnostics"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F6F3FF] to-[#EDE9FE] border border-purple-200/70 px-4 py-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#7C3AED] shadow-2xs">
                  <Activity className="h-5 w-5 stroke-[2.2]" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  Diagnostics
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#7C3AED] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Tool 3: Workshop Bays */}
            <Link
              href="/dashboard/bays"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#EEFAFF] to-[#E0F2FE] border border-cyan-200/70 px-4 py-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#0369A1] shadow-2xs">
                  <Warehouse className="h-5 w-5 stroke-[2.1]" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  Workshop Bays
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#0369A1] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Tool 4: Branches */}
            <Link
              href="/dashboard/branches"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] border border-emerald-200/70 px-4 py-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#16A34A] shadow-2xs">
                  <Network className="h-5 w-5 stroke-[2.1]" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  Branches
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#16A34A] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Tool 5: Settings */}
            <Link
              href="/dashboard/subscription"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#FFF1F2] to-[#FFE4E6] border border-rose-200/70 px-4 py-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#E11D48] shadow-2xs">
                  <Settings className="h-5 w-5 stroke-[2.1]" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  Settings
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#E11D48] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
