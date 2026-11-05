"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  Layers,
  Building2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Sliders,
  Eye,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR } from "@/lib/utils";

interface Part {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  reorderLevel: number;
  isServicePart: boolean;
  isActive: boolean;
  category: { id: string; name: string; code: string };
  totalQOH: number;
  totalReserved: number;
  totalAvailable: number;
  isLowStock: boolean;
  stocks: Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    averageUnitCost: number;
  }>;
}

interface Category {
  id: string;
  code: string;
  name: string;
  partsCount: number;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  branchName: string;
  branchId: string;
}

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedPartForAdjust, setSelectedPartForAdjust] = useState<Part | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    sku: "",
    barcode: "",
    name: "",
    brand: "",
    categoryId: "",
    unit: "PCS",
    purchasePrice: 0,
    sellingPrice: 0,
    minStockLevel: 5,
    reorderLevel: 10,
    isServicePart: false,
    initialQuantity: 0,
    initialUnitCost: 0,
    initialWarehouseId: "",
  });

  const [adjustData, setAdjustData] = useState({
    warehouseId: "",
    countedQuantity: 0,
    reason: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (selectedCategory) queryParams.set("categoryId", selectedCategory);
      if (lowStockOnly) queryParams.set("lowStock", "true");

      const [partsRes, catRes, whRes] = await Promise.all([
        fetch(`/api/inventory/parts?${queryParams.toString()}`),
        fetch(`/api/inventory/categories`),
        fetch(`/api/inventory/warehouses`),
      ]);

      const partsJson = await partsRes.json();
      const catJson = await catRes.json();
      const whJson = await whRes.json();

      setParts(partsJson.parts || []);
      setCategories(catJson.categories || []);
      setWarehouses(whJson.warehouses || []);

      if (catJson.categories?.length > 0 && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: catJson.categories[0].id }));
      }
      if (whJson.warehouses?.length > 0 && !formData.initialWarehouseId) {
        setFormData((prev) => ({ ...prev, initialWarehouseId: whJson.warehouses[0].id }));
        setAdjustData((prev) => ({ ...prev, warehouseId: whJson.warehouses[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, lowStockOnly]);

  // Aggregate metrics
  const totalValuation = parts.reduce(
    (sum, p) => sum + p.totalQOH * p.purchasePrice,
    0
  );
  const lowStockCount = parts.filter((p) => p.isLowStock).length;
  const outOfStockCount = parts.filter((p) => p.totalQOH === 0).length;

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const selectedWh = warehouses.find((w) => w.id === formData.initialWarehouseId);
      const payload: any = {
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        name: formData.name,
        brand: formData.brand,
        categoryId: formData.categoryId,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        minStockLevel: Number(formData.minStockLevel),
        reorderLevel: Number(formData.reorderLevel),
        isServicePart: formData.isServicePart,
      };

      if (formData.initialQuantity > 0 && selectedWh) {
        payload.initialStock = {
          branchId: selectedWh.branchId,
          warehouseId: selectedWh.id,
          quantity: Number(formData.initialQuantity),
          unitCost: Number(formData.initialUnitCost || formData.purchasePrice),
        };
      }

      const res = await fetch("/api/inventory/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create part");

      setSuccessMsg(`Part '${formData.name}' created successfully!`);
      setIsAddModalOpen(false);
      setFormData({
        sku: "",
        barcode: "",
        name: "",
        brand: "",
        categoryId: categories[0]?.id || "",
        unit: "PCS",
        purchasePrice: 0,
        sellingPrice: 0,
        minStockLevel: 5,
        reorderLevel: 10,
        isServicePart: false,
        initialQuantity: 0,
        initialUnitCost: 0,
        initialWarehouseId: warehouses[0]?.id || "",
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartForAdjust) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const selectedWh = warehouses.find((w) => w.id === adjustData.warehouseId);
      if (!selectedWh) throw new Error("Invalid warehouse");

      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedWh.branchId,
          warehouseId: selectedWh.id,
          partId: selectedPartForAdjust.id,
          countedQuantity: Number(adjustData.countedQuantity),
          reason: adjustData.reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to adjust stock");

      setSuccessMsg(json.message);
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (part: Part) => {
    setSelectedPartForAdjust(part);
    const primaryStock = part.stocks[0];
    setAdjustData({
      warehouseId: primaryStock ? primaryStock.warehouseId : warehouses[0]?.id || "",
      countedQuantity: primaryStock ? primaryStock.quantityOnHand : 0,
      reason: "Cycle count audit reconciliation",
    });
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-500" />
            Inventory & Spare Parts Master
          </h1>
          <p className="text-sm text-slate-400">
            Multi-warehouse stock control, SKU tracking, reorder alerts & immutable cost ledger
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory/movements"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 text-sm font-medium transition"
          >
            <Layers className="h-4 w-4 text-indigo-400" />
            Stock Ledger Audit
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            Add New Part
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Total Catalog SKUs</span>
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{parts.length}</div>
          <div className="text-xs text-slate-500 mt-1">Across all categories</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Estimated Stock Value</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrencyLKR(totalValuation)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Valued at standard unit cost</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{lowStockCount}</div>
          <div className="text-xs text-amber-500/80 mt-1">Below minimum reorder level</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Out of Stock</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{outOfStockCount}</div>
          <div className="text-xs text-rose-500/80 mt-1">Requires immediate purchase</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by SKU, Part Name, Brand or Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.partsCount})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${
              lowStockOnly
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Low Stock Only
          </button>
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 font-bold">✕</button>
        </div>
      )}

      {/* Parts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Part / SKU</th>
                <th className="py-3.5 px-4">Category & Brand</th>
                <th className="py-3.5 px-4 text-center">Unit</th>
                <th className="py-3.5 px-4 text-right">Cost Price</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-center">Stock Levels (On-Hand / Res / Avail)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading inventory parts...
                  </td>
                </tr>
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No parts match your filter criteria.
                  </td>
                </tr>
              ) : (
                parts.map((part) => {
                  const isOutOfStock = part.totalQOH === 0;
                  const isLow = part.isLowStock;

                  return (
                    <tr key={part.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{part.name}</div>
                        <div className="text-xs font-mono text-blue-400 flex items-center gap-1.5 mt-0.5">
                          <span>{part.sku}</span>
                          {part.barcode && <span className="text-slate-500">• {part.barcode}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{part.category.name}</div>
                        <div className="text-xs text-slate-400">{part.brand}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-300">
                        {part.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatCurrencyLKR(part.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                        {formatCurrencyLKR(part.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-white font-bold">{part.totalQOH}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-amber-400">{part.totalReserved}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-emerald-400 font-semibold">{part.totalAvailable}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Low Stock ({part.totalQOH} &le; {part.reorderLevel})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAdjustModal(part)}
                            title="Cycle Count Stock Adjustment"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          >
                            <Sliders className="h-4 w-4 text-amber-400" />
                          </button>
                          <Link
                            href={`/dashboard/inventory/parts/${part.id}`}
                            title="View Part 360"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          >
                            <Eye className="h-4 w-4 text-blue-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Part Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Add New Spare Part / SKU
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLT-OIL-002"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Barcode / OEM Part #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 04152-YZZA6"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Part Description / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Genuine Engine Oil Filter Element"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Brand / Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota OEM, Bosch"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Unit of Measure (UOM)
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="CAN">CAN (Cans)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Purchase / Cost Price (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Retail Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Reorder Trigger Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Initial Opening Stock Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Optional: Initial Opening Stock Balance
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Warehouse</label>
                    <select
                      value={formData.initialWarehouseId}
                      onChange={(e) => setFormData({ ...formData, initialWarehouseId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.branchName} - {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialQuantity}
                      onChange={(e) => setFormData({ ...formData, initialQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Unit Landed Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.initialUnitCost || formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, initialUnitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Part to Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedPartForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-400" />
                Physical Stock Adjustment
              </h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400">Target Part:</div>
                <div className="font-semibold text-white mt-0.5">{selectedPartForAdjust.name}</div>
                <div className="text-xs font-mono text-blue-400">{selectedPartForAdjust.sku}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Warehouse Location *
                </label>
                <select
                  required
                  value={adjustData.warehouseId}
                  onChange={(e) => setAdjustData({ ...adjustData, warehouseId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.branchName} — {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Actual Physical Counted Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={adjustData.countedQuantity}
                  onChange={(e) => setAdjustData({ ...adjustData, countedQuantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Audit Reason / Discrepancy Note *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Month-end physical audit variance reconciliation"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Adjusting..." : "Post Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
