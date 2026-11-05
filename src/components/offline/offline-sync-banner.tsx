"use client";

import React, { useState, useEffect } from "react";
import { offlineDB } from "@/lib/offline/db";
import { triggerBackgroundSync, cacheWorkshopDataOffline } from "@/lib/offline/sync-manager";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

export function OfflineSyncStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial cache warm-up if online
    if (navigator.onLine) {
      cacheWorkshopDataOffline().catch(console.error);
    }

    // Monitor sync queue count
    const interval = setInterval(async () => {
      try {
        const count = await offlineDB.syncQueue.where("status").equals("PENDING").count();
        setPendingCount(count);
      } catch (e) {
        // DB might be closed or uninitialized
      }
    }, 2000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setLastSyncResult(null);
    try {
      const res = await triggerBackgroundSync();
      if (res.successCount > 0) {
        setLastSyncResult(`Synced ${res.successCount} queued item(s)`);
      } else if (res.failureCount > 0) {
        setLastSyncResult(`Sync paused: network or conflict encountered`);
      }
      const count = await offlineDB.syncQueue.where("status").equals("PENDING").count();
      setPendingCount(count);
    } catch (err: any) {
      setLastSyncResult(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !lastSyncResult) {
    return null; // Clean minimal display when fully synced
  }

  return (
    <div
      className={`w-full py-1.5 px-4 text-xs font-mono flex items-center justify-between border-b transition-colors z-40 ${
        !isOnline
          ? "bg-amber-950/90 text-amber-300 border-amber-800/80"
          : pendingCount > 0
          ? "bg-blue-950/90 text-blue-300 border-blue-800/80"
          : "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-bold">OFFLINE MODE:</span>
            <span>Workshop terminal active. Modifications queued to IndexedDB.</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-bold">BACKGROUND SYNC:</span>
            <span>{pendingCount} operation(s) waiting to sync.</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>{lastSyncResult || "All workshop operations synced."}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {pendingCount > 0 && isOnline && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700/60 px-2 py-0.5 rounded text-[11px] font-bold text-white transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
