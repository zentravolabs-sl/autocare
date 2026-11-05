"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  Package,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Transfer {
  id: string;
  transferNumber: string;
  status: "DRAFT" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  fromBranch: string;
  fromWarehouse: string;
  toBranch: string;
  toWarehouse: string;
  itemCount: number;
  items: Array<{
    id: string;
    partId: string;
    sku: string;
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
  }>;
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ partId: string; quantity: number }>>([
    { partId: "", quantity: 1 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, brRes, whRes, partsRes] = await Promise.all([
        fetch("/api/inventory/transfers"),
        fetch("/api/branches"),
        fetch("/api/inventory/warehouses"),
        fetch("/api/inventory/parts?limit=100"),
      ]);

      const transJson = await transRes.json();
      const brJson = await brRes.json();
      const whJson = await whRes.json();
      const partsJson = await partsRes.json();

      setTransfers(transJson.transfers || []);
      setBranches(brJson.branches || []);
      setWarehouses(whJson.warehouses || []);
      setParts(partsJson.parts || []);

      if (brJson.branches?.length >= 2) {
        setFromBranchId(brJson.branches[0].id);
        setToBranchId(brJson.branches[1].id);
      } else if (brJson.branches?.length === 1) {
        setFromBranchId(brJson.branches[0].id);
        setToBranchId(brJson.branches[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update available warehouses when branch changes
  const fromWarehouses = warehouses.filter((w) => w.branchId === fromBranchId);
  const toWarehouses = warehouses.filter((w) => w.branchId === toBranchId);

  useEffect(() => {
    if (fromWarehouses.length > 0 && !fromWarehouseId) {
      setFromWarehouseId(fromWarehouses[0].id);
    }
  }, [fromBranchId, fromWarehouses]);

  useEffect(() => {
    if (toWarehouses.length > 0 && !toWarehouseId) {
      setToWarehouseId(toWarehouses[0].id);
    }
  }, [toBranchId, toWarehouses]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrMsg("");
    setMsg("");

    try {
      const validItems = items.filter((i) => i.partId && i.quantity > 0);
      if (validItems.length === 0) {
        throw new Error("Please add at least one valid part and quantity");
      }

      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId,
          fromWarehouseId,
          toBranchId,
          toWarehouseId,
          notes,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create transfer");

      setMsg(`Transfer ${json.transfer.transferNumber} created in DRAFT!`);
      setIsNewModalOpen(false);
      setItems([{ partId: "", quantity: 1 }]);
      setNotes("");
      fetchData();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      setActionLoadingId(id);
      setErrMsg("");
      setMsg("");

      const res = await fetch(`/api/inventory/transfers/${id}/dispatch`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to dispatch transfer");

      setMsg(json.message);
      fetchData();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      setActionLoadingId(id);
      setErrMsg("");
      setMsg("");

      const res = await fetch(`/api/inventory/transfers/${id}/receive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to receive transfer");

      setMsg(json.message);
      fetchData();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <Sliders className="h-7 w-7 text-blue-500" />
              Inter-Branch & Warehouse Stock Transfers
            </h1>
            <p className="text-sm text-slate-400">
              Manage internal stock movements across regional service centers and warehouse bins
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          New Transfer Request
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {errMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex items-center justify-between">
          <span>{errMsg}</span>
          <button onClick={() => setErrMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Transfers List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transfer #</th>
                <th className="py-3.5 px-4">Source (Origin)</th>
                <th className="py-3.5 px-4">Destination</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading transfers pipeline...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No branch transfers recorded yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {t.transferNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.fromBranch}</div>
                      <div className="text-xs text-slate-400">{t.fromWarehouse}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.toBranch}</div>
                      <div className="text-xs text-slate-400">{t.toWarehouse}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-200">{t.itemCount}</span>
                      <span className="text-xs text-slate-500 ml-1">SKUs</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === "DRAFT"
                            ? "bg-slate-800 text-slate-300 border border-slate-700"
                            : t.status === "IN_TRANSIT"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : t.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {t.status === "IN_TRANSIT" && <Truck className="h-3 w-3" />}
                        {t.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.status === "DRAFT" && (
                        <button
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleDispatch(t.id)}
                          className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                        >
                          {actionLoadingId === t.id ? "Dispatching..." : "Dispatch"}
                        </button>
                      )}
                      {t.status === "IN_TRANSIT" && (
                        <button
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleReceive(t.id)}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                        >
                          {actionLoadingId === t.id ? "Receiving..." : "Receive"}
                        </button>
                      )}
                      {t.status === "COMPLETED" && (
                        <span className="text-xs text-slate-500 font-mono">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Initiate Inter-Branch Stock Transfer
              </h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {errMsg}
                </div>
              )}

              {/* Source & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                    Origin Warehouse (Source)
                  </div>
                  <div className="space-y-2">
                    <select
                      value={fromBranchId}
                      onChange={(e) => setFromBranchId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          Branch: {b.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={fromWarehouseId}
                      onChange={(e) => setFromWarehouseId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {fromWarehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          Store: {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    Destination Warehouse (Target)
                  </div>
                  <div className="space-y-2">
                    <select
                      value={toBranchId}
                      onChange={(e) => setToBranchId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          Branch: {b.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={toWarehouseId}
                      onChange={(e) => setToWarehouseId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {toWarehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          Store: {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Items to Transfer
                  </label>
                  <button
                    type="button"
                    onClick={() => setItems([...items, { partId: "", quantity: 1 }])}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Line Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        required
                        value={item.partId}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].partId = e.target.value;
                          setItems(copy);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="">Select Part / SKU...</option>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} (Avail: {p.totalAvailable})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].quantity = parseFloat(e.target.value) || 1;
                          setItems(copy);
                        }}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono text-center"
                      />

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-2 text-rose-400 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Transfer Dispatch Notes / Route Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dispatched via Colombo courier van #WP-GA-9921"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Transfer Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
