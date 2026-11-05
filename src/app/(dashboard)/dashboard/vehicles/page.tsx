"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Car,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Fuel,
  Wrench,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateLK } from "@/lib/utils";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Registration Modal State
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    registrationNumber: "",
    vehicleType: "CAR",
    make: "",
    model: "",
    variant: "",
    year: new Date().getFullYear(),
    engineNumber: "",
    vinChassis: "",
    fuelType: "Petrol",
    transmission: "Automatic",
    mileage: 0,
    color: "",
    licenseExpiry: "",
    insuranceExpiry: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const [vehRes, custRes] = await Promise.all([
        fetch(`/api/vehicles?${params.toString()}`),
        fetch("/api/customers?limit=100"),
      ]);

      const vehData = await vehRes.json();
      const custData = await custRes.json();

      if (vehData.vehicles) setVehicles(vehData.vehicles);
      if (custData.customers) setCustomers(custData.customers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          year: formData.year ? parseInt(formData.year.toString(), 10) : null,
          mileage: parseInt(formData.mileage.toString(), 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register vehicle");

      setFormSuccess(`Vehicle ${data.vehicle.registrationNumber} (${data.vehicle.make} ${data.vehicle.model}) registered successfully!`);
      setIsRegistering(false);
      setFormData({
        customerId: "",
        registrationNumber: "",
        vehicleType: "CAR",
        make: "",
        model: "",
        variant: "",
        year: new Date().getFullYear(),
        engineNumber: "",
        vinChassis: "",
        fuelType: "Petrol",
        transmission: "Automatic",
        mileage: 0,
        color: "",
        licenseExpiry: "",
        insuranceExpiry: "",
        notes: "",
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
            <Car className="h-6 w-6 text-blue-600" /> Fleet Vehicle Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-brand workshop registry with normalized Sri Lankan license plates and complete service history
          </p>
        </div>

        <Button
          onClick={() => setIsRegistering(!isRegistering)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Vehicle</span>
        </Button>
      </div>

      {formSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{formSuccess}</span>
          <button onClick={() => setFormSuccess("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Vehicle Registration Drawer / Modal */}
      {isRegistering && (
        <Card className="border-blue-500/40 bg-white dark:bg-slate-900 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Car className="h-5 w-5" /> Vehicle Intake Registration
                </CardTitle>
                <CardDescription className="text-xs">
                  License plates are automatically normalized to official Sri Lankan format (e.g. WP CAB-1234, SP CAA-5678).
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsRegistering(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Vehicle Owner (Customer) *
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
                        {c.customerCode} • {c.type === "CORPORATE" && c.companyName ? c.companyName : `${c.firstName} ${c.lastName || ""}`} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Registration Number *"
                  placeholder="e.g. WP CAB-1234 or CAB-1234"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Vehicle Classification
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="CAR">Passenger Car</option>
                    <option value="SUV">SUV / Crossover</option>
                    <option value="VAN">Van / Minivan</option>
                    <option value="HYBRID">Hybrid Electric (HEV/PHEV)</option>
                    <option value="ELECTRIC">Pure Electric (BEV)</option>
                    <option value="MOTORCYCLE">Motorcycle</option>
                    <option value="THREE_WHEELER">Three Wheeler</option>
                    <option value="TRUCK">Commercial Truck</option>
                    <option value="BUS">Bus</option>
                  </select>
                </div>

                <Input
                  label="Manufacturer / Make *"
                  placeholder="e.g. Toyota, Honda, Nissan, Suzuki"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  required
                />

                <Input
                  label="Model *"
                  placeholder="e.g. Prius, Vezel, Axio, Alto, HiAce"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />

                <Input
                  label="Trim / Variant"
                  placeholder="e.g. S Touring, RS Sensing, Premium"
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                />

                <Input
                  label="Year of Manufacture"
                  type="number"
                  placeholder="e.g. 2018"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || 0 })}
                />

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Transmission
                  </label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                    <option value="e-CVT">e-CVT (Hybrid)</option>
                  </select>
                </div>

                <Input
                  label="Current Odometer Mileage (km) *"
                  type="number"
                  placeholder="e.g. 68450"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value, 10) || 0 })}
                  required
                />

                <Input
                  label="Color"
                  placeholder="e.g. Pearl White, Mica Black"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />

                <Input
                  label="Chassis / VIN Number"
                  placeholder="e.g. ZVW50-1092834"
                  value={formData.vinChassis}
                  onChange={(e) => setFormData({ ...formData, vinChassis: e.target.value })}
                />

                <Input
                  label="Engine Number"
                  placeholder="e.g. 2ZR-FXE-9921"
                  value={formData.engineNumber}
                  onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                />

                <Input
                  label="License Expiry Date"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                />

                <Input
                  label="Insurance Expiry Date"
                  type="date"
                  value={formData.insuranceExpiry}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRegistering(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Register Vehicle
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Plate (e.g. CAB-1234), Make, Model, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto max-w-full pb-1">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {["ALL", "CAR", "SUV", "VAN", "HYBRID", "ELECTRIC"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                typeFilter === t
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading vehicle fleet...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No vehicles found. Click "Register New Vehicle" to add one.
          </div>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id} className="hover:border-blue-500/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/50">
                    {v.registrationNumber}
                  </span>
                  <Badge variant={v.fuelType.toLowerCase().includes("hybrid") ? "info" : "default"}>
                    {v.vehicleType}
                  </Badge>
                </div>
                <CardTitle className="text-base pt-2 font-bold text-slate-900 dark:text-white">
                  {v.make} {v.model} {v.variant ? `(${v.variant})` : ""}
                </CardTitle>
                <CardDescription className="text-xs">
                  Year: {v.year || "N/A"} • Fuel: {v.fuelType} • {v.transmission}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Owner:</span>
                  <Link
                    href={`/dashboard/customers/${v.customer.id}`}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {v.customer.type === "CORPORATE" && v.customer.companyName
                      ? v.customer.companyName
                      : `${v.customer.firstName} ${v.customer.lastName || ""}`}
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Odometer Mileage:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {v.mileage.toLocaleString()} km
                  </span>
                </div>

                {v.vinChassis && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>VIN:</span>
                    <span className="truncate max-w-[170px]">{v.vinChassis}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link href={`/dashboard/vehicles/${v.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <span>360° History</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>

                  <Link href={`/dashboard/job-cards?vehicleId=${v.id}`}>
                    <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      <Wrench className="h-3.5 w-3.5 mr-1" />
                      <span>Intake Job</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
