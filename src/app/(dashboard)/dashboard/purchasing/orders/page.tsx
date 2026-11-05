"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Eye,
} from "lucide-react";
import { formatCurrencyLKR, formatDate } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ partId: string; quantityOrdered: number; unitCost: number; taxRate: number }>>([
    { partId: "", quantityOrdered: 10, unitCost: 0, taxRate: 18 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, supRes, brRes, partRes] = await Promise.all([
        fetch("/api/purchasing/orders"),
        fetch("/api/purchasing/suppliers"),
        fetch("/api/branches"),
        fetch("/api/inventory/parts?limit=100"),
      ]);

      const ordJson = await ordRes.json();
      const supJson = await supRes.json();
      const brJson = await brRes.json();
      const partJson = await partRes.json();

      setOrders(ordJson.orders || []);
      setSuppliers(supJson.suppliers || []);
      setBranches(brJson.branches || []);
      setParts(partJson.parts || []);

      if (supJson.suppliers?.length > 0 && !supplierId) {
        setSupplierId(supJson.suppliers[0].id);
      }
      if (brJson.branches?.length > 0 && !branchId) {
        setBranchId(brJson.branches[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load POs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePartSelect = (index: number, selectedPartId: string) => {
    const copy = [...items];
    copy[index].partId = selectedPartId;
    const foundPart = parts.find((p) => p.id === selectedPartId);
    if (foundPart) {
      copy[index].unitCost = foundPart.purchasePrice || 0;
    }
    setItems(copy);
  };

  const calculatedSubtotal = items.reduce(
    (sum, i) => sum + i.quantityOrdered * i.unitCost,
    0
  );
  const calculatedTax = items.reduce(
    (sum, i) => sum + (i.quantityOrdered * i.unitCost * i.taxRate) / 100,
    0
  );
  const calculatedTotal = calculatedSubtotal + calculatedTax;

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const validItems = items.filter((i) => i.partId && i.quantityOrdered > 0);
      if (validItems.length === 0) throw new Error("Please specify at least one valid line item");

      const res = await fetch("/api/purchasing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          supplierId,
          expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
          notes,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create Purchase Order");

      setSuccessMsg(`Purchase Order ${json.order.poNumber} issued successfully!`);
      setIsModalOpen(false);
      setItems([{ partId: "", quantityOrdered: 10, unitCost: 0, taxRate: 18 }]);
      setNotes("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-500" />
            Purchase Orders (PO)
          </h1>
          <p className="text-sm text-slate-400">
            Procurement workflow, vendor approvals, line items & Goods Receipt reconciliation
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">Tax (18% VAT)</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Date Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No purchase orders recorded. Click &quot;Create Purchase Order&quot; to begin.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{po.supplier.name}</div>
                      <div className="text-xs text-slate-400">{po.supplier.code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {po.branch.name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-white">{po.itemCount}</span>
                      <span className="text-xs text-slate-500 ml-1">SKUs</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {formatCurrencyLKR(po.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {formatCurrencyLKR(po.taxAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrencyLKR(po.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          po.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : po.status === "PARTIAL_RECEIVED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : po.status === "ISSUED"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {po.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                        {po.status === "PARTIAL_RECEIVED" && <Clock className="h-3 w-3" />}
                        {po.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                      {formatDate(po.orderDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Issue New Purchase Order
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Receiving Branch *
                  </label>
                  <select
                    required
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Order Line Items
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setItems([
                        ...items,
                        { partId: "", quantityOrdered: 10, unitCost: 0, taxRate: 18 },
                      ])
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <select
                        required
                        value={item.partId}
                        onChange={(e) => handlePartSelect(idx, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="">Select Spare Part...</option>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} ({p.brand})
                          </option>
                        ))}
                      </select>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantityOrdered}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].quantityOrdered = parseFloat(e.target.value) || 1;
                            setItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-mono text-center"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Unit Cost"
                          value={item.unitCost}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].unitCost = parseFloat(e.target.value) || 0;
                            setItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-mono text-right"
                        />
                      </div>

                      <div className="w-28 text-right font-mono text-xs text-slate-300 font-bold">
                        {formatCurrencyLKR(item.quantityOrdered * item.unitCost)}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-400 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-sm font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyLKR(calculatedSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sri Lankan VAT (18%):</span>
                  <span>{formatCurrencyLKR(calculatedTax)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-base border-t border-slate-800 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">{formatCurrencyLKR(calculatedTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  PO Terms & Delivery Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 30 days credit terms as agreed. Delivery directly to central warehouse."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Issuing PO..." : "Issue Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
