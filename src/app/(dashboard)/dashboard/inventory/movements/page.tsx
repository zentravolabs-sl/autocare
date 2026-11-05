"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrencyLKR, formatDate } from "@/lib/utils";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementType, setMovementType] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (movementType) queryParams.set("movementType", movementType);
      if (warehouseId) queryParams.set("warehouseId", warehouseId);

      const [movRes, whRes] = await Promise.all([
        fetch(`/api/inventory/movements?${queryParams.toString()}`),
        fetch(`/api/inventory/warehouses`),
      ]);

      const movJson = await movRes.json();
      const whJson = await whRes.json();

      setMovements(movJson.movements || []);
      setWarehouses(whJson.warehouses || []);
    } catch (err: any) {
      console.error("Failed to load movements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [movementType, warehouseId]);

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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="h-7 w-7 text-indigo-400" />
              Immutable Stock Movement Audit Ledger
            </h1>
            <p className="text-sm text-slate-400">
              Double-entry audit trail of all receipts, job issues, returns, and transfer operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMovements}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Movement Types</option>
            <option value="PURCHASE_RECEIPT">PURCHASE RECEIPT (GRN)</option>
            <option value="JOB_ISSUE">JOB CARD ISSUE</option>
            <option value="JOB_RETURN">JOB CARD RETURN</option>
            <option value="BRANCH_TRANSFER_OUT">BRANCH TRANSFER OUT</option>
            <option value="BRANCH_TRANSFER_IN">BRANCH TRANSFER IN</option>
            <option value="PHYSICAL_ADJUSTMENT">PHYSICAL CYCLE COUNT ADJUSTMENT</option>
            <option value="DAMAGE_WRITEOFF">DAMAGE WRITE-OFF</option>
          </select>

          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.branchName} — {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{movements.length}</span> audit records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Part / SKU</th>
                <th className="py-3.5 px-4">Warehouse & Branch</th>
                <th className="py-3.5 px-4 text-center">Quantity</th>
                <th className="py-3.5 px-4 text-right">Landed Unit Cost</th>
                <th className="py-3.5 px-4 text-right">Total Value</th>
                <th className="py-3.5 px-4">Reference & Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Querying immutable ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No stock movement events recorded.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            m.movementType === "PURCHASE_RECEIPT"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : m.movementType === "JOB_ISSUE"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : m.movementType === "JOB_RETURN"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : m.movementType.includes("TRANSFER")
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {m.movementType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{m.part.name}</div>
                        <div className="text-xs font-mono text-blue-400">{m.part.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-300 font-medium">{m.warehouse.name}</div>
                        <div className="text-xs text-slate-500">{m.branch.name}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                          {isPositive ? "+" : ""}
                          {m.quantity} {m.part.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatCurrencyLKR(m.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                        {formatCurrencyLKR(m.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                        {m.referenceId && (
                          <span className="font-mono text-slate-300 font-semibold mr-1.5">
                            [{m.referenceType}: {m.referenceId}]
                          </span>
                        )}
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
  );
}
