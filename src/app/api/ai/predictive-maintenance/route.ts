import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError } from "@/lib/api/errors";

export interface VehicleInsight {
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
  currentMileage: number;
  customerName: string;
  customerPhone: string;
  riskScore: "CRITICAL" | "HIGH" | "MEDIUM" | "HEALTHY";
  predictedIntervalKm: number;
  remainingKmToService: number;
  predictedNeeds: Array<{
    category: string;
    description: string;
    urgency: "IMMEDIATE" | "UPCOMING" | "RECOMMENDED";
    estimatedCost: number;
    reason: string;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();

    // Fetch vehicles with their historical job cards, diagnostics, and inspections
    const vehicles = await prisma.vehicle.findMany({
      where: { organizationId },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        jobCards: {
          include: {
            tasks: { select: { name: true, createdAt: true } },
            partsIssued: { include: { part: { select: { name: true, sku: true } } } },
            inspections: {
              include: {
                results: { where: { condition: { in: ["ATTENTION", "NEEDS_REPAIR", "CRITICAL"] } } },
              },
            },
            diagnostics: {
              include: {
                codes: { select: { dtcCode: true, severity: true, description: true } },
              },
            },
          },
          orderBy: { receivedAt: "desc" },
          take: 5,
        },
      },
      take: 50,
    });

    const predictions: VehicleInsight[] = vehicles.map((v) => {
      const jcs = v.jobCards || [];
      const currentMileage = v.mileage;
      const lastJc = jcs[0];
      const mileageSinceLastService = lastJc ? currentMileage - lastJc.currentMileage : currentMileage;

      const predictedNeeds: VehicleInsight["predictedNeeds"] = [];
      let riskScore: VehicleInsight["riskScore"] = "HEALTHY";

      // 1. Predictive Oil & Filter Lifecycle Rule
      const typicalOilInterval = v.fuelType.toUpperCase().includes("HYBRID") ? 7500 : 5000;
      const remainingKmToOil = Math.max(0, typicalOilInterval - mileageSinceLastService);

      if (mileageSinceLastService >= typicalOilInterval) {
        riskScore = "HIGH";
        predictedNeeds.push({
          category: "Lubrication & Engine",
          description: "Engine Oil & Genuine Filter Replacement Overdue",
          urgency: "IMMEDIATE",
          estimatedCost: 18500,
          reason: `Vehicle traveled ${mileageSinceLastService} km since last recorded service (standard cycle: ${typicalOilInterval} km).`,
        });
      } else if (remainingKmToOil <= 1000) {
        if (riskScore === "HEALTHY") riskScore = "MEDIUM";
        predictedNeeds.push({
          category: "Lubrication & Engine",
          description: "Routine Lube Service Due Soon",
          urgency: "UPCOMING",
          estimatedCost: 18500,
          reason: `Approximately ${remainingKmToOil} km remaining before recommended service threshold.`,
        });
      }

      // 2. Predictive Transmission & Brake Fluid Degradation
      if (currentMileage >= 40000 && currentMileage % 40000 < 5000) {
        if (riskScore === "HEALTHY") riskScore = "MEDIUM";
        predictedNeeds.push({
          category: "Transmission & Drivetrain",
          description: "Automatic / CVT Transmission Fluid Flush",
          urgency: "RECOMMENDED",
          estimatedCost: 35000,
          reason: `Odometer at ${currentMileage.toLocaleString()} km corresponds to manufacturer 40,000 km fluid degradation interval.`,
        });
      }

      // 3. Telemetry Diagnostic DTC Fault Analysis
      const recentCodes = jcs.flatMap((jc) => jc.diagnostics.flatMap((d) => d.codes));
      const criticalFaults = recentCodes.filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH");

      if (criticalFaults.length > 0) {
        riskScore = "CRITICAL";
        predictedNeeds.push({
          category: "Diagnostic & Electrical",
          description: `Active Fault Analysis: ${criticalFaults[0].dtcCode}`,
          urgency: "IMMEDIATE",
          estimatedCost: 28000,
          reason: `Unresolved OBD-II diagnostic trouble code: ${criticalFaults[0].description}`,
        });
      }

      // 4. Inspection Defect Persistence
      const recentDefects = jcs.flatMap((jc) => jc.inspections.flatMap((i) => i.results));
      const brakeDefects = recentDefects.filter((r) =>
        r.category.toLowerCase().includes("brake") || r.itemName.toLowerCase().includes("pad")
      );

      if (brakeDefects.length > 0) {
        if (riskScore !== "CRITICAL") riskScore = "HIGH";
        predictedNeeds.push({
          category: "Braking & Safety",
          description: "Front/Rear Brake Pad & Disc Rotor Inspection",
          urgency: "IMMEDIATE",
          estimatedCost: 24000,
          reason: `Recent inspection flagged: ${brakeDefects[0].itemName} (${brakeDefects[0].condition} - ${brakeDefects[0].notes || "low wear margin"}).`,
        });
      }

      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        currentMileage,
        customerName: `${v.customer.firstName} ${v.customer.lastName || ""}`.trim(),
        customerPhone: v.customer.phone,
        riskScore,
        predictedIntervalKm: typicalOilInterval,
        remainingKmToService: remainingKmToOil,
        predictedNeeds,
      };
    });

    // Sort predictions: CRITICAL -> HIGH -> MEDIUM -> HEALTHY
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, HEALTHY: 3 };
    predictions.sort((a, b) => priorityOrder[a.riskScore] - priorityOrder[b.riskScore]);

    return NextResponse.json({
      summary: {
        totalEvaluated: predictions.length,
        criticalRiskCount: predictions.filter((p) => p.riskScore === "CRITICAL").length,
        highRiskCount: predictions.filter((p) => p.riskScore === "HIGH").length,
        mediumRiskCount: predictions.filter((p) => p.riskScore === "MEDIUM").length,
        healthyCount: predictions.filter((p) => p.riskScore === "HEALTHY").length,
      },
      insights: predictions,
    });
  } catch (err) {
    return apiError(err);
  }
}
