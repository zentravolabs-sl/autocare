import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { apiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();

    const [invoices, jobCards, parts, bays, employees] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId, status: { in: ["FINALIZED", "PAID", "PARTIAL"] } },
        select: {
          id: true,
          totalAmount: true,
          taxAmount: true,
          balanceAmount: true,
          paidAmount: true,
          createdAt: true,
          items: {
            select: { itemType: true, totalAmount: true, unitCost: true, quantity: true },
          },
        },
      }),
      prisma.jobCard.findMany({
        where: { organizationId },
        select: {
          id: true,
          stage: true,
          priority: true,
          receivedAt: true,
          bayId: true,
          tasks: { select: { estimatedHours: true, actualHours: true, status: true } },
        },
      }),
      prisma.part.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          minStockLevel: true,
          stocks: { select: { quantityOnHand: true, averageUnitCost: true } },
        },
      }),
      prisma.workshopBay.findMany({
        where: { organizationId },
        select: { id: true, code: true, name: true, status: true },
      }),
      prisma.employee.findMany({
        where: { organizationId, status: "ACTIVE" },
        select: { id: true, employeeCode: true, department: true, hourlyRate: true },
      }),
    ]);

    // Financial Revenue & Margin Analysis
    const totalBilled = invoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const totalCollected = invoices.reduce((acc, i) => acc + Number(i.paidAmount), 0);
    const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balanceAmount), 0);

    let partsRevenue = 0;
    let laborRevenue = 0;
    let partsCost = 0;

    for (const inv of invoices) {
      for (const item of inv.items) {
        const itemTotal = Number(item.totalAmount);
        const itemCost = Number(item.unitCost) * Number(item.quantity);
        if (item.itemType === "PART") {
          partsRevenue += itemTotal;
          partsCost += itemCost;
        } else if (item.itemType === "LABOR") {
          laborRevenue += itemTotal;
        }
      }
    }

    const grossProfit = totalBilled - partsCost;
    const grossMarginPct = totalBilled > 0 ? Math.round((grossProfit / totalBilled) * 1000) / 10 : 0;

    // Workshop Bay Utilization Rate
    const occupiedBays = bays.filter((b) => b.status === "OCCUPIED").length;
    const bayUtilizationRate = bays.length > 0 ? Math.round((occupiedBays / bays.length) * 100) : 0;

    // Labor Efficiency Rate (Estimated vs Actual Hours)
    let totalEstimatedLaborHours = 0;
    let totalActualLaborHours = 0;

    for (const jc of jobCards) {
      for (const t of jc.tasks) {
        if (t.status === "COMPLETED") {
          totalEstimatedLaborHours += Number(t.estimatedHours);
          totalActualLaborHours += Number(t.actualHours);
        }
      }
    }

    const laborEfficiencyRate =
      totalActualLaborHours > 0
        ? Math.round((totalEstimatedLaborHours / totalActualLaborHours) * 100)
        : 100;

    // Fast-Moving & Critical Inventory Depletion
    const inventoryValuation = parts.reduce((acc, p) => {
      const qoh = p.stocks.reduce((s, st) => s + Number(st.quantityOnHand), 0);
      const wac = p.stocks[0]?.averageUnitCost ? Number(p.stocks[0].averageUnitCost) : 0;
      return acc + qoh * wac;
    }, 0);

    const lowStockAlerts = parts
      .filter((p) => {
        const qoh = p.stocks.reduce((s, st) => s + Number(st.quantityOnHand), 0);
        return qoh <= p.minStockLevel;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        qoh: p.stocks.reduce((s, st) => s + Number(st.quantityOnHand), 0),
        minLevel: p.minStockLevel,
      }));

    return NextResponse.json({
      financial: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        partsRevenue,
        laborRevenue,
        grossProfit,
        grossMarginPct,
      },
      operations: {
        totalJobCards: jobCards.length,
        activeRepairsCount: jobCards.filter((j) => !["CLOSED", "CANCELLED", "VEHICLE_DELIVERY"].includes(j.stage)).length,
        bayUtilizationRate,
        totalBays: bays.length,
        occupiedBays,
        laborEfficiencyRate,
        totalTechnicians: employees.length,
      },
      inventory: {
        totalSkus: parts.length,
        inventoryValuation,
        lowStockCount: lowStockAlerts.length,
        lowStockAlerts: lowStockAlerts.slice(0, 5),
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
