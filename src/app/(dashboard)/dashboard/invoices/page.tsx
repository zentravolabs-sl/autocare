"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Layers,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: "DRAFT" | "FINALIZED" | "PAID" | "PARTIAL" | "CANCELLED" | "REFUNDED";
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string | null;
    phone: string;
  };
  jobCard?: {
    id: string;
    jobNumber: string;
  } | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  createdAt: string;
  finalizedAt?: string | null;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [outstandingTotal, setOutstandingTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
        setOutstandingTotal(data.outstandingTotal || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <FileText className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              BILLING & RECEIVABLES
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Tax Invoices Master Ledger</h1>
          <p className="text-xs text-slate-400">Manage workshop repair invoices, counter sales, payments & AR ledger</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pos"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            <DollarSign className="h-4 w-4" />
            <span>Open POS Checkout</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Unsettled AR Balance</span>
            <div className="text-2xl font-mono font-black text-amber-400 mt-1">
              {formatCurrencyLKR(outstandingTotal)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Invoices Listed</span>
            <div className="text-2xl font-mono font-black text-white mt-1">
              {invoices.length}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Sri Lanka VAT Standard</span>
            <div className="text-2xl font-mono font-black text-emerald-400 mt-1">
              18.00%
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B132B] border border-slate-800 p-3 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="FINALIZED">FINALIZED (Unpaid)</option>
            <option value="PARTIAL">PARTIALLY PAID</option>
            <option value="PAID">PAID IN FULL</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button
            onClick={fetchInvoices}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh Invoices"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-blue-400">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">
                      {inv.customer?.firstName} {inv.customer?.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500">{inv.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {inv.jobCard ? (
                      <span className="font-mono text-[10px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                        {inv.jobCard.jobNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">COUNTER POS</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        inv.status === "PAID"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                          : inv.status === "FINALIZED"
                          ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                          : inv.status === "PARTIAL"
                          ? "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                          : inv.status === "DRAFT"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                    {formatCurrencyLKR(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {formatCurrencyLKR(inv.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                    {formatCurrencyLKR(inv.balanceAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDateLK(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <span>View</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No tax invoices found. Invoices are generated automatically from Job Cards or POS Fast Checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
