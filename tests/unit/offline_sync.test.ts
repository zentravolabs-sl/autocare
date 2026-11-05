import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { offlineDB, SyncQueueItem } from "@/lib/offline/db";
import { enqueueOfflineAction } from "@/lib/offline/sync-manager";

describe("Phase 06: Dexie.js Offline Storage & Sync Queue", () => {
  beforeEach(async () => {
    await offlineDB.syncQueue.clear();
    await offlineDB.jobCards.clear();
    await offlineDB.parts.clear();
  });

  it("stores and retrieves offline cached job cards", async () => {
    await offlineDB.jobCards.put({
      id: "jc-101",
      jobNumber: "JC-2026-0001",
      organizationId: "org-1",
      stage: "INSPECTION_PENDING",
      customerName: "Sunil Perera",
      customerPhone: "+94771234567",
      vehiclePlate: "WP-CAB-1234",
      vehicleMake: "Toyota",
      vehicleModel: "Prius",
      tasks: [
        {
          id: "task-1",
          description: "Engine Oil Flush",
          status: "PENDING",
          estimatedHours: 1.5,
          actualHours: 0,
          hourlyRate: 4500,
        },
      ],
      syncedAt: Date.now(),
    });

    const cached = await offlineDB.jobCards.get("jc-101");
    expect(cached).toBeDefined();
    expect(cached?.jobNumber).toBe("JC-2026-0001");
    expect(cached?.tasks).toHaveLength(1);
  });

  it("enqueues offline sync operations with PENDING status", async () => {
    const queueId = await enqueueOfflineAction(
      "TASK_TIMELOG",
      "/api/job-cards/jc-101/tasks/task-1/time-log",
      "POST",
      { action: "START" }
    );

    expect(queueId).toMatch(/^sync-/);

    const queuedItem = await offlineDB.syncQueue.get(queueId);
    expect(queuedItem).toBeDefined();
    expect(queuedItem?.type).toBe("TASK_TIMELOG");
    expect(queuedItem?.status).toBe("PENDING");
    expect(queuedItem?.payload).toEqual({ action: "START" });
    expect(queuedItem?.retryCount).toBe(0);
  });

  it("counts pending queue items accurately", async () => {
    await enqueueOfflineAction("TASK_TIMELOG", "/api/tasks/1", "POST", { action: "START" });
    await enqueueOfflineAction("TASK_TIMELOG", "/api/tasks/1", "POST", { action: "PAUSE" });
    await enqueueOfflineAction("JOB_STAGE", "/api/job-cards/jc-101/stage", "PATCH", { stage: "WORK_IN_PROGRESS" });

    const pendingCount = await offlineDB.syncQueue.where("status").equals("PENDING").count();
    expect(pendingCount).toBe(3);
  });
});
