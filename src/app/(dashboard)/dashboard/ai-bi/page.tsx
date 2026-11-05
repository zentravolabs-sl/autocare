"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Car,
  Wrench,
  DollarSign,
  Activity,
  Layers,
  CheckCircle2,
  Building2,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatCurrencyLKR } from "@/lib/utils";

export default function AiBiPage() {
  const [activeTab, setActiveTab] = useState<"predictive" | "bi">("predictive");
  const [predictiveData, setPredictiveData] = useState<any | null>(null);
  const [biData, setBiData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [predRes, biRes] = await Promise.all([
        fetch("/api/ai/predictive-maintenance"),
        fetch("/api/ai/bi-analytics"),
      ]);
      const pData = await predRes.json();
      const bData = await biRes.json();
      setPredictiveData(pData);
      setBiData(bData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">
              ARTIFICIAL INTELLIGENCE & EXECUTIVE BI
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Predictive Maintenance Engine & Executive BI
          </h1>
          <p className="text-xs text-slate-400">
            Heuristic service cycle projection, diagnostic DTC risk scoring, and real-time workshop operational yield
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("predictive")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "predictive"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Vehicle Predictive Health Scoring</span>
        </button>

        <button
          onClick={() => setActiveTab("bi")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "bi"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Executive Business Intelligence (BI)</span>
        </button>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-slate-400 text-xs">
          Computing predictive degradation algorithms and operational yields...
        </div>
      )}

      {/* Predictive Maintenance Tab */}
      {!isLoading && activeTab === "predictive" && predictiveData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Fleet Monitored</span>
              <div className="text-2xl font-mono font-bold text-white mt-1">
                {predictiveData.summary.totalEvaluated}
              </div>
            </div>

            <div className="bg-[#0B132B] border border-rose-500/30 rounded-2xl p-4">
              <span className="text-xs text-rose-400">Critical Fault / Overdue</span>
              <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
                {predictiveData.summary.criticalRiskCount}
              </div>
            </div>

            <div className="bg-[#0B132B] border border-amber-500/30 rounded-2xl p-4">
              <span className="text-xs text-amber-400">High Risk Attention</span>
              <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
                {predictiveData.summary.highRiskCount}
              </div>
            </div>

            <div className="bg-[#0B132B] border border-emerald-500/30 rounded-2xl p-4">
              <span className="text-xs text-emerald-400">Healthy Operation</span>
              <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                {predictiveData.summary.healthyCount}
              </div>
            </div>
          </div>

          {/* Predictive Vehicle Cards */}
          <div className="space-y-4">
            {predictiveData.insights.map((insight: any) => (
              <div
                key={insight.vehicleId}
                className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">
                        {insight.registrationNumber}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {insight.make} {insight.model} • {insight.customerName} ({insight.customerPhone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-300">
                      Odometer: {insight.currentMileage.toLocaleString()} km
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        insight.riskScore === "CRITICAL"
                          ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                          : insight.riskScore === "HIGH"
                          ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                          : insight.riskScore === "MEDIUM"
                          ? "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                          : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                      }`}
                    >
                      {insight.riskScore}
                    </span>
                  </div>
                </div>

                {/* Predicted Service Actions */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                    ALGORITHMIC PREDICTIVE RECOMMENDATIONS
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insight.predictedNeeds.map((need: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 space-y-1.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                              {need.category}
                            </span>
                            <h4 className="text-xs font-bold text-white">{need.description}</h4>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            ~{formatCurrencyLKR(need.estimatedCost)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">{need.reason}</p>
                      </div>
                    ))}
                    {insight.predictedNeeds.length === 0 && (
                      <div className="col-span-2 text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>All service intervals and diagnostic telematics within normal operating tolerances.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Intelligence Tab */}
      {!isLoading && activeTab === "bi" && biData && (
        <div className="space-y-6">
          {/* Financial Performance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-1 shadow-xl">
              <span className="text-xs text-slate-400">Total Billed Revenue</span>
              <div className="text-2xl font-mono font-black text-emerald-400">
                {formatCurrencyLKR(biData.financial.totalBilled)}
              </div>
              <p className="text-[11px] text-slate-500">
                Collected: {formatCurrencyLKR(biData.financial.totalCollected)}
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-1 shadow-xl">
              <span className="text-xs text-slate-400">Gross Operating Margin</span>
              <div className="text-2xl font-mono font-black text-white">
                {biData.financial.grossMarginPct}%
              </div>
              <p className="text-[11px] text-slate-500">
                Gross Profit: {formatCurrencyLKR(biData.financial.grossProfit)}
              </p>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-1 shadow-xl">
              <span className="text-xs text-slate-400">Workshop Bay Floor Utilization</span>
              <div className="text-2xl font-mono font-black text-blue-400">
                {biData.operations.bayUtilizationRate}%
              </div>
              <p className="text-[11px] text-slate-500">
                {biData.operations.occupiedBays} of {biData.operations.totalBays} physical bays active
              </p>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase border-b border-slate-800 pb-2">
                WORKSHOP PRODUCTIVITY & LABOR YIELD
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Labor Efficiency Rate:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {biData.operations.laborEfficiencyRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Active Repair Cards on Floor:</span>
                  <span className="font-mono font-bold text-white">
                    {biData.operations.activeRepairsCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Enrolled Active Technicians:</span>
                  <span className="font-mono font-bold text-white">
                    {biData.operations.totalTechnicians}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase border-b border-slate-800 pb-2">
                INVENTORY VALUATION & DEPLETION
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Inventory Asset Valuation:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatCurrencyLKR(biData.inventory.inventoryValuation)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Catalog SKUs Tracked:</span>
                  <span className="font-mono font-bold text-white">
                    {biData.inventory.totalSkus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Items Below Minimum Safety Stock:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {biData.inventory.lowStockCount} SKUs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
