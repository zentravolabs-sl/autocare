"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  Play,
  Pause,
  Check,
  Clock,
  Car,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { enqueueOfflineAction } from "@/lib/offline/sync-manager";

export default function TechnicianMobileConsolePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/job-cards?limit=20");
      const data = await res.json();
      if (data.jobCards) {
        // Flatten tasks
        const allTasks: any[] = [];
        for (const jc of data.jobCards) {
          // fetch details
          const detailRes = await fetch(`/api/job-cards/${jc.id}`);
          const detail = await detailRes.json();
          if (detail.jobCard?.tasks) {
            for (const t of detail.jobCard.tasks) {
              allTasks.push({
                ...t,
                jobCardNumber: detail.jobCard.jobNumber,
                vehiclePlate: detail.jobCard.vehicle.registrationNumber,
                vehicleModel: `${detail.jobCard.vehicle.make} ${detail.jobCard.vehicle.model}`,
                bayName: detail.jobCard.bay?.name || "General Bay",
              });
            }
          }
        }
        setTasks(allTasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTimeLog = async (jobCardId: string, taskId: string, action: "START" | "PAUSE" | "COMPLETE") => {
    setActionNotice(null);
    const endpoint = `/api/job-cards/${jobCardId}/tasks/${taskId}/time-log`;
    const payload = { action };

    if (!navigator.onLine) {
      // Offline fallback: enqueue to Dexie IndexedDB
      try {
        await enqueueOfflineAction("TASK_TIMELOG", endpoint, "POST", payload);
        // Optimistically update local task state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: action === "START" ? "IN_PROGRESS" : action === "COMPLETE" ? "COMPLETED" : "PENDING",
                }
              : t
          )
        );
        setActionNotice(`Offline: Clock ${action.toLowerCase()} recorded locally. Queued for sync.`);
      } catch (err: any) {
        setActionNotice(`Failed to record offline action: ${err.message}`);
      }
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);

      setActionNotice(`Task successfully ${action.toLowerCase()}ed!`);
      fetchTasks();
    } catch (err: any) {
      // If network failed midway, fall back to offline enqueue
      try {
        await enqueueOfflineAction("TASK_TIMELOG", endpoint, "POST", payload);
        setActionNotice(`Network dropped: action saved locally and queued for background sync.`);
      } catch (queueErr: any) {
        setActionNotice(err.message);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4 space-y-4 font-sans pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
          <ChevronLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
            🔧
          </div>
          <span className="text-xs font-bold text-white">Technician Station</span>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs text-blue-300">
          {actionNotice}
        </div>
      )}

      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-500" /> Active Assigned Tasks
        </h1>
        <p className="text-xs text-slate-400">
          Mobile bay terminal for clocking in/out of repair operations
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Syncing assigned repair tasks...
        </div>
      ) : tasks.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 text-center p-8">
          <p className="text-xs text-slate-400">No active mechanical tasks assigned to your terminal.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`bg-slate-900 border-slate-800 transition-all ${
                task.status === "IN_PROGRESS"
                  ? "border-l-4 border-l-blue-500 ring-1 ring-blue-500/30"
                  : ""
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                    {task.vehiclePlate}
                  </span>
                  <Badge
                    variant={
                      task.status === "COMPLETED"
                        ? "success"
                        : task.status === "IN_PROGRESS"
                        ? "info"
                        : "warning"
                    }
                    className="text-[10px]"
                  >
                    {task.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{task.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{task.vehicleModel} • {task.bayName}</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>Est. Time: <strong>{task.estimatedHours}h</strong></span>
                  <span>Logged: <strong className="font-mono text-white">{task.actualHours || 0}h</strong></span>
                </div>

                {/* Big Touch-Friendly Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
                    <Button
                      onClick={() => handleTimeLog(task.jobCardId, task.id, "START")}
                      className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Start Work Timer</span>
                    </Button>
                  )}

                  {task.status === "IN_PROGRESS" && (
                    <>
                      <Button
                        onClick={() => handleTimeLog(task.jobCardId, task.id, "PAUSE")}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 gap-2"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause Work</span>
                      </Button>
                      <Button
                        onClick={() => handleTimeLog(task.jobCardId, task.id, "COMPLETE")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 gap-2 shadow-lg shadow-blue-600/30"
                      >
                        <Check className="h-4 w-4" />
                        <span>Complete Task</span>
                      </Button>
                    </>
                  )}

                  {task.status === "PAUSED" && (
                    <>
                      <Button
                        onClick={() => handleTimeLog(task.jobCardId, task.id, "START")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Resume Work</span>
                      </Button>
                      <Button
                        onClick={() => handleTimeLog(task.jobCardId, task.id, "COMPLETE")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 gap-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Finish Task</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
