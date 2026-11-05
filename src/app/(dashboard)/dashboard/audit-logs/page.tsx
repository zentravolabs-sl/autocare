"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Activity,
  User,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  FileText,
} from "lucide-react";
import { formatDateTimeLK } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user: string;
  userEmail?: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              SECURITY AUDIT & COMPLIANCE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Immutable Audit Trail & Security Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Chronological audit recording of all ledger modifications, billing overrides, job transitions, and role access
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0B132B] border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono"
          >
            <option value="">All Entities</option>
            <option value="JOB_CARD">JOB_CARD</option>
            <option value="INVOICE">INVOICE</option>
            <option value="STOCK_LEDGER">STOCK_LEDGER</option>
            <option value="JOURNAL_ENTRY">JOURNAL_ENTRY</option>
            <option value="USER">USER</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="FINALIZE">FINALIZE</option>
            <option value="POST_LEDGER">POST_LEDGER</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs font-mono text-slate-300">
          <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor / User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Entity ID</th>
              <th className="px-4 py-3">IP / Client</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-2.5 text-slate-400">
                  {formatDateTimeLK(log.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-white font-bold">{log.user}</span>
                  {log.userEmail && <div className="text-[10px] text-slate-500">{log.userEmail}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      log.action.includes("CREATE") || log.action.includes("FINALIZE")
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                        : log.action.includes("DELETE")
                        ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                        : "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-200">{log.entity}</td>
                <td className="px-4 py-2.5 text-purple-400 text-[11px]">
                  {log.entityId ? log.entityId.slice(0, 14) + "..." : "-"}
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-[10px]">
                  {log.ipAddress || "Internal Server"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                  No audit logs matching current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
