import React from "react";
import { CreditCard, Check, AlertCircle, Sparkles, Shield, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";


export default async function SubscriptionPage() {
  const { organizationId } = await getTenantContext();

  const [org, allPlans, branchCount, userCount, jobCardCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: {
            plan: {
              include: { features: true },
            },
          },
        },
      },
    }),
    prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { features: true },
    }),
    prisma.branch.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
    prisma.jobCard.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const currentSub = org?.subscription;
  const currentPlan = currentSub?.plan;

  // Extract limits
  const branchFeature = currentPlan?.features.find((f) => f.featureKey === "maxBranches");
  const userFeature = currentPlan?.features.find((f) => f.featureKey === "maxUsers");
  const jobFeature = currentPlan?.features.find((f) => f.featureKey === "maxJobCardsPerMonth");

  return (
    <div className="space-y-8 font-sans">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" /> Subscription & Dynamic Entitlements
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Transparent, database-driven tier limits and server-enforced quotas
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-[#0B132B] to-[#1C2541] text-white border-blue-500/30 shadow-xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-300 uppercase">
                  ACTIVE SUBSCRIPTION
                </span>
                <Badge variant="success" className="font-mono">
                  {currentSub?.status || "ACTIVE"}
                </Badge>
              </div>
              <h2 className="text-3xl font-black text-white">{currentPlan?.name || "Standard Plan"}</h2>
              <p className="text-xs text-slate-300 max-w-lg">
                {currentPlan?.description}
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
              <span className="text-xs text-slate-400 block">Investment</span>
              <span className="text-3xl font-black text-blue-400">
                {formatCurrencyLKR(currentPlan?.priceMonthly)}
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                billed {currentSub?.billingCycle.toLowerCase()} • Renews {formatDateLK(currentSub?.currentPeriodEnd)}
              </span>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {/* Branches Usage */}
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Branch Locations</span>
                <span className="font-mono font-bold text-white">
                  {branchCount} / {branchFeature?.limitValue ?? "∞"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: branchFeature?.limitValue
                      ? `${Math.min(100, (branchCount / branchFeature.limitValue) * 100)}%`
                      : "25%",
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Server-enforced limit on branch creation
              </span>
            </div>

            {/* Users Usage */}
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Staff Accounts</span>
                <span className="font-mono font-bold text-white">
                  {userCount} / {userFeature?.limitValue ?? "∞"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: userFeature?.limitValue
                      ? `${Math.min(100, (userCount / userFeature.limitValue) * 100)}%`
                      : "20%",
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Advisors, Mechanics, Cashiers & Managers
              </span>
            </div>

            {/* Job Cards Usage */}
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Job Cards (This Month)</span>
                <span className="font-mono font-bold text-white">
                  {jobCardCount} / {jobFeature?.limitValue ?? "∞"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: jobFeature?.limitValue
                      ? `${Math.min(100, (jobCardCount / jobFeature.limitValue) * 100)}%`
                      : "15%",
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Resets monthly on 1st of each month
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans Selector */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Available Tier Upgrades
          </h3>
          <p className="text-xs text-slate-500">
            Scale your automotive franchise as your service volume and bays expand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((p) => {
            const isCurrent = p.id === currentPlan?.id;
            return (
              <Card
                key={p.id}
                className={`flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-2 border-blue-600 shadow-md ring-1 ring-blue-600/30"
                    : "hover:border-slate-400 dark:hover:border-slate-700"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={isCurrent ? "info" : "outline"}>{p.code}</Badge>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-600 uppercase">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg pt-2">{p.name}</CardTitle>
                  <div className="pt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {formatCurrencyLKR(p.priceMonthly)}
                    </span>
                    <span className="text-xs text-slate-500"> / mo</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {p.features.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {f.description}:{" "}
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {f.isEnabled ? (f.limitValue === null ? "Unlimited" : f.limitValue) : "Disabled"}
                        </strong>
                      </span>
                    </div>
                  ))}
                  <div className="pt-4">
                    <Button
                      variant={isCurrent ? "secondary" : "primary"}
                      disabled={isCurrent}
                      className="w-full text-xs font-semibold"
                    >
                      {isCurrent ? "Active Tier" : "Switch to Tier"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
