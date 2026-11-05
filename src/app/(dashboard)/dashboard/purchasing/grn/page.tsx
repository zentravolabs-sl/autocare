"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  DollarSign,
  RefreshCw,
  Package,
} from "lucide-react";
import { formatCurrencyLKR, formatDate } from "@/lib/utils";

export default function GoodsReceiptsPage() {
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ partId: string; quantityReceived: number; unitCost: number }>>([
    { partId: "", quantityReceived: 10, unitCost: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [grnRes, supRes, brRes, whRes, partRes, poRes] = await Promise.all([
        fetch("/api/purchasing/grn"),
        fetch("/api/purchasing/suppliers"),
        fetch("/api/branches"),
        fetch("/api/inventory/warehouses"),
        fetch("/api/inventory/parts?limit=100"),
        fetch("/api/purchasing/orders?status=ISSUED"),
      ]);

      const grnJson = await grnRes.json();
      const supJson = await supRes.json();
      const brJson = await brRes.json();
      const whJson = await whRes.json();
      const partJson = await partRes.json();
      const poJson = await poRes.json();

      setGrns(grnJson.grns || []);
      setSuppliers(supJson.suppliers || []);
      setBranches(brJson.branches || []);
      setWarehouses(whJson.warehouses || []);
      setParts(partJson.parts || []);
      setOrders(poJson.orders || []);

      if (supJson.suppliers?.length > 0 && !supplierId) {
        setSupplierId(supJson.suppliers[0].id);
      }
      if (brJson.branches?.length > 0 && !branchId) {
        setBranchId(brJson.branches[0].id);
      }
      if (whJson.warehouses?.length > 0 && !warehouseId) {
        setWarehouseId(whJson.warehouses[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load GRNs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter warehouses by branch
  const branchWarehouses = warehouses.filter((w) => w.branchId === branchId);

  // If user selects a PO, auto-fill supplier, branch, and line items
  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    if (!poId) return;

    const po = orders.find((o) => o.id === poId);
    if (po) {
      setSupplierId(po.supplier.id);
      setBranchId(po.branch.id);
      if (po.items?.length > 0) {
        setItems(
          po.items.map((i: any) => ({
            partId: i.partId,
            quantityReceived: Math.max(1, i.quantityOrdered - (i.quantityReceived || 0)),
            unitCost: i.unitCost,
          }))
        );
      }
    }
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const validItems = items.filter((i) => i.partId && i.quantityReceived > 0);
      if (validItems.length === 0) throw new Error("Please specify at least one valid line item");

      const res = await fetch("/api/purchasing/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          warehouseId,
          supplierId,
          purchaseOrderId: selectedPOId || undefined,
          invoiceNumber: invoiceNumber || undefined,
          notes,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process Goods Receipt");

      setSuccessMsg(`Goods Receipt ${json.grn.grnNumber} generated! Stock levels & WAC updated.`);
      setIsModalOpen(false);
      setSelectedPOId("");
      setInvoiceNumber("");
      setNotes("");
      setItems([{ partId: "", quantityReceived: 10, unitCost: 0 }]);
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
            <ShoppingBag className="h-7 w-7 text-emerald-400" />
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-sm text-slate-400">
            Inbound inventory verification, landed cost calculation & automated stock balance updates
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          Receive Goods (New GRN)
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {/* GRN Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">GRN #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Receiving Branch</th>
                <th className="py-3.5 px-4">Linked PO</th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Total Landed Value</th>
                <th className="py-3.5 px-4 text-right">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading Goods Receipts...
                  </td>
                </tr>
              ) : grns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No goods receipts recorded. Click &quot;Receive Goods&quot; to intake inventory.
                  </td>
                </tr>
              ) : (
                grns.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {g.grnNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{g.supplier.name}</div>
                      <div className="text-xs text-slate-400">{g.supplier.code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {g.branch.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-400">
                      {g.purchaseOrder ? g.purchaseOrder.poNumber : <span className="text-slate-500">Direct GRN</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {g.invoiceNumber || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-white">{g.itemCount}</span>
                      <span className="text-xs text-slate-500 ml-1">SKUs</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrencyLKR(g.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                      {formatDate(g.receivedDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New GRN Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                Intake Goods Receipt Note (GRN)
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGRN} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* Optional PO linkage */}
              <div>
                <label className="block text-xs font-semibold text-blue-400 uppercase mb-1">
                  Link to Purchase Order (Optional)
                </label>
                <select
                  value={selectedPOId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Direct Receipt without PO</option>
                  {orders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplier.name} ({formatCurrencyLKR(po.totalAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Supplier *
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
                    Supplier Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-TYT-8890"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Branch *
                  </label>
                  <select
                    required
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Receiving Warehouse Store *
                  </label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {branchWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Received Items (Auto Recalculates WAC)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setItems([...items, { partId: "", quantityReceived: 10, unitCost: 0 }])
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
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
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].partId = e.target.value;
                          const foundPart = parts.find((p) => p.id === e.target.value);
                          if (foundPart) copy[idx].unitCost = foundPart.purchasePrice || 0;
                          setItems(copy);
                        }}
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
                          min="0.01"
                          step="0.01"
                          required
                          placeholder="Qty"
                          value={item.quantityReceived}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].quantityReceived = parseFloat(e.target.value) || 1;
                            setItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-mono text-center"
                        />
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Landed Cost"
                          value={item.unitCost}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].unitCost = parseFloat(e.target.value) || 0;
                            setItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-mono text-right"
                        />
                      </div>

                      <div className="w-28 text-right font-mono text-xs text-emerald-400 font-bold">
                        {formatCurrencyLKR(item.quantityReceived * item.unitCost)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Inspection / Receiving Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. All packaging intact, batch inspection passed without damage"
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
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Receiving..." : "Accept Goods & Update Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
