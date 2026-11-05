"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  CreditCard,
  Users,
  Activity,
  Plus,
  Layers,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Wrench,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<"organizations" | "plans" | "audit">("organizations");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Business Form State
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgData, setNewOrgData] = useState({
    name: "",
    code: "",
    taxNumber: "",
    phone: "",
    email: "",
    address: "",
    city: "Colombo",
    planCode: "STANDARD",
    ownerEmail: "",
    ownerPassword: "Password@1234",
    ownerFirstName: "",
    ownerLastName: "",
  });
  const [orgError, setOrgError] = useState("");
  const [orgSuccess, setOrgSuccess] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, plansRes] = await Promise.all([
        fetch("/api/super-admin/organizations"),
        fetch("/api/super-admin/plans"),
      ]);

      const orgsData = await orgsRes.json();
      const plansData = await plansRes.json();

      if (orgsData.organizations) setOrganizations(orgsData.organizations);
      if (plansData.plans) setPlans(plansData.plans);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError("");
    setOrgSuccess("");
    try {
      const res = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrgData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create organization");

      setOrgSuccess(`Successfully created ${data.organization.name}! Initial credentials provisioned.`);
      setIsCreatingOrg(false);
      setNewOrgData({
        name: "",
        code: "",
        taxNumber: "",
        phone: "",
        email: "",
        address: "",
        city: "Colombo",
        planCode: "STANDARD",
        ownerEmail: "",
        ownerPassword: "Password@1234",
        ownerFirstName: "",
        ownerLastName: "",
      });
      fetchData();
    } catch (err: any) {
      setOrgError(err.message);
    }
  };

  const totalMRR = organizations.reduce((acc, org) => {
    const plan = org.subscription?.plan;
    if (plan && org.subscription?.status === "ACTIVE") {
      return acc + Number(plan.priceMonthly || 0);
    }
    return acc;
  }, 0);

  const totalBranches = organizations.reduce((acc, org) => acc + (org._count?.branches || 0), 0);
  const totalJobCards = organizations.reduce((acc, org) => acc + (org._count?.jobCards || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8 space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                SaaS Super Admin Portal
              </h1>
              <Badge variant="warning">GLOBAL CONTROL</Badge>
            </div>
            <p className="text-xs text-slate-400">
              AutoCare Pro Multi-Tenant Operating System • Dynamic Entitlements & Platform Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300">
              <Wrench className="h-4 w-4" />
              <span>Go to Workshop Terminal</span>
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsCreatingOrg(!isCreatingOrg)}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard Business</span>
          </Button>
        </div>
      </div>

      {/* Platform Metric KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Organizations</p>
              <h3 className="text-2xl font-black text-white">{organizations.length}</h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Isolated PostgreSQL Tenants
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly SaaS Run-Rate</p>
              <h3 className="text-2xl font-black text-amber-400">{formatCurrencyLKR(totalMRR)}</h3>
              <p className="text-[11px] text-slate-400">Recurring Subscription Value</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Branches</p>
              <h3 className="text-2xl font-black text-white">{totalBranches}</h3>
              <p className="text-[11px] text-blue-400">Across Sri Lanka</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workshop Job Cards</p>
              <h3 className="text-2xl font-black text-white">{totalJobCards}</h3>
              <p className="text-[11px] text-purple-400">14-Stage FSM Operations</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboard Business Modal / Drawer Form */}
      {isCreatingOrg && (
        <Card className="bg-slate-900 border-amber-500/40 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Onboard New Automotive Organization
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Provisions a multi-branch tenant, default warehouse, cash register, and owner account in an atomic transaction.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsCreatingOrg(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent>
            {orgError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {orgError}
              </div>
            )}
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Business Name"
                  placeholder="e.g. Lanka Hybrid Hub (Pvt) Ltd"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <Input
                  label="Tenant Code (Unique)"
                  placeholder="e.g. LHH-LK"
                  value={newOrgData.code}
                  onChange={(e) => setNewOrgData({ ...newOrgData, code: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <Input
                  label="Tax / VAT Number"
                  placeholder="e.g. VAT-88223344"
                  value={newOrgData.taxNumber}
                  onChange={(e) => setNewOrgData({ ...newOrgData, taxNumber: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <Input
                  label="Business Email"
                  type="email"
                  placeholder="info@hybridhub.lk"
                  value={newOrgData.email}
                  onChange={(e) => setNewOrgData({ ...newOrgData, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <Input
                  label="Business Phone"
                  placeholder="+94 11 200 3000"
                  value={newOrgData.phone}
                  onChange={(e) => setNewOrgData({ ...newOrgData, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                    Assigned Subscription Plan
                  </label>
                  <select
                    value={newOrgData.planCode}
                    onChange={(e) => setNewOrgData({ ...newOrgData, planCode: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({formatCurrencyLKR(p.priceMonthly)}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                  Initial Business Owner Account Provisioning
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    label="Owner First Name"
                    placeholder="e.g. Kasun"
                    value={newOrgData.ownerFirstName}
                    onChange={(e) => setNewOrgData({ ...newOrgData, ownerFirstName: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <Input
                    label="Owner Last Name"
                    placeholder="e.g. Perera"
                    value={newOrgData.ownerLastName}
                    onChange={(e) => setNewOrgData({ ...newOrgData, ownerLastName: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <Input
                    label="Owner Login Email"
                    type="email"
                    placeholder="kasun@hybridhub.lk"
                    value={newOrgData.ownerEmail}
                    onChange={(e) => setNewOrgData({ ...newOrgData, ownerEmail: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <Input
                    label="Owner Initial Password"
                    type="password"
                    placeholder="Password@1234"
                    value={newOrgData.ownerPassword}
                    onChange={(e) => setNewOrgData({ ...newOrgData, ownerPassword: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatingOrg(false)}>Cancel</Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                  Deploy Organization
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {orgSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-center justify-between">
          <span>{orgSuccess}</span>
          <button onClick={() => setOrgSuccess("")} className="text-emerald-300 font-bold">✕</button>
        </div>
      )}

      {/* Tabs Control */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab("organizations")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "organizations"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Organizations & Tenants ({organizations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "plans"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Dynamic Subscription Plans Engine ({plans.length})</span>
        </button>
      </div>

      {/* Tab 1: Organizations Table */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Organization</th>
                    <th className="px-6 py-4">Active Plan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Branches</th>
                    <th className="px-6 py-4 text-center">Users</th>
                    <th className="px-6 py-4 text-center">Job Cards</th>
                    <th className="px-6 py-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{org.name}</span>
                          <span className="text-xs text-blue-400 font-mono">{org.code} • {org.taxNumber || "No Tax ID"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info" className="font-mono">
                          {org.subscription?.plan?.name || "No Plan"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={org.status === "ACTIVE" ? "success" : "danger"}>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-white">
                        {org._count?.branches || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-white">
                        {org._count?.users || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-white">
                        {org._count?.jobCards || 0}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDateLK(org.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dynamic Subscription Plans Engine */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-blue-300">
            💡 <strong>Dynamic Database-Driven Entitlements:</strong> Feature checks, user limits, branch allocations, and AI limits are verified strictly server-side on every protected operation without hardcoded plan strings.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="bg-slate-900 border-slate-800 flex flex-col justify-between hover:border-amber-500/40 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={plan.code === "ENTERPRISE" ? "warning" : "default"}>
                      {plan.code}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      {plan._count?.subscriptions || 0} Tenants
                    </span>
                  </div>
                  <CardTitle className="text-xl text-white pt-2">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-xs line-clamp-2">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-3">
                    <span className="text-2xl font-black text-amber-400">
                      {formatCurrencyLKR(plan.priceMonthly)}
                    </span>
                    <span className="text-xs text-slate-400"> / month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 border-t border-slate-800 pt-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Configured Entitlements
                  </p>
                  <div className="space-y-2 text-xs">
                    {plan.features?.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-300">{f.description || f.featureKey}</span>
                        <span className="font-mono font-bold text-amber-300">
                          {f.isEnabled
                            ? f.limitValue === null
                              ? "Unlimited"
                              : f.limitValue
                            : "Disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
