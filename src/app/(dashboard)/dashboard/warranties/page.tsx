"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

interface Warranty {
  id: string;
  warrantyType: string;
  startDate: string;
  endDate: string;
  maxMileage: number;
  status: string;
  notes?: string | null;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
  };
  jobCard: {
    jobNumber: string;
  };
  claims: Array<{
    id: string;
    claimNumber: string;
    status: string;
    costBorne: number;
    claimDate: string;
  }>;
}

interface WarrantyClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  description: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  resolutionNotes?: string | null;
  costBorne: number;
  warranty: {
    id: string;
    warrantyType: string;
    startDate: string;
    endDate: string;
    maxMileage: number;
    customer: { firstName: string; lastName: string; phone: string };
    vehicle: { registrationNumber: string; make: string; model: string };
    jobCard: { jobNumber: string };
  };
}

export default function WarrantiesClaimsPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [activeTab, setActiveTab] = useState<"policies" | "claims">("policies");
  const [isLoading, setIsLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string>("");
  const [claimDesc, setClaimDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [wRes, cRes] = await Promise.all([
        fetch("/api/warranties"),
        fetch("/api/warranties/claims"),
      ]);
      const wData = await wRes.json();
      const cData = await cRes.json();
      if (wData.warranties) setWarranties(wData.warranties);
      if (cData.claims) setClaims(cData.claims);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/warranties/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyId: selectedWarrantyId,
          description: claimDesc,
        }),
      });
      if (res.ok) {
        setShowClaimModal(false);
        setClaimDesc("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveClaim = async (claimId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await fetch(`/api/warranties/claims?id=${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolutionNotes: `Claim ${status.toLowerCase()} by workshop manager`,
        }),
      });
      fetchData();
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
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              QUALITY ASSURANCE & GUARANTEES
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Service & Spare Parts Warranty Vault
          </h1>
          <p className="text-xs text-slate-400">
            Post-repair warranty policies, mileage ceilings, and customer guarantee claim dispute tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "policies"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Active Warranty Policies ({warranties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("claims")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "claims"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Disputes & Claims ({claims.length})</span>
        </button>
      </div>

      {/* Policies List */}
      {activeTab === "policies" && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Vehicle & Customer</th>
                <th className="px-4 py-3">Job Card Ref</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3 text-right">Mileage Ceiling</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {warranties.map((w) => (
                <tr key={w.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Car className="h-3.5 w-3.5 text-blue-400" />
                      <span>{w.vehicle.registrationNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {w.customer.firstName} {w.customer.lastName} ({w.customer.phone})
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-purple-400 font-bold">
                    {w.jobCard.jobNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {w.warrantyType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{formatDateLK(w.endDate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                    {w.maxMileage.toLocaleString()} km
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedWarrantyId(w.id);
                        setShowClaimModal(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                    >
                      File Claim
                    </button>
                  </td>
                </tr>
              ))}
              {warranties.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No active warranty policies issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Claims List */}
      {activeTab === "claims" && (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 space-y-3 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-400">{claim.claimNumber}</span>
                  <span className="text-xs text-white font-medium">
                    {claim.warranty.vehicle.registrationNumber} • {claim.warranty.customer.firstName}{" "}
                    {claim.warranty.customer.lastName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    claim.status === "APPROVED"
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                      : claim.status === "REJECTED"
                      ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                      : "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              <p className="text-xs text-slate-300">&quot;{claim.description}&quot;</p>

              {claim.status === "SUBMITTED" && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleResolveClaim(claim.id, "APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve Claim</span>
                  </button>
                  <button
                    onClick={() => handleResolveClaim(claim.id, "REJECTED")}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject Claim</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {claims.length === 0 && !isLoading && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No warranty claims submitted.
            </div>
          )}
        </div>
      )}

      {/* File Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFileClaim}
            className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">File Warranty Claim</h3>
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Claim Defect Description</label>
              <textarea
                required
                rows={4}
                placeholder="Describe failure or recurring issue..."
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="flex-1 bg-slate-900 text-slate-300 py-2.5 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold"
              >
                {isSubmitting ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
