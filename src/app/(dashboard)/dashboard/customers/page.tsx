"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Car,
  Building,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Registration Modal State
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    type: "INDIVIDUAL",
    firstName: "",
    lastName: "",
    companyName: "",
    taxNumber: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    creditLimit: 0,
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register customer");

      setFormSuccess(`Customer ${data.customer.firstName} (${data.customer.customerCode}) registered successfully!`);
      setIsRegistering(false);
      setFormData({
        type: "INDIVIDUAL",
        firstName: "",
        lastName: "",
        companyName: "",
        taxNumber: "",
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        creditLimit: 0,
        notes: "",
      });
      fetchCustomers();
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
            <Users className="h-6 w-6 text-blue-600" /> Customer Management Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Individual and corporate fleet accounts with vehicle profiles and credit balances
          </p>
        </div>

        <Button
          onClick={() => setIsRegistering(!isRegistering)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Customer</span>
        </Button>
      </div>

      {formSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{formSuccess}</span>
          <button onClick={() => setFormSuccess("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Customer Registration Drawer / Modal */}
      {isRegistering && (
        <Card className="border-blue-500/40 bg-white dark:bg-slate-900 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Users className="h-5 w-5" /> Customer Intake & Registration
                </CardTitle>
                <CardDescription className="text-xs">
                  Generates an auto-incremented customer code and links multi-vehicle records.
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
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Account Type:</span>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="INDIVIDUAL"
                    checked={formData.type === "INDIVIDUAL"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <span>Individual Vehicle Owner</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="CORPORATE"
                    checked={formData.type === "CORPORATE"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <span>Corporate Fleet / Company</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label={formData.type === "CORPORATE" ? "Contact Person / Rep" : "First Name"}
                  placeholder="e.g. Dinesh"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="e.g. Fernando"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
                {formData.type === "CORPORATE" && (
                  <Input
                    label="Company Name"
                    placeholder="e.g. Lanka Logistics Express (Pvt) Ltd"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                )}
                <Input
                  label="Primary Phone (Required)"
                  placeholder="+94 77 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
                <Input
                  label="WhatsApp Number"
                  placeholder="+94 77 123 4567"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="dinesh@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Tax / VAT Number"
                  placeholder="e.g. VAT-10928374-7000"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                />
                <Input
                  label="Credit Limit (LKR)"
                  type="number"
                  placeholder="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Residential / Billing Address"
                  placeholder="No. 12, Flower Road, Colombo 07"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRegistering(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Save Customer Record
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
              placeholder="Search by Name, Phone, Code, or Plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Accounts</option>
            <option value="INDIVIDUAL">Individuals</option>
            <option value="CORPORATE">Corporate Fleets</option>
          </select>
        </div>
      </div>

      {/* Customer List Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Customer / Code</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Account Type</th>
                  <th className="px-6 py-3.5">Registered Vehicles</th>
                  <th className="px-6 py-3.5 text-right">Outstanding Balance</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Loading customer directory...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors text-sm"
                          >
                            {c.type === "CORPORATE" && c.companyName ? c.companyName : `${c.firstName} ${c.lastName || ""}`}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/50 font-bold">
                              {c.customerCode}
                            </span>
                            {c.type === "CORPORATE" && (
                              <span className="text-[10px] text-slate-400">Rep: {c.firstName}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[180px]">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={c.type === "CORPORATE" ? "info" : "default"}>
                          {c.type}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.vehicles?.length === 0 ? (
                            <span className="text-slate-400 italic">No vehicles</span>
                          ) : (
                            c.vehicles?.map((v: any) => (
                              <Link
                                key={v.id}
                                href={`/dashboard/vehicles/${v.id}`}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                              >
                                <Car className="h-3 w-3" />
                                <span>{v.registrationNumber}</span>
                              </Link>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold ${Number(c.outstandingBalance) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {formatCurrencyLKR(c.outstandingBalance)}
                        </span>
                        {Number(c.creditLimit) > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            Limit: {formatCurrencyLKR(c.creditLimit)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/customers/${c.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                              <span>360° Profile</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
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
  );
}
