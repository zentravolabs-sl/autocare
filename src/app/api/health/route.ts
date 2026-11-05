import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;

  try {
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;
  } catch (err: any) {
    dbStatus = "DEGRADED";
  }

  const memoryUsage = process.memoryUsage();

  return NextResponse.json(
    {
      status: dbStatus === "HEALTHY" ? "OPERATIONAL" : "DEGRADED",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || "production",
      version: "1.0.0-enterprise",
      system: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10,
          heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 10) / 10,
          rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 10) / 10,
        },
        durationMs: Date.now() - startTime,
      },
    },
    { status: dbStatus === "HEALTHY" ? 200 : 503 }
  );
}
