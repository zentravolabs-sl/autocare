"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Clock,
  Car,
  Users,
  Building2,
  Calendar,
  Fuel,
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Check,
  Plus,
  ShieldCheck,
  FileText,
  DollarSign,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";
import { ORDERED_STAGES } from "@/lib/workflow/job-card-fsm";

export default function JobCardTerminalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [jobCard, setJobCard] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "inspection" | "diagnostics" | "estimates" | "parts">("tasks");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGenerateInvoice = async () => {
    setActionMessage(null);
    setIsGeneratingInvoice(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCardId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate tax invoice");

      setActionMessage({ type: "success", text: `Invoice ${data.invoice.invoiceNumber} created!` });
      router.push(`/dashboard/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Forms State
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskHours, setNewTaskHours] = useState(1.0);
  const [newTaskRate, setNewTaskRate] = useState(4500);

  // Inspection Checklist Form State
  const [inspOverallNotes, setInspOverallNotes] = useState("");
  const [inspItems, setInspItems] = useState([
    { category: "Engine", itemName: "Engine Oil Level & Viscosity", condition: "GOOD", notes: "" },
    { category: "Engine", itemName: "Coolant Level & Radiator Leaks", condition: "GOOD", notes: "" },
    { category: "Brakes", itemName: "Front Brake Pads Thickness", condition: "ATTENTION", notes: "3mm remaining" },
    { category: "Brakes", itemName: "Brake Fluid Moisture Level", condition: "GOOD", notes: "" },
    { category: "Suspension", itemName: "Front Shock Absorbers & Bushes", condition: "GOOD", notes: "" },
    { category: "Tyres", itemName: "Tread Depth & Pressure (4 Wheels)", condition: "GOOD", notes: "" },
    { category: "Battery", itemName: "12V Auxiliary / High Voltage Pack", condition: "NEEDS_REPAIR", notes: "Cell block delta voltage alert" },
  ]);

  // Diagnostic Session Form State
  const [dtcCode, setDtcCode] = useState("P0A80");
  const [dtcSeverity, setDtcSeverity] = useState("CRITICAL");
  const [dtcDescription, setDtcDescription] = useState("Replace Hybrid Battery Pack / Block 14 Weak");
  const [dtcAction, setDtcAction] = useState("Recondition HV battery modules and clean dust filters");

  // Estimate Form State
  const [estLabor, setEstLabor] = useState(15000);
  const [estParts, setEstParts] = useState(24500);
  const [estDiscount, setEstDiscount] = useState(1000);

  // Inventory Part Requisition State
  const [invParts, setInvParts] = useState<any[]>([]);
  const [invWarehouses, setInvWarehouses] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);

  const fetchJobCard = async () => {
    setIsLoading(true);
    try {
      const [jcRes, srvRes, partsRes, whRes] = await Promise.all([
        fetch(`/api/job-cards/${id}`),
        fetch("/api/services"),
        fetch("/api/inventory/parts?limit=100"),
        fetch("/api/inventory/warehouses"),
      ]);
      const jcData = await jcRes.json();
      const srvData = await srvRes.json();
      const partsData = await partsRes.json();
      const whData = await whRes.json();

      if (jcData.jobCard) setJobCard(jcData.jobCard);
      if (srvData.services) setServices(srvData.services);
      if (partsData.parts) setInvParts(partsData.parts);
      if (whData.warehouses) {
        setInvWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(whData.warehouses[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCard();
  }, [id]);

  // Stage Advance
  const handleAdvanceStage = async (nextStage: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance stage");

      setActionMessage({ type: "success", text: `Advanced to ${nextStage.replace(/_/g, " ")}!` });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTaskName,
          estimatedHours: Number(newTaskHours),
          hourlyRate: Number(newTaskRate),
          isMandatory: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add task");

      setActionMessage({ type: "success", text: "Task added successfully!" });
      setNewTaskName("");
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Live Timer Control
  const handleTimeLog = async (taskId: string, action: "START" | "PAUSE" | "COMPLETE") => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/tasks/${taskId}/time-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action.toLowerCase()} timer`);

      setActionMessage({ type: "success", text: `Timer ${action.toLowerCase()}ed!` });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Submit Inspection
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallNotes: inspOverallNotes,
          results: inspItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit inspection");

      setActionMessage({ type: "success", text: "40-Point Inspection submitted successfully!" });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Submit Diagnostics
  const handleSubmitDiagnostics = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/diagnostics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceUsed: "Autel MaxiSys Pro OBD-II",
          codes: [
            {
              dtcCode,
              severity: dtcSeverity,
              description: dtcDescription,
              suggestedAction: dtcAction,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log diagnostic code");

      setActionMessage({ type: "success", text: `Diagnostic Code ${dtcCode} logged!` });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Generate Estimate
  const handleGenerateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountAmount: Number(estDiscount),
          taxRatePercent: 18,
          items: [
            {
              itemType: "LABOR",
              description: "Standard Workshop Mechanical Labor Operations",
              quantity: 1,
              unitPrice: Number(estLabor),
              taxRate: 18,
            },
            {
              itemType: "PART",
              description: "OEM & Certified Spare Parts Consumed",
              quantity: 1,
              unitPrice: Number(estParts),
              taxRate: 18,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate estimate");

      setActionMessage({ type: "success", text: "Estimate version created and sent for approval!" });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  // Approve Estimate
  const handleApproveEstimate = async (estimateId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/job-cards/${id}/estimates/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          isApproved: true,
          customerSignature: "Digital Approval via SMS / Portal",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve estimate");

      setActionMessage({ type: "success", text: "Estimate Approved! Workflow advanced to CUSTOMER APPROVAL." });
      fetchJobCard();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  if (isLoading || !jobCard) {
    return (
      <div className="py-24 text-center text-xs text-slate-400">
        Loading Job Card Terminal...
      </div>
    );
  }

  const currentStageIndex = ORDERED_STAGES.indexOf(jobCard.stage);
  const nextStage = ORDERED_STAGES[currentStageIndex + 1];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Breadcrumb & Terminal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/job-cards" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Workshop Command Center
            </Link>
            <span className="text-xs text-slate-400">•</span>
            <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50">
              {jobCard.jobNumber}
            </span>
            <Badge variant="info">{jobCard.stage.replace(/_/g, " ")}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {jobCard.vehicle.registrationNumber}
            </h1>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
              {jobCard.vehicle.make} {jobCard.vehicle.model}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGeneratingInvoice}
            variant="outline"
            className="gap-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold shadow-md shadow-emerald-500/10"
          >
            <DollarSign className="h-4 w-4" />
            <span>{isGeneratingInvoice ? "Generating..." : "Generate Tax Invoice"}</span>
          </Button>

          {nextStage && (
            <Button
              onClick={() => handleAdvanceStage(nextStage)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20"
            >
              <span>Advance to {nextStage.replace(/_/g, " ")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-rose-500/40 bg-rose-500/10 text-rose-500"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* 14-Stage Visual Workflow Stepper */}
      <Card className="bg-[#0B132B] text-white border-slate-800 shadow-lg overflow-x-auto">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 min-w-max">
            {ORDERED_STAGES.map((s, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    onClick={() => handleAdvanceStage(s)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/50 scale-105"
                        : isPast
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-900/60 text-slate-400 border border-slate-800"
                    }`}
                  >
                    {isPast ? <Check className="h-3 w-3 text-emerald-400" /> : <span>{idx + 1}.</span>}
                    <span className="whitespace-nowrap">{s.replace(/_/g, " ")}</span>
                  </div>
                  {idx < ORDERED_STAGES.length - 1 && (
                    <span className="text-slate-600 font-bold">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Info Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Customer Owner</span>
            <Link
              href={`/dashboard/customers/${jobCard.customer.id}`}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline block truncate"
            >
              {jobCard.customer.type === "CORPORATE" && jobCard.customer.companyName
                ? jobCard.customer.companyName
                : `${jobCard.customer.firstName} ${jobCard.customer.lastName || ""}`}
            </Link>
            <span className="text-xs text-slate-500 font-mono">{jobCard.customer.phone}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Bay & Station</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white block">
              {jobCard.bay?.name || "Unassigned Bay"}
            </span>
            <span className="text-xs text-slate-500">Branch: {jobCard.branch.name}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Fuel & Odometer</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {jobCard.currentMileage.toLocaleString()} km
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                ⛽ {jobCard.fuelLevel}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500">Intake: {formatDateLK(jobCard.receivedAt)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Job Costing</span>
            <span className="text-lg font-black font-mono text-slate-900 dark:text-white block">
              {formatCurrencyLKR(jobCard.actualTotalCost || jobCard.estimatedTotalCost)}
            </span>
            <span className="text-[11px] text-slate-500">
              Labor: {formatCurrencyLKR(jobCard.actualLaborCost || jobCard.estimatedLaborCost)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Client Complaint Alert */}
      {jobCard.customerComplaints && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-300">
          <strong>Customer Stated Complaints:</strong> {jobCard.customerComplaints}
        </div>
      )}

      {/* Navigation Tabs Control */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 overflow-x-auto">
        {[
          { key: "tasks", label: `Tasks & Work Timers (${jobCard.tasks.length})`, icon: Wrench },
          { key: "inspection", label: `40-Point Inspection (${jobCard.inspections.length})`, icon: Activity },
          { key: "diagnostics", label: `OBD-II Diagnostics (${jobCard.diagnostics.length})`, icon: Cpu },
          { key: "estimates", label: `Estimates & Approvals (${jobCard.estimates.length})`, icon: FileText },
          { key: "parts", label: `Parts Consumed (${jobCard.partsIssued.length})`, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Tasks & Work Timers */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Add Task Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Add Service Task to Job Card</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <Input
                    label="Task Description"
                    placeholder="e.g. Clean and adjust rear brake shoes"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    required
                  />
                </div>
                <div className="w-32">
                  <Input
                    label="Est. Hours"
                    type="number"
                    step="0.1"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(parseFloat(e.target.value) || 1.0)}
                    required
                  />
                </div>
                <div className="w-36">
                  <Input
                    label="Hourly Rate (LKR)"
                    type="number"
                    value={newTaskRate}
                    onChange={(e) => setNewTaskRate(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10">
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="space-y-3">
            {jobCard.tasks.map((task: any) => (
              <Card key={task.id} className="border-l-4 border-l-blue-600">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{task.name}</span>
                      <Badge
                        variant={
                          task.status === "COMPLETED"
                            ? "success"
                            : task.status === "IN_PROGRESS"
                            ? "info"
                            : task.status === "PAUSED"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Est. Hours: <strong>{task.estimatedHours}h</strong> • Actual Hours Logged:{" "}
                      <strong className="text-blue-600 dark:text-blue-400 font-mono">{task.actualHours || 0}h</strong> • Rate:{" "}
                      {formatCurrencyLKR(task.hourlyRate)}/hr
                    </p>
                  </div>

                  {/* Work Timer Buttons */}
                  <div className="flex items-center gap-2">
                    {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        onClick={() => handleTimeLog(task.id, "START")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Work Timer</span>
                      </Button>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTimeLog(task.id, "PAUSE")}
                        className="h-8 text-xs gap-1.5 bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border border-amber-500/30"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause Work</span>
                      </Button>
                    )}

                    {task.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        onClick={() => handleTimeLog(task.id, "COMPLETE")}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Complete Task</span>
                      </Button>
                    )}

                    {task.status === "COMPLETED" && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Finished
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Point Vehicle Inspection */}
      {activeTab === "inspection" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                40-Point Pre-Service Safety Checklist
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect vital engine, brake, tyre, and suspension components. Results are visible to customer and advisor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitInspection} className="space-y-4">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspItems.map((item, idx) => (
                    <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase block">{item.category}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.itemName}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {(["GOOD", "ATTENTION", "NEEDS_REPAIR", "CRITICAL"] as const).map((cond) => (
                          <label key={cond} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`insp-${idx}`}
                              checked={item.condition === cond}
                              onChange={() => {
                                const copy = [...inspItems];
                                copy[idx].condition = cond;
                                setInspItems(copy);
                              }}
                            />
                            <span className="text-[11px]">{cond}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Submit Inspection Checklist
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: OBD-II Diagnostics */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-purple-600 dark:text-purple-400">
                OBD-II Diagnostic Session & DTC Trouble Codes
              </CardTitle>
              <CardDescription className="text-xs">
                Log diagnostic trouble codes from scanners (Autel, Bosch, OBDLink) with fault description and repair actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitDiagnostics} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="DTC Trouble Code"
                    placeholder="e.g. P0A80 or P0420"
                    value={dtcCode}
                    onChange={(e) => setDtcCode(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Severity Level
                    </label>
                    <select
                      value={dtcSeverity}
                      onChange={(e) => setDtcSeverity(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="MINOR">Minor</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="CRITICAL">Critical (MIL Active)</option>
                    </select>
                  </div>
                  <Input
                    label="Fault Description"
                    placeholder="e.g. Replace Hybrid Battery Pack"
                    value={dtcDescription}
                    onChange={(e) => setDtcDescription(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Recommended Repair Action"
                  placeholder="e.g. Conduct individual cell balancing and check cooling blower"
                  value={dtcAction}
                  onChange={(e) => setDtcAction(e.target.value)}
                />

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                    Log Diagnostic DTC Code
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Logged Diagnostic Sessions */}
          <div className="space-y-3">
            {jobCard.diagnostics.map((session: any) => (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">Scanner: {session.deviceUsed}</span>
                    <span className="text-slate-400">{formatDateTimeLK(session.createdAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {session.codes.map((code: any) => (
                    <div key={code.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-purple-600 dark:text-purple-400">{code.dtcCode}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{code.description}</span>
                        </div>
                        {code.suggestedAction && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Action: {code.suggestedAction}</p>
                        )}
                      </div>
                      <Badge variant={code.severity === "CRITICAL" ? "danger" : "warning"} className="text-[10px]">
                        {code.severity}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Estimates & Customer Approvals */}
      {activeTab === "estimates" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                Generate Versioned Repair Estimate
              </CardTitle>
              <CardDescription className="text-xs">
                Draft formal quotation with Labor, Parts, and 18% VAT breakdown for client sign-off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateEstimate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Labor Subtotal (LKR)"
                    type="number"
                    value={estLabor}
                    onChange={(e) => setEstLabor(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Input
                    label="Parts Subtotal (LKR)"
                    type="number"
                    value={estParts}
                    onChange={(e) => setEstParts(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Input
                    label="Special Discount (LKR)"
                    type="number"
                    value={estDiscount}
                    onChange={(e) => setEstDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Generate Estimate Version
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Estimates History & Approval Buttons */}
          <div className="space-y-4">
            {jobCard.estimates.map((est: any) => (
              <Card key={est.id} className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        Version {est.versionNumber}
                      </span>
                      <Badge variant={est.status === "APPROVED" ? "success" : "warning"}>
                        {est.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateLK(est.createdAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Labor</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrencyLKR(est.subtotalLabor)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Parts</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrencyLKR(est.subtotalParts)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">VAT (18%)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrencyLKR(est.taxAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Total Payable</span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                        {formatCurrencyLKR(est.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {est.status !== "APPROVED" && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveEstimate(est.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        <span>Authorize / Approve Estimate</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Spare Parts Consumed & Inventory Requisition */}
      {activeTab === "parts" && (
        <div className="space-y-6">
          {/* Requisition Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                Requisition Spare Part from Inventory
              </CardTitle>
              <CardDescription className="text-xs">
                Select available parts from workshop warehouse stores, reserve or issue directly to bay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedPartId || !selectedWarehouseId) return;
                  setActionMessage(null);
                  try {
                    const res = await fetch("/api/inventory/job-parts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        jobCardId: id,
                        partId: selectedPartId,
                        warehouseId: selectedWarehouseId,
                        quantity: Number(partQty),
                        unitPrice: Number(partPrice),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to reserve part");
                    setActionMessage({ type: "success", text: "Part reserved from stock successfully!" });
                    fetchJobCard();
                  } catch (err: any) {
                    setActionMessage({ type: "error", text: err.message });
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Select Spare Part / SKU *
                    </label>
                    <select
                      required
                      value={selectedPartId}
                      onChange={(e) => {
                        setSelectedPartId(e.target.value);
                        const found = invParts.find((p) => p.id === e.target.value);
                        if (found) setPartPrice(found.sellingPrice);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="">Select Part...</option>
                      {invParts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} (Avail: {p.totalAvailable})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Warehouse *
                    </label>
                    <select
                      required
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {invWarehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.branchName} - {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={partQty}
                        onChange={(e) => setPartQty(parseFloat(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Price (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={partPrice}
                        onChange={(e) => setPartPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-mono text-right"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Reserve Part from Stock
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Parts Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Part SKU / Item</th>
                      <th className="px-6 py-3.5 text-center">Quantity</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Unit Price</th>
                      <th className="px-6 py-3.5 text-right">Total</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jobCard.partsIssued.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          No inventory spare parts issued or reserved for this job card yet.
                        </td>
                      </tr>
                    ) : (
                      jobCard.partsIssued.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-6 py-3.5 font-bold">
                            {p.part.name} <span className="font-mono text-slate-400 font-normal">({p.part.sku})</span>
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono font-bold">{Number(p.quantity)}</td>
                          <td className="px-6 py-3.5 text-center">
                            <Badge
                              variant={p.status === "ISSUED" ? "success" : p.status === "RESERVED" ? "warning" : "default"}
                              className="text-[10px]"
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">{formatCurrencyLKR(p.unitPrice)}</td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-400">
                            {formatCurrencyLKR(Number(p.unitPrice) * Number(p.quantity))}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {p.status === "RESERVED" && (
                              <button
                                onClick={async () => {
                                  setActionMessage(null);
                                  try {
                                    const res = await fetch("/api/inventory/job-parts", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "issue", jobPartIssueId: p.id }),
                                    });
                                    const d = await res.json();
                                    if (!res.ok) throw new Error(d.error || "Failed to issue part");
                                    setActionMessage({ type: "success", text: "Part issued to bay floor!" });
                                    fetchJobCard();
                                  } catch (err: any) {
                                    setActionMessage({ type: "error", text: err.message });
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                              >
                                Issue to Bay
                              </button>
                            )}
                            {p.status === "ISSUED" && (
                              <button
                                onClick={async () => {
                                  setActionMessage(null);
                                  try {
                                    const res = await fetch("/api/inventory/job-parts", {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ jobPartIssueId: p.id }),
                                    });
                                    const d = await res.json();
                                    if (!res.ok) throw new Error(d.error || "Failed to return part");
                                    setActionMessage({ type: "success", text: "Part returned to inventory!" });
                                    fetchJobCard();
                                  } catch (err: any) {
                                    setActionMessage({ type: "error", text: err.message });
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px]"
                              >
                                Return Unused
                              </button>
                            )}
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
      )}
    </div>
  );
}
