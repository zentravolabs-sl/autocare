import Dexie, { type EntityTable } from "dexie";

export interface OfflineJobCard {
  id: string;
  jobNumber: string;
  organizationId: string;
  stage: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  bayName?: string;
  assignedTechnician?: string;
  tasks: Array<{
    id: string;
    description: string;
    status: string;
    estimatedHours: number;
    actualHours: number;
    hourlyRate: number;
  }>;
  inspections?: Array<{
    id: string;
    category: string;
    itemName: string;
    condition: string;
    notes?: string;
  }>;
  syncedAt: number;
}

export interface OfflinePart {
  id: string;
  sku: string;
  name: string;
  brand: string;
  unit: string;
  sellingPrice: number;
  totalAvailable: number;
  syncedAt: number;
}

export interface SyncQueueItem {
  id: string;
  type: "JOB_STAGE" | "TASK_TIMELOG" | "INSPECTION_RECORD" | "POS_SALE";
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  payload: any;
  createdAt: number;
  retryCount: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  lastError?: string;
}

class AutoCareOfflineDB extends Dexie {
  jobCards!: EntityTable<OfflineJobCard, "id">;
  parts!: EntityTable<OfflinePart, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("AutoCarePro_OfflineDB");
    this.version(1).stores({
      jobCards: "id, jobNumber, organizationId, stage, vehiclePlate",
      parts: "id, sku, name, brand",
      syncQueue: "id, type, status, createdAt",
    });
  }
}

export const offlineDB = new AutoCareOfflineDB();
