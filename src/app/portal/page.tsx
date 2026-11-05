"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Car,
  Search,
  ShieldCheck,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Phone,
  ArrowRight,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

export default function CustomerPortalTrackingPage() {
  const [searchPhone, setSearchPhone] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [customerData, setCustomerData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone && !searchPlate) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchPhone) params.set("phone", searchPhone);
      if (searchPlate) params.set("plate", searchPlate);

      const res = await fetch(`/api/portal/track?${params.toString()}`);
      const data = await res.json();
      setCustomerData(data.customer || null);
    } catch (e) {
      console.error(e);
      setCustomerData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080E20] text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold tracking-widest uppercase">
            AUTOCARE PRO • CLIENT SERVICE PORTAL
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Live Vehicle Repair Tracker & Service History
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Check real-time workshop repair stage, pending estimates, inspection reports and active warranties
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Customer Mobile Phone
              </label>
              <input
                type="text"
                placeholder="e.g. +94 77 123 4567"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                placeholder="e.g. WP CAB-1234"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isLoading || (!searchPhone && !searchPlate)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" />
                <span>Track</span>
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="py-16 text-center text-slate-400 text-xs">
            Querying workshop telematics and service ledger...
          </div>
        )}

        {!isLoading && hasSearched && !customerData && (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Vehicle Records Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t locate any service history with those details. Please check your phone number or license plate.
            </p>
          </div>
        )}

        {!isLoading && customerData && (
          <div className="space-y-6">
            {/* Customer Header */}
            <div className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">
                  VERIFIED CLIENT PROFILE
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{customerData.name}</h2>
                <p className="text-xs text-slate-400">{customerData.phone} {customerData.email && `• ${customerData.email}`}</p>
              </div>

              {customerData.outstandingBalance > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 sm:text-right">
                  <span className="text-[10px] text-amber-300 font-mono">Outstanding Account Balance</span>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {formatCurrencyLKR(customerData.outstandingBalance)}
                  </div>
                </div>
              )}
            </div>

            {/* Active Workshop Repairs */}
            {customerData.activeRepairs && customerData.activeRepairs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>ACTIVE WORKSHOP REPAIRS IN PROGRESS</span>
                </h3>

                <div className="space-y-3">
                  {customerData.activeRepairs.map((jc: any) => (
                    <div
                      key={jc.id}
                      className="p-5 rounded-2xl bg-[#0B132B] border border-emerald-500/40 space-y-3 shadow-xl"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-bold text-white">
                            {jc.vehicle.registrationNumber} ({jc.vehicle.make} {jc.vehicle.model})
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                          {jc.stage.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400">Job Card #: </span>
                          <span className="font-mono font-bold text-purple-400">{jc.jobNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Mileage Recorded: </span>
                          <span className="font-mono text-white">{jc.currentMileage.toLocaleString()} km</span>
                        </div>
                        {jc.customerComplaints && (
                          <p className="text-[11px] text-slate-400 italic mt-1">
                            &quot;{jc.customerComplaints}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Fleet & Warranties */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span>REGISTERED VEHICLES & WARRANTIES</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customerData.vehicles.map((v: any) => (
                  <div key={v.id} className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-white">
                        {v.registrationNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{v.fuelType}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                    </p>
                    <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      Last Recorded: {v.mileage.toLocaleString()} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Service History */}
            {customerData.pastRepairs && customerData.pastRepairs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <span>COMPLETED SERVICE HISTORY</span>
                </h3>

                <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Job #</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Mileage</th>
                        <th className="px-4 py-3 text-right">Invoiced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {customerData.pastRepairs.map((jc: any) => (
                        <tr key={jc.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 text-purple-400 font-bold">{jc.jobNumber}</td>
                          <td className="px-4 py-3 text-white">{jc.vehicle.registrationNumber}</td>
                          <td className="px-4 py-3 text-slate-400">{formatDateLK(jc.receivedAt)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                            {jc.currentMileage.toLocaleString()} km
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {jc.invoices?.[0] ? formatCurrencyLKR(Number(jc.invoices[0].totalAmount)) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
