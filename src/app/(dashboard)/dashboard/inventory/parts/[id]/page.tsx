"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Building2,
  Layers,
  DollarSign,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { formatCurrencyLKR, formatDate } from "@/lib/utils";

export default function PartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPart = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/parts/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load part");
      setPart(json.part);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPart();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <Package className="h-8 w-8 animate-spin text-blue-500 mr-3" />
        Loading Part 360° Profile...
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-rose-400 mb-4">{error || "Part not found"}</p>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory"
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{part.name}</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {part.sku}
              </span>
              {part.isLowStock && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Low Stock
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {part.category.name} • {part.brand} • Unit: {part.unit}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory/movements"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium border border-slate-700"
          >
            <History className="h-4 w-4 text-indigo-400" />
            Audit Ledger
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Quantity On-Hand</div>
          <div className="text-3xl font-bold text-white mt-1 font-mono">{part.totalQOH}</div>
          <div className="text-xs text-slate-500 mt-1">Across all branches & warehouses</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Available for Issue</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">
            {part.totalAvailable}
          </div>
          <div className="text-xs text-amber-400/80 mt-1">
            {part.totalReserved} reserved on active job cards
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Latest Purchase / Unit Cost</div>
          <div className="text-3xl font-bold text-blue-400 mt-1 font-mono">
            {formatCurrencyLKR(part.purchasePrice)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cost basis (WAC calculated)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Retail Selling Price</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">
            {formatCurrencyLKR(part.sellingPrice)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Margin:{" "}
            {part.purchasePrice > 0
              ? Math.round(((part.sellingPrice - part.purchasePrice) / part.sellingPrice) * 100)
              : 100}
            %
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Warehouse stock distribution & Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warehouse Balances */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Multi-Warehouse Stock Distribution
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Branch & Warehouse</th>
                    <th className="py-3 px-4 text-center">On-Hand</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                  {part.stocks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        No stock records initialized in any warehouse.
                      </td>
                    </tr>
                  ) : (
                    part.stocks.map((s: any) => (
                      <tr key={s.warehouseId} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-white">{s.warehouseName}</div>
                          <div className="text-xs text-slate-400">{s.branchName} ({s.warehouseCode})</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">{s.quantityOnHand}</td>
                        <td className="py-3 px-4 text-center text-amber-400">{s.quantityReserved}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400">{s.quantityAvailable}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {formatCurrencyLKR(s.averageUnitCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Stock Movements Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-400" />
                Immutable Stock Movement Ledger (Recent 25)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {part.recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                        No transactions recorded yet in the immutable ledger.
                      </td>
                    </tr>
                  ) : (
                    part.recentMovements.map((m: any) => {
                      const isPositive = m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400 font-mono">
                            {formatDate(m.createdAt)}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-semibold text-slate-200">
                              {m.movementType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">{m.warehouseName}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-0.5 ${
                                isPositive ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {m.quantity}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                            {formatCurrencyLKR(m.unitCost)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                            {m.referenceId ? `${m.referenceId}: ` : ""}
                            {m.notes || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Specifications & Metadata */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-white text-base border-b border-slate-800 pb-3">
              SKU Specifications
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">SKU Code:</span>
                <span className="font-mono font-bold text-white">{part.sku}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Barcode / OEM:</span>
                <span className="font-mono text-slate-300">{part.barcode || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Category:</span>
                <span className="text-white font-medium">{part.category.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Brand / OEM:</span>
                <span className="text-white font-medium">{part.brand}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Unit of Measure:</span>
                <span className="font-mono text-white">{part.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Min Stock Threshold:</span>
                <span className="font-mono text-white">{part.minStockLevel} {part.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Reorder Trigger:</span>
                <span className="font-mono text-amber-400 font-bold">{part.reorderLevel} {part.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Workshop Consumable:</span>
                <span className="text-white font-medium">{part.isServicePart ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Registered Date:</span>
                <span className="text-slate-400">{formatDate(part.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
