"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Phone, Mail, MapPin, Store, CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    managerName: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.branches) setBranches(data.branches);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create branch");
      }

      setSuccessMsg(`Branch ${data.branch.name} (${data.branch.code}) successfully created with dedicated warehouse and cash register!`);
      setIsCreating(false);
      setFormData({ code: "", name: "", address: "", phone: "", email: "", managerName: "" });
      fetchBranches();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" /> Multi-Branch Network
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Isolated branch operations, distinct stock warehouses, and localized cash registers
          </p>
        </div>

        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Workshop Branch</span>
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">✕</button>
        </div>
      )}

      {/* New Branch Form */}
      {isCreating && (
        <Card className="border-blue-500/40 bg-white dark:bg-slate-900 shadow-md">
          <CardHeader>
            <CardTitle className="text-base text-blue-600 dark:text-blue-400">
              Register New Branch Location
            </CardTitle>
            <CardDescription className="text-xs">
              Every branch is automatically provisioned with its own default warehouse and reception register. Plan limits apply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Branch Code"
                  placeholder="e.g. GAL-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
                <Input
                  label="Branch Name"
                  placeholder="e.g. Galle Southern Service Center"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Branch Manager"
                  placeholder="e.g. Nuwan Kumara"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  placeholder="+94 91 223 9988"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Branch Email"
                  type="email"
                  placeholder="galle@apexautocare.lk"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Address"
                  placeholder="No. 88, Matara Road, Galle"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Provision Branch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {branches.map((b) => (
          <Card key={b.id} className="relative overflow-hidden hover:border-blue-500/50 transition-all">
            {b.isMain && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                Headquarters
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/50">
                  {b.code}
                </span>
                <Badge variant={b.status === "ACTIVE" ? "success" : "default"}>
                  {b.status}
                </Badge>
              </div>
              <CardTitle className="text-lg pt-1">{b.name}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1.5 pt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{b.address || "Sri Lanka"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Warehouses</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {b.warehouses?.length || 1}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Registers</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {b.cashRegisters?.length || 1}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Job Cards</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {b._count?.jobCards || 0}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.managerName && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Manager:</span>
                    <span>{b.managerName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
