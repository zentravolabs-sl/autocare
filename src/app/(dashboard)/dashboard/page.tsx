import React from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  Car,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  PlusCircle,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";


export default async function DashboardPage() {
  const { organizationId, branchId } = await getTenantContext();

  // Query real tenant statistics from PostgreSQL
  const [
    org,
    activeJobsCount,
    pendingEstimatesCount,
    totalVehiclesCount,
    workshopBays,
    recentJobCards,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    }),
    prisma.jobCard.count({
      where: {
        organizationId,
        stage: { notIn: ["CLOSED", "CANCELLED"] },
      },
    }),
    prisma.jobCard.count({
      where: {
        organizationId,
        stage: "CUSTOMER_APPROVAL",
      },
    }),
    prisma.vehicle.count({
      where: { organizationId },
    }),
    prisma.workshopBay.findMany({
      where: { organizationId },
      take: 5,
    }),
    prisma.jobCard.findMany({
      where: { organizationId },
      include: {
        customer: true,
        vehicle: true,
        bay: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#2563EB] p-6 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-blue-300">
              {org?.name || "Apex Auto Care"} • {org?.currency || "LKR"} Workspace
            </span>
            <Badge variant="info" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
              {org?.subscription?.plan?.name || "Standard Plan"}
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Workshop Operating Console
          </h1>
          <p className="text-xs lg:text-sm text-slate-300">
            Real-time mechanical workflow, live lift allocations, and technician tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/pos">
            <Button variant="secondary" size="sm" className="gap-2 bg-slate-900/80 text-white hover:bg-slate-800">
              <ShoppingBag className="h-4 w-4" />
              <span>POS Billing</span>
            </Button>
          </Link>
          <Link href="/dashboard/job-cards">
            <Button size="sm" className="gap-2 bg-blue-500 hover:bg-blue-600 font-bold shadow-md shadow-blue-500/30">
              <PlusCircle className="h-4 w-4" />
              <span>Intake New Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Jobs in Bay</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeJobsCount}</h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3" /> Live In-Progress
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingEstimatesCount}</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" /> Awaiting Customer Sign-off
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fleet Vehicles Vault</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalVehiclesCount}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <Car className="h-3 w-3" /> Registered with History
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Car className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workshop Bays</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{workshopBays.length}</h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-medium">
                <Building2 className="h-3 w-3" /> Lifts & Diagnostic Pits
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Workshop Bays Overview & Recent Job Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Active Job Cards */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Active Workshop Job Cards</CardTitle>
                <CardDescription className="text-xs">
                  Latest vehicle intakes and progress through the 14-stage workflow
                </CardDescription>
              </div>
              <Link href="/dashboard/job-cards">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1">
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentJobCards.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No job cards created yet. Click "Intake New Job" to begin.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentJobCards.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg px-2 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {job.jobNumber}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {job.vehicle.registrationNumber}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({job.vehicle.make} {job.vehicle.model})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Client: <span className="font-medium text-slate-700 dark:text-slate-300">{job.customer.firstName} {job.customer.lastName || ""}</span> • Bay: {job.bay?.name || "Unassigned"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant={
                            job.stage === "REPAIR_IN_PROGRESS"
                              ? "info"
                              : job.stage === "CLOSED"
                              ? "success"
                              : "warning"
                          }
                          className="font-mono text-[10px]"
                        >
                          {job.stage.replace(/_/g, " ")}
                        </Badge>
                        <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                          {formatCurrencyLKR(job.estimatedTotalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Workshop Bay Statuses */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Workshop Bay Live Allocations
              </CardTitle>
              <CardDescription className="text-xs">
                Physical hoist, lift, and computerized alignment stations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {workshopBays.map((bay) => (
                  <div
                    key={bay.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {bay.code}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {bay.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {bay.bayType}
                      </span>
                    </div>

                    <Badge
                      variant={bay.status === "AVAILABLE" ? "success" : "danger"}
                      className="text-[10px]"
                    >
                      {bay.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
