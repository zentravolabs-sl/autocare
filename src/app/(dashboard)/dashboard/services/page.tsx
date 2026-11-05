"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Tag,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyLKR } from "@/lib/utils";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Create Service Modal
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    categoryId: "",
    standardLaborHours: 1.5,
    laborRate: 5000,
    warrantyDays: 30,
    warrantyMileage: 1000,
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (selectedCategory !== "ALL") params.set("categoryId", selectedCategory);

      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      if (data.services) setServices(data.services);
      if (data.categories) {
        setCategories(data.categories);
        if (!formData.categoryId && data.categories.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: data.categories[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          standardLaborHours: parseFloat(formData.standardLaborHours.toString()) || 1.0,
          laborRate: parseFloat(formData.laborRate.toString()) || 4500,
          estimatedPrice: (parseFloat(formData.standardLaborHours.toString()) || 1.0) * (parseFloat(formData.laborRate.toString()) || 4500),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create service");

      setSuccessMsg(`Service ${data.service.name} (${data.service.code}) created successfully!`);
      setIsCreating(false);
      setFormData({
        code: "",
        name: "",
        description: "",
        categoryId: categories[0]?.id || "",
        standardLaborHours: 1.5,
        laborRate: 5000,
        warrantyDays: 30,
        warrantyMileage: 1000,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-600" /> Mechanical Services Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standard labor hours, hourly rate schedules, required skills, and warranty specifications
          </p>
        </div>

        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Service</span>
        </Button>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Add Service Modal */}
      {isCreating && (
        <Card className="border-blue-500/40 bg-white dark:bg-slate-900 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                  Register New Mechanical Service
                </CardTitle>
                <CardDescription className="text-xs">
                  Set standard labor times and pricing for consistent estimate and billing calculations.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Service Code"
                  placeholder="e.g. SRV-ENG-02"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
                <Input
                  label="Service Name"
                  placeholder="e.g. Engine Timing Belt & Water Pump Replacement"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Standard Labor Hours"
                  type="number"
                  step="0.1"
                  value={formData.standardLaborHours}
                  onChange={(e) => setFormData({ ...formData, standardLaborHours: parseFloat(e.target.value) || 1.0 })}
                  required
                />

                <Input
                  label="Labor Rate per Hour (LKR)"
                  type="number"
                  value={formData.laborRate}
                  onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) || 4500 })}
                  required
                />

                <div className="sm:col-span-3">
                  <Input
                    label="Description & Procedure Checklist"
                    placeholder="Includes tensioner pulley check, coolant drain & refill, and leak pressure test"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Save Service to Catalog
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading services catalog...
          </div>
        ) : (
          services.map((s) => (
            <Card key={s.id} className="hover:border-blue-500/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50">
                    {s.code}
                  </span>
                  <Badge variant="outline">{s.category.name}</Badge>
                </div>
                <CardTitle className="text-base pt-2 font-bold text-slate-900 dark:text-white">
                  {s.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {s.description || "Standard mechanical workshop service operation"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Standard Labor Time:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {Number(s.standardLaborHours)} Hours
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Base Labor Rate:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrencyLKR(s.laborRate)} / hr
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Total:</span>
                  <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                    {formatCurrencyLKR(s.estimatedPrice)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
