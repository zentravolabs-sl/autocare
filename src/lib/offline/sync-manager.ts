import { offlineDB, SyncQueueItem, OfflineJobCard, OfflinePart } from "./db";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

/**
 * Enqueue an operation to IndexedDB queue.
 * If online, immediately attempts a background sync dispatch.
 */
export async function enqueueOfflineAction(
  type: SyncQueueItem["type"],
  endpoint: string,
  method: SyncQueueItem["method"],
  payload: any
): Promise<string> {
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: SyncQueueItem = {
    id,
    type,
    endpoint,
    method,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "PENDING",
  };

  await offlineDB.syncQueue.add(item);

  // If online, trigger background flush without blocking caller
  if (typeof navigator !== "undefined" && navigator.onLine) {
    triggerBackgroundSync().catch(console.error);
  }

  return id;
}

/**
 * Flushes all pending queue items to the server sequentially (FIFO)
 * to preserve causal workflow order (e.g. advance stage, then log time).
 */
export async function triggerBackgroundSync(): Promise<{
  successCount: number;
  failureCount: number;
}> {
  const pendingItems = await offlineDB.syncQueue
    .where("status")
    .equals("PENDING")
    .sortBy("createdAt");

  let successCount = 0;
  let failureCount = 0;

  for (const item of pendingItems) {
    try {
      await offlineDB.syncQueue.update(item.id, { status: "SYNCING" });

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      // Success: dequeue item
      await offlineDB.syncQueue.delete(item.id);
      successCount++;
    } catch (err: any) {
      failureCount++;
      await offlineDB.syncQueue.update(item.id, {
        status: "FAILED",
        retryCount: item.retryCount + 1,
        lastError: err.message || "Network / Server error",
      });
      // Stop sequential replay on first failure to prevent out-of-order state corruption
      break;
    }
  }

  return { successCount, failureCount };
}

/**
 * Pre-cache critical workshop entities to IndexedDB for offline access.
 */
export async function cacheWorkshopDataOffline(): Promise<void> {
  try {
    const [jcRes, partRes] = await Promise.all([
      fetch("/api/job-cards?limit=50"),
      fetch("/api/inventory/parts?limit=100"),
    ]);

    if (jcRes.ok) {
      const data = await jcRes.json();
      if (data.jobCards) {
        const offlineCards: OfflineJobCard[] = data.jobCards.map((jc: any) => ({
          id: jc.id,
          jobNumber: jc.jobNumber,
          organizationId: jc.organizationId || "",
          stage: jc.stage,
          customerName: `${jc.customer?.firstName || ""} ${jc.customer?.lastName || ""}`.trim(),
          customerPhone: jc.customer?.phone || "",
          vehiclePlate: jc.vehicle?.registrationNumber || "",
          vehicleMake: jc.vehicle?.make || "",
          vehicleModel: jc.vehicle?.model || "",
          bayName: jc.bay?.name,
          assignedTechnician: jc.assignedTechnician?.name,
          tasks: jc.tasks || [],
          inspections: jc.inspections || [],
          syncedAt: Date.now(),
        }));
        await offlineDB.jobCards.bulkPut(offlineCards);
      }
    }

    if (partRes.ok) {
      const pData = await partRes.json();
      if (pData.parts) {
        const offlineParts: OfflinePart[] = pData.parts.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          unit: p.unit || "unit",
          sellingPrice: Number(p.sellingPrice || 0),
          totalAvailable: Number(p.totalAvailable || 0),
          syncedAt: Date.now(),
        }));
        await offlineDB.parts.bulkPut(offlineParts);
      }
    }
  } catch (err) {
    console.warn("Failed to pre-cache offline data:", err);
  }
}
