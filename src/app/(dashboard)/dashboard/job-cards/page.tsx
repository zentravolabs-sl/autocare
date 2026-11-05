"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Car,
  Users,
  Clock,
  Wrench,
  Activity,
  Cpu,
  Building2,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Flame,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  // New Intake Modal State
  const [isIntaking, setIsIntaking] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    customerId: "",
    vehicleId: "",
    bayId: "",
    currentMileage: 0,
    fuelLevel: "1/2",
    priority: "NORMAL",
    customerComplaints: "",
    conditionNotes: "",
    initialServiceId: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (stageFilter !== "ALL") params.set("stage", stageFilter);

      const [jcRes, custRes, vehRes, brRes, srvRes] = await Promise.all([
        fetch(`/api/job-cards?${params.toString()}`),
        fetch("/api/customers?limit=100"),
        fetch("/api/vehicles?limit=100"),
        fetch("/api/branches"),
        fetch("/api/services"),
      ]);

      const jcData = await jcRes.json();
      const custData = await custRes.json();
      const vehData = await vehRes.json();
      const brData = await brRes.json();
      const srvData = await srvRes.json();

      if (jcData.jobCards) setJobCards(jcData.jobCards);
      if (custData.customers) setCustomers(custData.customers);
      if (vehData.vehicles) setVehicles(vehData.vehicles);
      if (brData.branches) {
        setBranches(brData.branches);
        if (!formData.branchId && brData.branches.length > 0) {
          setFormData((prev) => ({ ...prev, branchId: brData.branches[0].id }));
        }
      }
      if (srvData.services) setServices(srvData.services);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stageFilter]);

  // When vehicle selected, auto-select customer and auto-populate mileage
  const handleVehicleSelect = (vehicleId: string) => {
    const selectedVeh = vehicles.find((v) => v.id === vehicleId);
    if (selectedVeh) {
      setFormData((prev) => ({
        ...prev,
        vehicleId,
        customerId: selectedVeh.customerId || prev.customerId,
        currentMileage: selectedVeh.mileage || 0,
      }));
    } else {
      setFormData((prev) => ({ ...prev, vehicleId }));
    }
  };

  const handleCreateJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      const initialServicesList = [];
      if (formData.initialServiceId) {
        const srv = services.find((s) => s.id === formData.initialServiceId);
        if (srv) {
          initialServicesList.push({
            serviceId: srv.id,
            name: srv.name,
            description: srv.description,
            estimatedHours: Number(srv.standardLaborHours),
            hourlyRate: Number(srv.laborRate),
          });
        }
      }

      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          currentMileage: parseInt(formData.currentMileage.toString(), 10) || 0,
          initialServices: initialServicesList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to intake job card");

      setFormSuccess(`Job Card ${data.jobCard.jobNumber} successfully created! Stage set to VEHICLE RECEPTION.`);
      setIsIntaking(false);
      setFormData({
        branchId: branches[0]?.id || "",
        customerId: "",
        vehicleId: "",
        bayId: "",
        currentMileage: 0,
        fuelLevel: "1/2",
        priority: "NORMAL",
        customerComplaints: "",
        conditionNotes: "",
        initialServiceId: "",
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> Workshop Job Card Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            End-to-end 14-stage finite state workflow with live lift assignment and technician timers
          </p>
        </div>

        <Button
          onClick={() => setIsIntaking(!isIntaking)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Intake Vehicle (New Job Card)</span>
        </Button>
      </div>

      {formSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{formSuccess}</span>
          <button onClick={() => setFormSuccess("")} className="font-bold">✕</button>
        </div>
      )}

      {/* New Job Card Intake Drawer / Modal */}
      {isIntaking && (
        <Card className="border-blue-500/40 bg-white dark:bg-slate-900 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Vehicle Reception & Workshop Intake
                </CardTitle>
                <CardDescription className="text-xs">
                  Stage 1: Vehicle Reception. Records intake mileage, fuel gauge, customer complaints, and bay allocation.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsIntaking(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateJobCard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Branch */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Workshop Branch *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Selection */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Vehicle (License Plate) *
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 font-mono font-bold"
                  >
                    <option value="">-- Select Registered Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} • {v.make} {v.model} ({v.customer.firstName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Selection */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Account *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} • {c.type === "CORPORATE" && c.companyName ? c.companyName : `${c.firstName} ${c.lastName || ""}`}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Odometer Mileage at Reception (km) *"
                  type="number"
                  placeholder="e.g. 68450"
                  value={formData.currentMileage}
                  onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value, 10) || 0 })}
                  required
                />

                {/* Fuel Level */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fuel Gauge Level *
                  </label>
                  <select
                    value={formData.fuelLevel}
                    onChange={(e) => setFormData({ ...formData, fuelLevel: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="EMPTY">E - Empty</option>
                    <option value="1/4">1/4 Tank</option>
                    <option value="1/2">1/2 Tank</option>
                    <option value="3/4">3/4 Tank</option>
                    <option value="FULL">F - Full Tank</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Job Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent / Express</option>
                  </select>
                </div>

                {/* Initial Service Package */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Initial Service Package (Optional)
                  </label>
                  <select
                    value={formData.initialServiceId}
                    onChange={(e) => setFormData({ ...formData, initialServiceId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">-- None / Custom Repair --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} • {s.name} ({formatCurrencyLKR(s.estimatedPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Complaints */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Stated Complaints & Symptoms *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Engine check light flashing on acceleration. Rattling sound from front suspension over bumps."
                    value={formData.customerComplaints}
                    onChange={(e) => setFormData({ ...formData, customerComplaints: e.target.value })}
                    required
                    className="flex w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsIntaking(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Intake & Generate Job Card
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 14-Stage Workflow Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 scrollbar-none">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {[
          { key: "ALL", label: "All Stages" },
          { key: "VEHICLE_RECEPTION", label: "1. Reception" },
          { key: "INITIAL_INSPECTION", label: "2. Inspection" },
          { key: "DIAGNOSTIC_INSPECTION", label: "4. Diagnostics" },
          { key: "ESTIMATE_CREATION", label: "5. Estimate" },
          { key: "CUSTOMER_APPROVAL", label: "6. Approved" },
          { key: "REPAIR_IN_PROGRESS", label: "9. In Progress" },
          { key: "QUALITY_INSPECTION", label: "10. QC" },
          { key: "FINAL_INVOICE", label: "11. Ready to Bill" },
          { key: "CLOSED", label: "14. Closed" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStageFilter(s.key)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
              stageFilter === s.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Job Cards Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Job Card #</th>
                  <th className="px-6 py-3.5">Vehicle / Plate</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Workflow Stage</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Branch / Bay</th>
                  <th className="px-6 py-3.5 text-right">Job Cost</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      Loading workshop job cards...
                    </td>
                  </tr>
                ) : jobCards.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No job cards found. Click "Intake Vehicle" to create one.
                    </td>
                  </tr>
                ) : (
                  jobCards.map((jc) => (
                    <tr key={jc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/job-cards/${jc.id}`}
                          className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 hover:underline block"
                        >
                          {jc.jobNumber}
                        </Link>
                        <span className="text-[10px] text-slate-400">{formatDateLK(jc.receivedAt)}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/vehicles/${jc.vehicle.id}`}
                            className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 block"
                          >
                            {jc.vehicle.registrationNumber}
                          </Link>
                          <span className="text-[11px] text-slate-500">
                            {jc.vehicle.make} {jc.vehicle.model}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/customers/${jc.customer.id}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:underline block"
                          >
                            {jc.customer.type === "CORPORATE" && jc.customer.companyName
                              ? jc.customer.companyName
                              : `${jc.customer.firstName} ${jc.customer.lastName || ""}`}
                          </Link>
                          <span className="text-[10px] text-slate-400">{jc.customer.phone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            jc.stage === "REPAIR_IN_PROGRESS"
                              ? "info"
                              : jc.stage === "CLOSED"
                              ? "success"
                              : jc.stage === "CUSTOMER_APPROVAL"
                              ? "warning"
                              : "default"
                          }
                          className="font-mono text-[10px]"
                        >
                          {jc.stage.replace(/_/g, " ")}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            jc.priority === "URGENT" || jc.priority === "HIGH"
                              ? "danger"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {jc.priority}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <span className="block font-medium text-slate-800 dark:text-slate-200">{jc.branch.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {jc.bay?.name || "No Bay Assigned"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrencyLKR(jc.actualTotalCost || jc.estimatedTotalCost)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/job-cards/${jc.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 font-semibold">
                            <span>Open Terminal</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
