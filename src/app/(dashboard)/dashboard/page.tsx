import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser, getCurrentSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenant/context";
import { fetchAccountSums, buildProfitAndLoss } from "@/lib/accounting/reports";
import {
  BentoDashboard,
  BentoDashboardStats,
} from "@/components/dashboard/bento-dashboard";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const tenant = await getTenantContext();
  let organizationId = tenant.organizationId;
  let branchId = tenant.branchId;

  // If platform super admin navigates to /dashboard without an explicit organizationId, load default active org
  if (!organizationId && session.isSuperAdmin) {
    const firstOrg = await prisma.organization.findFirst({
      where: { status: "ACTIVE" },
      include: { branches: { where: { status: "ACTIVE" } } },
    });
    if (firstOrg) {
      organizationId = firstOrg.id;
      branchId = branchId || firstOrg.branches[0]?.id || "";
    }
  }

  const branchFilter = branchId ? { branchId } : {};
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Query real tenant & branch statistics from PostgreSQL in parallel
  const [
    org,
    allJobCards,
    recentJobCards,
    parts,
    services,
    serviceCategoriesCount,
    activeJobTasksCount,
    completedJobTasksCount,
    accountSums,
    invoices,
    expensesAgg,
    todayPaymentsAgg,
    totalCustomersCount,
    corporateCustomersCount,
    totalVehiclesCount,
    hybridEvVehiclesCount,
    totalTechniciansCount,
    activeTimeLogsCount,
    upcomingAppointmentsCount,
    totalAppointmentsCount,
    diagnosticSessionsCount,
    activeDiagnosticCodes,
    posInvoicesCount,
    cashRegistersCount,
    suppliersCount,
    purchaseOrdersCount,
    grnCount,
    branchesCount,
    workshopBays,
    auditLogsCount,
    journalEntriesCount,
    searchCustomers,
    searchVehicles,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: {
            plan: {
              include: { features: true },
            },
          },
        },
        branches: {
          where: { status: "ACTIVE" },
          orderBy: { isMain: "desc" },
        },
      },
    }),
    prisma.jobCard.findMany({
      where: { organizationId, ...branchFilter },
      select: {
        id: true,
        stage: true,
        estimatedLaborCost: true,
        estimatedPartsCost: true,
        estimatedTotalCost: true,
        actualLaborCost: true,
        actualPartsCost: true,
        actualTotalCost: true,
      },
    }),
    prisma.jobCard.findMany({
      where: { organizationId, ...branchFilter },
      include: {
        customer: true,
        vehicle: true,
        bay: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.part.findMany({
      where: { organizationId, isActive: true },
      include: {
        stocks: branchId ? { where: { branchId } } : true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.serviceCategory.count({
      where: { organizationId },
    }),
    prisma.jobTask.count({
      where: {
        jobCard: { organizationId, ...branchFilter },
        status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "PAUSED"] },
      },
    }),
    prisma.jobTask.count({
      where: {
        jobCard: { organizationId, ...branchFilter },
        status: "COMPLETED",
      },
    }),
    fetchAccountSums(prisma, organizationId),
    prisma.invoice.findMany({
      where: {
        organizationId,
        ...branchFilter,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        type: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        createdAt: true,
      },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        ...branchFilter,
        status: "APPROVED",
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId,
        ...branchFilter,
        receivedAt: { gte: startOfToday },
      },
      _sum: { amount: true },
    }),
    prisma.customer.count({
      where: { organizationId },
    }),
    prisma.customer.count({
      where: { organizationId, type: "CORPORATE" },
    }),
    prisma.vehicle.count({
      where: { organizationId },
    }),
    prisma.vehicle.count({
      where: {
        organizationId,
        vehicleType: { in: ["HYBRID", "ELECTRIC"] },
      },
    }),
    prisma.employee.count({
      where: { organizationId, ...branchFilter, status: "ACTIVE" },
    }),
    prisma.jobTimeLog.count({
      where: {
        endTime: null,
        task: { jobCard: { organizationId, ...branchFilter } },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId,
        ...branchFilter,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.appointment.count({
      where: { organizationId, ...branchFilter },
    }),
    prisma.diagnosticSession.count({
      where: {
        jobCard: { organizationId, ...branchFilter },
      },
    }),
    prisma.diagnosticCode.findMany({
      where: {
        session: { jobCard: { organizationId, ...branchFilter } },
        status: { in: ["DETECTED", "PENDING_REPAIR"] },
      },
      orderBy: { id: "desc" },
    }),
    prisma.invoice.count({
      where: {
        organizationId,
        ...branchFilter,
        type: { in: ["POS_DIRECT", "COUNTER_SALE"] },
      },
    }),
    prisma.cashRegister.count({
      where: { organizationId, ...branchFilter, status: "ACTIVE" },
    }),
    prisma.supplier.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.purchaseOrder.count({
      where: { organizationId, ...branchFilter },
    }),
    prisma.goodsReceipt.count({
      where: { organizationId, ...branchFilter },
    }),
    prisma.branch.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.workshopBay.findMany({
      where: { organizationId, ...branchFilter },
      orderBy: { code: "asc" },
    }),
    prisma.auditLog.count({
      where: { organizationId },
    }),
    prisma.journalEntry.count({
      where: { organizationId },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      select: {
        id: true,
        customerCode: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.vehicle.findMany({
      where: { organizationId },
      select: {
        id: true,
        registrationNumber: true,
        make: true,
        model: true,
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  // 1. Job Card Breakdown
  const activeJobCards = allJobCards.filter(
    (j) => !["CLOSED", "CANCELLED"].includes(j.stage)
  );
  const pendingCount = allJobCards.filter((j) =>
    [
      "VEHICLE_RECEPTION",
      "INITIAL_INSPECTION",
      "CUSTOMER_COMPLAINT",
      "DIAGNOSTIC_INSPECTION",
      "ESTIMATE_CREATION",
      "CUSTOMER_APPROVAL",
    ].includes(j.stage)
  ).length;
  const readyForDeliveryCount = allJobCards.filter((j) =>
    [
      "QUALITY_INSPECTION",
      "FINAL_INVOICE",
      "PAYMENT",
      "VEHICLE_DELIVERY",
    ].includes(j.stage)
  ).length;
  const inProgressCount = allJobCards.filter((j) =>
    [
      "TECHNICIAN_ASSIGNMENT",
      "PARTS_RESERVATION",
      "REPAIR_IN_PROGRESS",
      "QUALITY_INSPECTION",
      "FINAL_INVOICE",
      "PAYMENT",
      "VEHICLE_DELIVERY",
    ].includes(j.stage)
  ).length;
  const completedCount = allJobCards.filter((j) => j.stage === "CLOSED").length;

  // 2. Inventory Breakdown & Subtle Visualization Data
  let totalUnitsInStock = 0;
  let lowStockCount = 0;
  let inventoryValuation = 0;

  const stockItems = parts.map((p) => {
    const qoh = p.stocks.reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
    const avgCost = p.stocks[0]?.averageUnitCost
      ? Number(p.stocks[0].averageUnitCost)
      : Number(p.purchasePrice);
    totalUnitsInStock += qoh;
    inventoryValuation += qoh * avgCost;
    const isLow = qoh <= p.minStockLevel;
    if (isLow) lowStockCount += 1;
    const targetMax = Math.max(p.reorderLevel * 2, p.minStockLevel * 3, 20);
    const fillPercent = Math.min(100, Math.round((qoh / targetMax) * 100));

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      qoh,
      minStockLevel: p.minStockLevel,
      reorderLevel: p.reorderLevel,
      fillPercent,
      isLow,
    };
  });

  // 3. Financial & Revenue Calculations (Double-Entry P&L + Invoices + WIP)
  const pnl = buildProfitAndLoss(accountSums);
  const ledgerRevenue = Number(pnl.totalRevenue);
  const ledgerExpenses = Number(pnl.totalExpenses);
  const directExpenses = Number(expensesAgg._sum.amount || 0);

  const finalizedInvoices = invoices.filter((i) =>
    ["FINALIZED", "PAID", "PARTIAL"].includes(i.status)
  );
  const invoicedRevenue = finalizedInvoices.reduce(
    (sum, i) => sum + Number(i.totalAmount),
    0
  );
  const totalCollected = finalizedInvoices.reduce(
    (sum, i) => sum + Number(i.paidAmount),
    0
  );
  const outstandingReceivables = finalizedInvoices.reduce(
    (sum, i) => sum + Number(i.balanceAmount),
    0
  );

  const totalRevenue = ledgerRevenue > 0 ? ledgerRevenue : invoicedRevenue;
  const totalExpenses = ledgerExpenses > 0 ? ledgerExpenses : directExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const wipLaborValue = activeJobCards.reduce(
    (sum, j) =>
      sum + Number(j.actualLaborCost || j.estimatedLaborCost || 0),
    0
  );
  const wipPartsValue = activeJobCards.reduce(
    (sum, j) =>
      sum + Number(j.actualPartsCost || j.estimatedPartsCost || 0),
    0
  );
  const wipPipelineValue = activeJobCards.reduce(
    (sum, j) =>
      sum + Number(j.actualTotalCost || j.estimatedTotalCost || 0),
    0
  );

  const todayPaymentsReceived = Number(todayPaymentsAgg._sum.amount || 0);
  const todayInvoicedRevenue = finalizedInvoices
    .filter((i) => new Date(i.createdAt) >= startOfToday)
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const todayIncome =
    todayPaymentsReceived > 0
      ? todayPaymentsReceived
      : todayInvoicedRevenue > 0
      ? todayInvoicedRevenue
      : totalRevenue > 0
      ? totalRevenue
      : wipPipelineValue;

  const chartPoints = [
    {
      label: "Labor",
      revenue: totalRevenue > 0 ? totalRevenue * 0.45 : wipLaborValue,
      expense: totalExpenses * 0.4,
    },
    {
      label: "Parts",
      revenue: totalRevenue > 0 ? totalRevenue * 0.55 : wipPartsValue,
      expense: totalExpenses * 0.6,
    },
    {
      label: "Billed",
      revenue: totalRevenue,
      expense: totalExpenses,
    },
    {
      label: "WIP",
      revenue: wipPipelineValue,
      expense: totalExpenses,
    },
  ];

  // 4. Workshop Bays & AI Insights Metrics
  const availableBaysCount = workshopBays.filter(
    (b) => b.status === "AVAILABLE"
  ).length;
  const occupiedBaysCount = workshopBays.filter(
    (b) => b.status === "OCCUPIED"
  ).length;
  const bayUtilizationPct =
    workshopBays.length > 0
      ? Math.round((occupiedBaysCount / workshopBays.length) * 100)
      : 0;

  const branches =
    org?.branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      isMain: b.isMain,
    })) || [];

  const activeBranchId = branchId || branches[0]?.id || null;

  const planFeatures = org?.subscription?.plan?.features || [];
  const aiFeature = planFeatures.find((f) => f.featureKey === "aiTokensPerMonth");
  const aiEnabled = aiFeature ? aiFeature.isEnabled : true;

  const stats: BentoDashboardStats = {
    organization: {
      name: org?.name || "AutoCare Pro",
      code: org?.code || "ENTERPRISE",
      currency: org?.currency || "LKR",
      planName: org?.subscription?.plan?.name || "Standard Plan",
      subscriptionStatus: org?.subscription?.status || "ACTIVE",
      aiEnabled,
    },
    jobCards: {
      activeCount: activeJobCards.length,
      pendingCount,
      readyForDeliveryCount,
      inProgressCount,
      completedCount,
      totalCount: allJobCards.length,
      recent: recentJobCards.map((jc) => ({
        id: jc.id,
        jobNumber: jc.jobNumber,
        registrationNumber: jc.vehicle.registrationNumber,
        vehicleName: `${jc.vehicle.make} ${jc.vehicle.model}`,
        customerName: `${jc.customer.firstName} ${jc.customer.lastName || ""}`.trim(),
        stage: jc.stage,
        priority: jc.priority,
        estimatedTotalCost: Number(
          jc.actualTotalCost || jc.estimatedTotalCost || 0
        ),
      })),
    },
    inventory: {
      totalPartsCount: parts.length,
      totalUnitsInStock,
      lowStockCount,
      healthyStockCount: Math.max(parts.length - lowStockCount, 0),
      inventoryValuation,
      stockItems,
    },
    services: {
      totalServicesCount: services.length,
      categoriesCount: serviceCategoriesCount,
      activeTasksCount: activeJobTasksCount,
      completedTasksCount: completedJobTasksCount,
      topServices: services.slice(0, 4).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        estimatedPrice: Number(s.estimatedPrice),
        standardLaborHours: Number(s.standardLaborHours),
      })),
    },
    finance: {
      todayIncome,
      totalRevenue,
      totalCollected,
      totalExpenses,
      netProfit,
      wipPipelineValue,
      outstandingReceivables,
      chartPoints,
    },
    customers: {
      totalCount: totalCustomersCount,
      corporateCount: corporateCustomersCount,
      recent: searchCustomers.map((c) => ({
        id: c.id,
        code: c.customerCode,
        name: c.companyName || `${c.firstName} ${c.lastName || ""}`.trim(),
        phone: c.phone,
      })),
    },
    vehicles: {
      totalCount: totalVehiclesCount,
      hybridEvCount: hybridEvVehiclesCount,
      recent: searchVehicles.map((v) => ({
        id: v.id,
        registrationNumber: v.registrationNumber,
        name: `${v.make} ${v.model}`,
      })),
    },
    technicians: {
      totalCount: totalTechniciansCount,
      activeTimersCount: activeTimeLogsCount,
    },
    appointments: {
      upcomingCount: upcomingAppointmentsCount,
      totalCount: totalAppointmentsCount,
    },
    diagnostics: {
      sessionsCount: diagnosticSessionsCount,
      activeDtcCount: activeDiagnosticCodes.length,
      latestDtcCode: activeDiagnosticCodes[0]?.dtcCode || null,
    },
    pos: {
      counterSalesCount: posInvoicesCount,
      registersCount: cashRegistersCount,
    },
    suppliers: {
      activeCount: suppliersCount,
    },
    purchases: {
      ordersCount: purchaseOrdersCount,
      grnCount,
    },
    branches: {
      activeCount: branchesCount,
    },
    bays: {
      totalCount: workshopBays.length,
      availableCount: availableBaysCount,
      occupiedCount: occupiedBaysCount,
      items: workshopBays.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        status: b.status,
      })),
    },
    invoices: {
      totalCount: invoices.length,
      finalizedCount: finalizedInvoices.length,
    },
    reports: {
      auditLogsCount,
      journalEntriesCount,
    },
    aiInsights: {
      monitoredVehicles: totalVehiclesCount,
      criticalAlertsCount: activeDiagnosticCodes.length,
      bayUtilizationPct,
    },
  };

  return (
    <BentoDashboard
      user={{
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        roles: session.roles || [],
        permissions: session.permissions || [],
      }}
      branches={branches}
      activeBranchId={activeBranchId}
      stats={stats}
    />
  );
}
