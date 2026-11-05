"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Car,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Wrench,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Bay {
  id: string;
  code: string;
  name: string;
  bayType: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  branch: {
    id: string;
    name: string;
    code: string;
  };
  activeJobCard?: {
    id: string;
    jobNumber: string;
    stage: string;
    priority: string;
    vehicle: {
      registrationNumber: string;
      make: string;
      model: string;
    };
  } | null;
}

export default function BaysPage() {
  const [bays, setBays] = useState<Bay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBay, setNewBay] = useState({
    code: "",
    name: "",
    bayType: "MECHANICAL",
  });

  const fetchBays = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bays");
      const data = await res.json();
      if (data.bays) setBays(data.bays);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBays();
  }, []);

  const handleCreateBay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBay),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewBay({ code: "", name: "", bayType: "MECHANICAL" });
        fetchBays();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMaintenance = async (bayId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    try {
      await fetch(`/api/bays/${bayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchBays();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              WORKSHOP ASSETS & LIFTS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Workshop Bay Management & Live Floor</h1>
          <p className="text-xs text-slate-400">Real-time bay occupancy, lift allocation and maintenance scheduling</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Workshop Bay</span>
          </button>
          <button
            onClick={fetchBays}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Floor Bays Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bays.map((bay) => (
          <div
            key={bay.id}
            className={`p-5 rounded-2xl border transition-all space-y-4 shadow-xl ${
              bay.status === "OCCUPIED"
                ? "bg-[#0B132B] border-blue-500/50 shadow-blue-500/10"
                : bay.status === "MAINTENANCE"
                ? "bg-amber-950/20 border-amber-800/60"
                : "bg-[#0B132B]/80 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-900 border border-slate-800 text-blue-400 px-2 py-0.5 rounded">
                  {bay.code}
                </span>
                <span className="text-xs font-mono text-slate-400">{bay.bayType}</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  bay.status === "AVAILABLE"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                    : bay.status === "OCCUPIED"
                    ? "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                    : "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                }`}
              >
                {bay.status}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{bay.name}</h3>
              <p className="text-xs text-slate-400">{bay.branch.name}</p>
            </div>

            {/* Active Allocation Card */}
            {bay.activeJobCard ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-400">
                    {bay.activeJobCard.jobNumber}
                  </span>
                  <span className="text-[10px] font-mono text-blue-300">
                    {bay.activeJobCard.stage.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white font-medium">
                  <Car className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {bay.activeJobCard.vehicle.registrationNumber} ({bay.activeJobCard.vehicle.make}{" "}
                    {bay.activeJobCard.vehicle.model})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                {bay.status === "MAINTENANCE" ? "Bay Under Maintenance / Calibration" : "Bay Ready for Vehicle Reception"}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => handleToggleMaintenance(bay.id, bay.status)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {bay.status === "MAINTENANCE" ? "End Maintenance" : "Flag Maintenance"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {bays.length === 0 && !isLoading && (
        <div className="py-16 text-center text-slate-500 text-xs">
          No workshop bays registered. Click &quot;Add Workshop Bay&quot; to configure your service center lifts.
        </div>
      )}

      {/* Create Bay Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBay}
            className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Register Workshop Bay</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Bay Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BAY-01"
                  value={newBay.code}
                  onChange={(e) => setNewBay({ ...newBay, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Bay Name / Lift Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Two-Post Hydraulic Lift 1"
                  value={newBay.name}
                  onChange={(e) => setNewBay({ ...newBay, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Bay Type</label>
                <select
                  value={newBay.bayType}
                  onChange={(e) => setNewBay({ ...newBay, bayType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 outline-none"
                >
                  <option value="MECHANICAL">Mechanical Repair</option>
                  <option value="ELECTRICAL">Electrical & Hybrid</option>
                  <option value="ALIGNMENT">Wheel Alignment & Tire</option>
                  <option value="DIAGNOSTIC">Diagnostic & Scanner</option>
                  <option value="WASH">Washing & Detailing</option>
                  <option value="GENERAL">General Express Service</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-900 text-slate-300 py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold"
              >
                {isSubmitting ? "Creating..." : "Save Workshop Bay"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
