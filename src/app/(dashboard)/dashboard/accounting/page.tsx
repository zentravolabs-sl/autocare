"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  Layers,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<"trial-balance" | "pnl" | "balance-sheet" | "journal">("trial-balance");
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "journal") {
        const res = await fetch("/api/accounting/journal?limit=50");
        const data = await res.json();
        if (data.entries) setJournalData(data.entries);
      } else {
        const params = new URLSearchParams({ type: activeTab });
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        const res = await fetch(`/api/accounting/reports?${params.toString()}`);
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">
              GENERAL LEDGER & FINANCIALS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Double-Entry Financial Statements</h1>
          <p className="text-xs text-slate-400">
            Real-time IFRS/LKAS standard Trial Balance, Profit & Loss, Balance Sheet & Journal Audit Trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={fetchReports}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh Financials"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("trial-balance")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "trial-balance"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Trial Balance</span>
          </button>

          <button
            onClick={() => setActiveTab("pnl")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "pnl"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Profit & Loss (P&L)</span>
          </button>

          <button
            onClick={() => setActiveTab("balance-sheet")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "balance-sheet"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Balance Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "journal"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>General Journal</span>
          </button>
        </div>

        {activeTab === "pnl" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-xs"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-xs"
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-slate-400 text-xs">
          Computing accounts ledger sums and closing balances...
        </div>
      )}

      {/* Trial Balance Tab */}
      {!isLoading && activeTab === "trial-balance" && reportData && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Trial Balance Audit</h3>
              <p className="text-xs text-slate-400">Debits must strictly equal credits across all five account heads</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                reportData.isBalanced
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                  : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
              }`}
            >
              {reportData.isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{reportData.isBalanced ? "BALANCED" : "UNBALANCED"}</span>
            </div>
          </div>

          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Debit (LKR)</th>
                <th className="px-4 py-3 text-right">Credit (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reportData.lines.map((line: any) => (
                <tr key={line.code} className="hover:bg-slate-900/50">
                  <td className="px-4 py-2.5 font-bold text-blue-400">{line.code}</td>
                  <td className="px-4 py-2.5 text-slate-200">{line.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] text-slate-400">{line.type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">
                    {line.debit > 0 ? formatCurrencyLKR(line.debit) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-400">
                    {line.credit > 0 ? formatCurrencyLKR(line.credit) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-700 bg-[#080E20] font-black text-white text-sm">
              <tr>
                <td colSpan={3} className="px-4 py-3">
                  TOTALS
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {formatCurrencyLKR(reportData.totalDebit)}
                </td>
                <td className="px-4 py-3 text-right text-amber-400">
                  {formatCurrencyLKR(reportData.totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Profit & Loss Tab */}
      {!isLoading && activeTab === "pnl" && reportData && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Statement of Profit & Loss</h3>
            <p className="text-xs text-slate-400">Operating revenues less direct cost of sales and expenses</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase border-b border-slate-800 pb-2">
                OPERATING REVENUES
              </h4>
              <div className="space-y-2">
                {reportData.revenue.map((r: any) => (
                  <div key={r.code} className="flex justify-between text-xs">
                    <span className="text-slate-300 font-mono">
                      {r.code} - {r.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrencyLKR(r.amount)}</span>
                  </div>
                ))}
                {reportData.revenue.length === 0 && (
                  <div className="text-xs text-slate-500 italic">No revenue recorded in this period</div>
                )}
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-xs">
                <span>Total Revenues</span>
                <span className="font-mono text-emerald-400">{formatCurrencyLKR(reportData.totalRevenue)}</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold tracking-wider text-rose-400 uppercase border-b border-slate-800 pb-2">
                COST OF SALES & EXPENSES
              </h4>
              <div className="space-y-2">
                {reportData.expenses.map((e: any) => (
                  <div key={e.code} className="flex justify-between text-xs">
                    <span className="text-slate-300 font-mono">
                      {e.code} - {e.name}
                    </span>
                    <span className="font-mono font-bold text-rose-400">{formatCurrencyLKR(e.amount)}</span>
                  </div>
                ))}
                {reportData.expenses.length === 0 && (
                  <div className="text-xs text-slate-500 italic">No expenses recorded in this period</div>
                )}
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-xs">
                <span>Total Expenses</span>
                <span className="font-mono text-rose-400">{formatCurrencyLKR(reportData.totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-700 pt-4 flex justify-between items-baseline bg-slate-900/60 p-4 rounded-xl">
            <div>
              <span className="text-sm font-bold text-white">NET OPERATING PROFIT / (LOSS)</span>
              <p className="text-[11px] text-slate-400">Transferred automatically to Owner&apos;s Equity on Balance Sheet</p>
            </div>
            <span
              className={`text-2xl font-mono font-black ${
                reportData.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatCurrencyLKR(reportData.netProfit)}
            </span>
          </div>
        </div>
      )}

      {/* Balance Sheet Tab */}
      {!isLoading && activeTab === "balance-sheet" && reportData && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Statement of Financial Position</h3>
              <p className="text-xs text-slate-400">Total Assets = Total Liabilities + Owner&apos;s Equity</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                reportData.isBalanced
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                  : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
              }`}
            >
              {reportData.isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{reportData.isBalanced ? "EQUATION BALANCED" : "UNBALANCED"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase border-b border-slate-800 pb-2">
                ASSETS
              </h4>
              <div className="space-y-2">
                {reportData.assets.map((a: any) => (
                  <div key={a.code} className="flex justify-between text-xs">
                    <span className="text-slate-300 font-mono">
                      {a.code} - {a.name}
                    </span>
                    <span className="font-mono font-bold text-blue-400">{formatCurrencyLKR(a.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-sm">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-blue-400">{formatCurrencyLKR(reportData.totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-4">
              {/* Liabilities */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase border-b border-slate-800 pb-2">
                  LIABILITIES
                </h4>
                <div className="space-y-2">
                  {reportData.liabilities.map((l: any) => (
                    <div key={l.code} className="flex justify-between text-xs">
                      <span className="text-slate-300 font-mono">
                        {l.code} - {l.name}
                      </span>
                      <span className="font-mono font-bold text-amber-400">{formatCurrencyLKR(l.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-xs">
                  <span>Total Liabilities</span>
                  <span className="font-mono text-amber-400">{formatCurrencyLKR(reportData.totalLiabilities)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase border-b border-slate-800 pb-2">
                  EQUITY
                </h4>
                <div className="space-y-2">
                  {reportData.equity.map((eq: any) => (
                    <div key={eq.code} className="flex justify-between text-xs">
                      <span className="text-slate-300 font-mono">
                        {eq.code} - {eq.name}
                      </span>
                      <span className="font-mono font-bold text-purple-400">{formatCurrencyLKR(eq.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 font-mono">Current Period Retained Earnings</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrencyLKR(reportData.earnings)}</span>
                  </div>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-xs">
                  <span>Total Equity</span>
                  <span className="font-mono text-purple-400">{formatCurrencyLKR(reportData.totalEquity)}</span>
                </div>
              </div>

              <div className="border-t-2 border-slate-700 pt-2 flex justify-between font-bold text-white text-sm">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrencyLKR(reportData.totalLiabilities + reportData.totalEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Journal Tab */}
      {!isLoading && activeTab === "journal" && (
        <div className="space-y-3">
          {journalData.map((je: any) => (
            <div key={je.id} className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-purple-400 text-sm">{je.entryNumber}</span>
                  <span className="text-xs text-slate-300 font-semibold">{je.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  {je.referenceType && (
                    <span className="font-mono text-[10px] bg-slate-900 border border-slate-800 text-blue-300 px-2 py-0.5 rounded">
                      {je.referenceType}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-400">{formatDateTimeLK(je.date)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800/80">
                    <tr>
                      <th className="py-1 px-2">Account</th>
                      <th className="py-1 px-2">Line Memo</th>
                      <th className="py-1 px-2 text-right">Debit</th>
                      <th className="py-1 px-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {je.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td className="py-1.5 px-2 text-white">
                          <span className="text-blue-400 font-bold">{l.accountCode}</span> - {l.accountName}
                        </td>
                        <td className="py-1.5 px-2 text-slate-400 text-[11px]">{l.description || "-"}</td>
                        <td className="py-1.5 px-2 text-right text-emerald-400">
                          {l.debit > 0 ? formatCurrencyLKR(l.debit) : "-"}
                        </td>
                        <td className="py-1.5 px-2 text-right text-amber-400">
                          {l.credit > 0 ? formatCurrencyLKR(l.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {journalData.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No journal entries posted yet. Finalize an invoice or record payments to generate entries.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
