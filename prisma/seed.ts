import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting AutoCare Pro Database Seeding...");

  // 1. DYNAMIC SAAS SUBSCRIPTION PLANS
  console.log("📦 Seeding Subscription Plans & Entitlements...");
  const plans = [
    {
      code: "MINI",
      name: "Mini Workshop",
      description: "Ideal for single-bay local garages and independent mechanics.",
      priceMonthly: 15000,
      priceYearly: 150000,
      trialDays: 14,
      gracePeriodDays: 7,
      sortOrder: 1,
      features: [
        { featureKey: "maxBranches", isEnabled: true, limitValue: 1, description: "Maximum Branches" },
        { featureKey: "maxUsers", isEnabled: true, limitValue: 3, description: "Maximum Staff Accounts" },
        { featureKey: "maxJobCardsPerMonth", isEnabled: true, limitValue: 50, description: "Job Cards / month" },
        { featureKey: "storageGb", isEnabled: true, limitValue: 2, description: "Document & Photo Storage GB" },
        { featureKey: "aiTokensPerMonth", isEnabled: false, limitValue: 0, description: "AI Diagnostic Tokens" },
        { featureKey: "offlineAccess", isEnabled: false, limitValue: 0, description: "Offline PWA Mode" },
      ],
    },
    {
      code: "STANDARD",
      name: "Standard Service Center",
      description: "Designed for established workshops with multi-brand service lanes.",
      priceMonthly: 35000,
      priceYearly: 350000,
      trialDays: 14,
      gracePeriodDays: 7,
      sortOrder: 2,
      features: [
        { featureKey: "maxBranches", isEnabled: true, limitValue: 2, description: "Maximum Branches" },
        { featureKey: "maxUsers", isEnabled: true, limitValue: 10, description: "Maximum Staff Accounts" },
        { featureKey: "maxJobCardsPerMonth", isEnabled: true, limitValue: 250, description: "Job Cards / month" },
        { featureKey: "storageGb", isEnabled: true, limitValue: 15, description: "Document & Photo Storage GB" },
        { featureKey: "aiTokensPerMonth", isEnabled: true, limitValue: 1000, description: "AI Diagnostic Tokens" },
        { featureKey: "offlineAccess", isEnabled: true, limitValue: 1, description: "Offline PWA Mode" },
      ],
    },
    {
      code: "ADVANCED",
      name: "Advanced Multi-Branch",
      description: "For high-volume automotive service networks with multiple locations.",
      priceMonthly: 75000,
      priceYearly: 750000,
      trialDays: 14,
      gracePeriodDays: 10,
      sortOrder: 3,
      features: [
        { featureKey: "maxBranches", isEnabled: true, limitValue: 6, description: "Maximum Branches" },
        { featureKey: "maxUsers", isEnabled: true, limitValue: 30, description: "Maximum Staff Accounts" },
        { featureKey: "maxJobCardsPerMonth", isEnabled: true, limitValue: 1000, description: "Job Cards / month" },
        { featureKey: "storageGb", isEnabled: true, limitValue: 60, description: "Document & Photo Storage GB" },
        { featureKey: "aiTokensPerMonth", isEnabled: true, limitValue: 5000, description: "AI Diagnostic Tokens" },
        { featureKey: "offlineAccess", isEnabled: true, limitValue: 1, description: "Offline PWA Mode" },
      ],
    },
    {
      code: "ENTERPRISE",
      name: "Enterprise Fleet & Dealer",
      description: "Full-scale corporate franchise, unlimited scalability, SLA and premium support.",
      priceMonthly: 150000,
      priceYearly: 1500000,
      trialDays: 30,
      gracePeriodDays: 14,
      sortOrder: 4,
      features: [
        { featureKey: "maxBranches", isEnabled: true, limitValue: null, description: "Unlimited Branches" },
        { featureKey: "maxUsers", isEnabled: true, limitValue: null, description: "Unlimited Staff Accounts" },
        { featureKey: "maxJobCardsPerMonth", isEnabled: true, limitValue: null, description: "Unlimited Job Cards" },
        { featureKey: "storageGb", isEnabled: true, limitValue: 500, description: "Storage GB" },
        { featureKey: "aiTokensPerMonth", isEnabled: true, limitValue: 25000, description: "AI Diagnostic Tokens" },
        { featureKey: "offlineAccess", isEnabled: true, limitValue: 1, description: "Offline PWA Mode" },
      ],
    },
  ];

  for (const p of plans) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        trialDays: p.trialDays,
        gracePeriodDays: p.gracePeriodDays,
        sortOrder: p.sortOrder,
      },
      create: {
        code: p.code,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        trialDays: p.trialDays,
        gracePeriodDays: p.gracePeriodDays,
        sortOrder: p.sortOrder,
      },
    });

    for (const f of p.features) {
      await prisma.planFeature.upsert({
        where: {
          planId_featureKey: {
            planId: plan.id,
            featureKey: f.featureKey,
          },
        },
        update: {
          isEnabled: f.isEnabled,
          limitValue: f.limitValue,
          description: f.description,
        },
        create: {
          planId: plan.id,
          featureKey: f.featureKey,
          isEnabled: f.isEnabled,
          limitValue: f.limitValue,
          description: f.description,
        },
      });
    }
  }

  // 2. GRANULAR PERMISSIONS
  console.log("🔐 Seeding Granular Permissions...");
  const permissionsData = [
    // Job Cards
    { code: "job-card.create", module: "JOB_CARD", description: "Create new job cards" },
    { code: "job-card.view", module: "JOB_CARD", description: "View job cards and progress" },
    { code: "job-card.update", module: "JOB_CARD", description: "Update job card details" },
    { code: "job-card.approve", module: "JOB_CARD", description: "Authorize job card estimates" },
    { code: "job-card.cancel", module: "JOB_CARD", description: "Cancel job cards" },
    { code: "job-card.qc", module: "JOB_CARD", description: "Perform Quality Control inspections" },

    // Customers & Vehicles
    { code: "customer.create", module: "CUSTOMER", description: "Register customer" },
    { code: "customer.view", module: "CUSTOMER", description: "View customer ledger and details" },
    { code: "customer.update", module: "CUSTOMER", description: "Update customer records" },
    { code: "vehicle.create", module: "VEHICLE", description: "Register vehicle" },
    { code: "vehicle.view", module: "VEHICLE", description: "View vehicle service history" },

    // Inventory & Purchasing
    { code: "inventory.view", module: "INVENTORY", description: "View stock balances" },
    { code: "inventory.adjust", module: "INVENTORY", description: "Make manual stock adjustments" },
    { code: "inventory.issue", module: "INVENTORY", description: "Issue parts to job cards" },
    { code: "inventory.transfer", module: "INVENTORY", description: "Transfer stock between branches" },
    { code: "purchasing.create", module: "PURCHASING", description: "Create purchase orders" },
    { code: "purchasing.receive", module: "PURCHASING", description: "Receive goods into stock (GRN)" },

    // Invoicing & POS
    { code: "invoice.create", module: "INVOICE", description: "Create invoice drafts" },
    { code: "invoice.finalize", module: "INVOICE", description: "Finalize and lock invoices" },
    { code: "payment.receive", module: "FINANCE", description: "Accept cash/card/bank payments" },
    { code: "payment.refund", module: "FINANCE", description: "Process refunds or credit notes" },
    { code: "expense.create", module: "FINANCE", description: "Record expenses" },
    { code: "expense.approve", module: "FINANCE", description: "Approve business expenses" },
    { code: "accounting.view", module: "FINANCE", description: "View GL, P&L, and Trial Balance" },

    // HR & Technicians
    { code: "hr.manage", module: "HR", description: "Manage employees, salaries, and attendance" },
    { code: "technician.clock", module: "HR", description: "Record task work timers" },

    // Administration
    { code: "reports.view", module: "REPORTS", description: "View business analytics and reports" },
    { code: "subscription.manage", module: "SETTINGS", description: "Manage SaaS plan and billing" },
    { code: "settings.manage", module: "SETTINGS", description: "Configure branch, bays, and rates" },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
  }

  // 3. SYSTEM ROLES
  console.log("👥 Seeding Standard Roles...");
  const systemRoles = [
    { code: "SUPER_ADMIN", name: "Platform Super Admin", description: "Global platform overseer", isSystem: true },
    { code: "OWNER", name: "Business Owner", description: "Full ownership of organization and branches", isSystem: true },
    { code: "ADMIN", name: "Organization Admin", description: "Administrative access across org", isSystem: true },
    { code: "BRANCH_MANAGER", name: "Branch Manager", description: "Branch operations supervisor", isSystem: true },
    { code: "SERVICE_MANAGER", name: "Service Manager", description: "Workshop operations and technicians lead", isSystem: true },
    { code: "SERVICE_ADVISOR", name: "Service Advisor", description: "Front desk, reception, estimate, customer advisor", isSystem: true },
    { code: "SENIOR_MECHANIC", name: "Senior Mechanic", description: "Master technician & diagnosis", isSystem: true },
    { code: "JUNIOR_MECHANIC", name: "Junior Mechanic", description: "General mechanical tasks", isSystem: true },
    { code: "AUTO_ELECTRICIAN", name: "Auto Electrician", description: "Automotive wiring and electronics", isSystem: true },
    { code: "HYBRID_TECHNICIAN", name: "Hybrid/EV Specialist", description: "High-voltage and inverter certified technician", isSystem: true },
    { code: "STORE_KEEPER", name: "Storekeeper / Parts Manager", description: "Inventory, stock receiving, part issues", isSystem: true },
    { code: "CASHIER", name: "Cashier / Billing Clerk", description: "POS sales, payment receipts, registers", isSystem: true },
    { code: "ACCOUNTANT", name: "Accountant", description: "Ledgers, journal entries, financial statements", isSystem: true },
    { code: "QC_OFFICER", name: "Quality Control Officer", description: "Pre-delivery vehicle inspection and clearance", isSystem: true },
    { code: "CUSTOMER", name: "Customer Portal User", description: "Self-service booking and tracking", isSystem: true },
  ];

  for (const r of systemRoles) {
    await prisma.role.upsert({
      where: { organizationId_code: { organizationId: "", code: r.code } },
      update: { name: r.name, description: r.description },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: true,
      },
    }).catch(async () => {
      // If organizationId is null
      const existing = await prisma.role.findFirst({ where: { organizationId: null, code: r.code } });
      if (!existing) {
        await prisma.role.create({
          data: { code: r.code, name: r.name, description: r.description, isSystem: true },
        });
      }
    });
  }

  // 4. SUPER ADMIN USER
  console.log("👑 Seeding Platform Super Admin User...");
  const superAdminPassword = await bcrypt.hash("SuperAdmin@2026!", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@autocarepro.com" },
    update: {
      passwordHash: superAdminPassword,
      firstName: "Antigravity",
      lastName: "SuperAdmin",
      isSuperAdmin: true,
      status: "ACTIVE",
    },
    create: {
      email: "superadmin@autocarepro.com",
      passwordHash: superAdminPassword,
      firstName: "Antigravity",
      lastName: "SuperAdmin",
      isSuperAdmin: true,
      status: "ACTIVE",
    },
  });

  // Assign Super Admin Role
  const superAdminRole = await prisma.role.findFirst({ where: { code: "SUPER_ADMIN" } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: superAdmin.id, roleId: superAdminRole.id },
    });
  }

  // 5. DEMO ENTERPRISE ORGANIZATION: APEX AUTO CARE (PVT) LTD
  console.log("🏢 Seeding Demo Organization: Apex Auto Care (Pvt) Ltd...");
  const org = await prisma.organization.upsert({
    where: { code: "APEX-LK" },
    update: {
      name: "Apex Auto Care (Pvt) Ltd",
      taxNumber: "VAT-10928374-7000",
      phone: "+94 11 234 5678",
      email: "info@apexautocare.lk",
      website: "https://apexautocare.lk",
      address: "No. 45/B, Baseline Road, Dematagoda",
      city: "Colombo",
      country: "LK",
      currency: "LKR",
      timezone: "Asia/Colombo",
      status: "ACTIVE",
    },
    create: {
      code: "APEX-LK",
      name: "Apex Auto Care (Pvt) Ltd",
      taxNumber: "VAT-10928374-7000",
      phone: "+94 11 234 5678",
      email: "info@apexautocare.lk",
      website: "https://apexautocare.lk",
      address: "No. 45/B, Baseline Road, Dematagoda",
      city: "Colombo",
      country: "LK",
      currency: "LKR",
      timezone: "Asia/Colombo",
      status: "ACTIVE",
    },
  });

  // Assign Subscription (ADVANCED Plan)
  const advancedPlan = await prisma.subscriptionPlan.findUnique({ where: { code: "ADVANCED" } });
  if (advancedPlan) {
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 365);

    await prisma.subscription.upsert({
      where: { organizationId: org.id },
      update: {
        planId: advancedPlan.id,
        status: "ACTIVE",
        billingCycle: "YEARLY",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      create: {
        organizationId: org.id,
        planId: advancedPlan.id,
        status: "ACTIVE",
        billingCycle: "YEARLY",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // 6. BRANCHES (Colombo Flagship & Kandy Branch)
  console.log("📍 Seeding Branches...");
  const colomboBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "COL-01" } },
    update: {
      name: "Colombo Main Flagship Workshop",
      address: "No. 45/B, Baseline Road, Colombo 09",
      phone: "+94 11 234 5678",
      email: "colombo@apexautocare.lk",
      managerName: "Saman Perera",
      isMain: true,
      status: "ACTIVE",
    },
    create: {
      organizationId: org.id,
      code: "COL-01",
      name: "Colombo Main Flagship Workshop",
      address: "No. 45/B, Baseline Road, Colombo 09",
      phone: "+94 11 234 5678",
      email: "colombo@apexautocare.lk",
      managerName: "Saman Perera",
      isMain: true,
      status: "ACTIVE",
    },
  });

  const kandyBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "KND-01" } },
    update: {
      name: "Kandy Express Workshop",
      address: "No. 128, Peradeniya Road, Kandy",
      phone: "+94 81 223 4455",
      email: "kandy@apexautocare.lk",
      managerName: "Rohan Gunawardena",
      isMain: false,
      status: "ACTIVE",
    },
    create: {
      organizationId: org.id,
      code: "KND-01",
      name: "Kandy Express Workshop",
      address: "No. 128, Peradeniya Road, Kandy",
      phone: "+94 81 223 4455",
      email: "kandy@apexautocare.lk",
      managerName: "Rohan Gunawardena",
      isMain: false,
      status: "ACTIVE",
    },
  });

  // Warehouses
  const colomboWarehouse = await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: colomboBranch.id, code: "WH-COL-MAIN" } },
    update: { name: "Colombo Central Spare Parts Store", isDefault: true },
    create: {
      organizationId: org.id,
      branchId: colomboBranch.id,
      code: "WH-COL-MAIN",
      name: "Colombo Central Spare Parts Store",
      isDefault: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: kandyBranch.id, code: "WH-KND-MAIN" } },
    update: { name: "Kandy Quick-Lube Store", isDefault: true },
    create: {
      organizationId: org.id,
      branchId: kandyBranch.id,
      code: "WH-KND-MAIN",
      name: "Kandy Quick-Lube Store",
      isDefault: true,
    },
  });

  // Cash Registers
  await prisma.cashRegister.upsert({
    where: { branchId_code: { branchId: colomboBranch.id, code: "REG-01" } },
    update: { name: "Main Reception Register 01" },
    create: {
      organizationId: org.id,
      branchId: colomboBranch.id,
      code: "REG-01",
      name: "Main Reception Register 01",
    },
  });

  // Workshop Bays
  const bays = [
    { code: "BAY-01", name: "Two-Post Lift Bay 1 (Heavy Mechanical)", bayType: "MECHANICAL" },
    { code: "BAY-02", name: "Two-Post Lift Bay 2 (General Service)", bayType: "MECHANICAL" },
    { code: "BAY-03", name: "Scissor Lift Bay 3 (Hybrid & EV Diagnosis)", bayType: "HYBRID" },
    { code: "BAY-04", name: "Four-Post Computerized 3D Alignment Bay", bayType: "ALIGNMENT" },
    { code: "BAY-05", name: "Express Lube & Quick Inspection Pit", bayType: "EXPRESS" },
  ];

  for (const b of bays) {
    await prisma.workshopBay.upsert({
      where: { branchId_code: { branchId: colomboBranch.id, code: b.code } },
      update: { name: b.name, bayType: b.bayType },
      create: {
        organizationId: org.id,
        branchId: colomboBranch.id,
        code: b.code,
        name: b.name,
        bayType: b.bayType,
        status: "AVAILABLE",
      },
    });
  }

  // 7. CHART OF ACCOUNTS (DOUBLE-ENTRY)
  console.log("📊 Seeding Chart of Accounts...");
  const accountsData = [
    { code: "1010", name: "Cash on Hand (LKR)", type: "ASSET", isSystem: true },
    { code: "1020", name: "Bank Account (Commercial Bank)", type: "ASSET", isSystem: true },
    { code: "1030", name: "Petty Cash", type: "ASSET", isSystem: false },
    { code: "1200", name: "Accounts Receivable (Customer Credit)", type: "ASSET", isSystem: true },
    { code: "1300", name: "Spare Parts Inventory Asset", type: "ASSET", isSystem: true },
    { code: "2010", name: "Accounts Payable (Suppliers)", type: "LIABILITY", isSystem: true },
    { code: "2050", name: "VAT / SSCL Payable", type: "LIABILITY", isSystem: true },
    { code: "3010", name: "Owner Equity / Retained Earnings", type: "EQUITY", isSystem: true },
    { code: "4010", name: "Mechanical Labor Revenue", type: "REVENUE", isSystem: true },
    { code: "4020", name: "Spare Parts Sales Revenue", type: "REVENUE", isSystem: true },
    { code: "4030", name: "Sublet / Diagnostic Revenue", type: "REVENUE", isSystem: true },
    { code: "5010", name: "Cost of Goods Sold (Parts Consumed)", type: "EXPENSE", isSystem: true },
    { code: "6010", name: "Workshop Technician Wages", type: "EXPENSE", isSystem: true },
    { code: "6020", name: "Electricity & Workshop Utilities", type: "EXPENSE", isSystem: false },
    { code: "6030", name: "Workshop Bay Rent", type: "EXPENSE", isSystem: false },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acc.code } },
      update: { name: acc.name, type: acc.type as any },
      create: {
        organizationId: org.id,
        code: acc.code,
        name: acc.name,
        type: acc.type as any,
        isSystem: acc.isSystem,
        currency: "LKR",
      },
    });
  }

  // 8. SERVICE MASTER
  console.log("🔧 Seeding Service Master...");
  const catMaintenance = await prisma.serviceCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "CAT-LUBE" } },
    update: { name: "General Lubrication & Maintenance" },
    create: { organizationId: org.id, code: "CAT-LUBE", name: "General Lubrication & Maintenance" },
  });

  const catBrakes = await prisma.serviceCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "CAT-BRK" } },
    update: { name: "Brake Systems & Calipers" },
    create: { organizationId: org.id, code: "CAT-BRK", name: "Brake Systems & Calipers" },
  });

  const catHybrid = await prisma.serviceCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "CAT-HYB" } },
    update: { name: "Hybrid & High-Voltage EV Systems" },
    create: { organizationId: org.id, code: "CAT-HYB", name: "Hybrid & High-Voltage EV Systems" },
  });

  const servicesData = [
    {
      categoryId: catMaintenance.id,
      code: "SRV-LUBE-01",
      name: "Full Periodic Maintenance Service (10,000 km)",
      description: "Includes engine oil change, filter change, 40-point safety check and brake clean.",
      standardLaborHours: 2.0,
      laborRate: 4500,
      estimatedPrice: 9000,
      requiredSkills: ["LUBRICATION_SPECIALIST"],
      compatibleVehicleTypes: ["CAR", "SUV", "VAN", "HYBRID"],
    },
    {
      categoryId: catBrakes.id,
      code: "SRV-BRK-01",
      name: "Front & Rear Brake Pad Replacement with Rotor Skimming",
      description: "Precision on-car rotor skimming, brake caliper slide-pin greasing and bleeding.",
      standardLaborHours: 1.5,
      laborRate: 5000,
      estimatedPrice: 7500,
      requiredSkills: ["BRAKE_SPECIALIST"],
      compatibleVehicleTypes: ["CAR", "SUV", "VAN", "HYBRID", "ELECTRIC"],
    },
    {
      categoryId: catHybrid.id,
      code: "SRV-HYB-01",
      name: "Hybrid Battery Conditioning & Cooling Blower Overhaul",
      description: "HV battery health scan, individual block delta voltage test, cooling fan dust decontamination.",
      standardLaborHours: 3.0,
      laborRate: 6500,
      estimatedPrice: 19500,
      requiredSkills: ["HYBRID_CERTIFIED"],
      compatibleVehicleTypes: ["HYBRID", "ELECTRIC"],
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { organizationId_code: { organizationId: org.id, code: s.code } },
      update: {
        name: s.name,
        description: s.description,
        standardLaborHours: s.standardLaborHours,
        laborRate: s.laborRate,
        estimatedPrice: s.estimatedPrice,
        requiredSkills: s.requiredSkills,
        compatibleVehicleTypes: s.compatibleVehicleTypes as any,
      },
      create: {
        organizationId: org.id,
        categoryId: s.categoryId,
        code: s.code,
        name: s.name,
        description: s.description,
        standardLaborHours: s.standardLaborHours,
        laborRate: s.laborRate,
        estimatedPrice: s.estimatedPrice,
        requiredSkills: s.requiredSkills,
        compatibleVehicleTypes: s.compatibleVehicleTypes as any,
      },
    });
  }

  // 9. INVENTORY & SPARE PARTS MASTER
  console.log("⚙️ Seeding Inventory & Spare Parts...");
  const catOils = await prisma.partCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "PCAT-OIL" } },
    update: { name: "Engine Oils & Lubricants" },
    create: { organizationId: org.id, code: "PCAT-OIL", name: "Engine Oils & Lubricants" },
  });

  const catFilters = await prisma.partCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "PCAT-FLT" } },
    update: { name: "Oil, Air & Cabin Filters" },
    create: { organizationId: org.id, code: "PCAT-FLT", name: "Oil, Air & Cabin Filters" },
  });

  const partsData = [
    {
      categoryId: catOils.id,
      sku: "MOBIL-1-0W20-4L",
      barcode: "071924149953",
      name: "Mobil 1 Advanced Fuel Economy 0W-20 (4L)",
      brand: "Mobil 1",
      unit: "CAN",
      purchasePrice: 18500,
      sellingPrice: 24500,
      minStockLevel: 10,
      reorderLevel: 25,
    },
    {
      categoryId: catFilters.id,
      sku: "TOY-FLT-04152-YZZA6",
      barcode: "04152YZZA6",
      name: "Toyota Genuine Engine Oil Filter Element",
      brand: "Toyota OEM",
      unit: "PCS",
      purchasePrice: 2200,
      sellingPrice: 3800,
      minStockLevel: 20,
      reorderLevel: 50,
    },
  ];

  for (const p of partsData) {
    const part = await prisma.part.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: p.sku } },
      update: {
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        minStockLevel: p.minStockLevel,
        reorderLevel: p.reorderLevel,
      },
      create: {
        organizationId: org.id,
        categoryId: p.categoryId,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        minStockLevel: p.minStockLevel,
        reorderLevel: p.reorderLevel,
      },
    });

    // Create initial stock balance and movement
    const stock = await prisma.stock.upsert({
      where: { warehouseId_partId: { warehouseId: colomboWarehouse.id, partId: part.id } },
      update: {},
      create: {
        organizationId: org.id,
        branchId: colomboBranch.id,
        warehouseId: colomboWarehouse.id,
        partId: part.id,
        quantityOnHand: 40,
        quantityReserved: 0,
        quantityAvailable: 40,
        averageUnitCost: p.purchasePrice,
      },
    });

    // Initial stock receipt ledger entry
    const existingMovement = await prisma.stockMovement.findFirst({
      where: { warehouseId: colomboWarehouse.id, partId: part.id },
    });
    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: {
          organizationId: org.id,
          branchId: colomboBranch.id,
          warehouseId: colomboWarehouse.id,
          partId: part.id,
          movementType: "PHYSICAL_ADJUSTMENT",
          quantity: 40,
          unitCost: p.purchasePrice,
          totalCost: p.purchasePrice * 40,
          referenceType: "INITIAL_OPENING_STOCK",
          notes: "Initial inventory setup balance",
        },
      });
    }
  }

  // 10. ORGANIZATION USERS (OWNER, ADVISOR, MECHANIC, CASHIER)
  console.log("👤 Seeding Organization Users & Roles...");
  const defaultPassword = await bcrypt.hash("Password@1234", 10);

  const orgUsers = [
    {
      email: "owner@apexautocare.lk",
      firstName: "Kamal",
      lastName: "Jayawardena",
      phone: "+94 77 123 4567",
      roleCode: "OWNER",
    },
    {
      email: "advisor@apexautocare.lk",
      firstName: "Nimal",
      lastName: "Bandara",
      phone: "+94 71 456 7890",
      roleCode: "SERVICE_ADVISOR",
    },
    {
      email: "mechanic@apexautocare.lk",
      firstName: "Sunil",
      lastName: "Silva",
      phone: "+94 72 789 0123",
      roleCode: "SENIOR_MECHANIC",
    },
    {
      email: "cashier@apexautocare.lk",
      firstName: "Anula",
      lastName: "Wickramasinghe",
      phone: "+94 75 321 6549",
      roleCode: "CASHIER",
    },
  ];

  for (const u of orgUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        organizationId: org.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        passwordHash: defaultPassword,
        status: "ACTIVE",
      },
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash: defaultPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        status: "ACTIVE",
      },
    });

    // Assign Role
    const role = await prisma.role.findFirst({ where: { code: u.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    // Assign User to Colombo Branch
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: user.id, branchId: colomboBranch.id } },
      update: { isDefault: true },
      create: { userId: user.id, branchId: colomboBranch.id, isDefault: true },
    });

    // If mechanic or advisor, create Employee record
    if (u.roleCode === "SENIOR_MECHANIC" || u.roleCode === "SERVICE_ADVISOR") {
      await prisma.employee.upsert({
        where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: `EMP-${u.firstName.toUpperCase()}` } },
        update: { userId: user.id },
        create: {
          organizationId: org.id,
          branchId: colomboBranch.id,
          userId: user.id,
          employeeCode: `EMP-${u.firstName.toUpperCase()}`,
          designation: u.roleCode === "SENIOR_MECHANIC" ? "Master Hybrid Diagnostic Technician" : "Chief Service Advisor",
          department: u.roleCode === "SENIOR_MECHANIC" ? "Workshop Technical" : "Customer Frontline",
          hourlyRate: 1500,
          monthlySalary: 120000,
          commissionRate: 3.5,
          status: "ACTIVE",
        },
      });
    }
  }

  // 11. SAMPLE SRI LANKAN CUSTOMERS & VEHICLES
  console.log("🚗 Seeding Sri Lankan Customers & Vehicles...");
  const customer1 = await prisma.customer.upsert({
    where: { organizationId_customerCode: { organizationId: org.id, customerCode: "CUST-0001" } },
    update: {
      firstName: "Dinesh",
      lastName: "Fernando",
      phone: "+94 77 987 6543",
      email: "dinesh.fernando@gmail.com",
      address: "No. 12, Flower Road, Colombo 07",
      creditLimit: 100000,
    },
    create: {
      organizationId: org.id,
      customerCode: "CUST-0001",
      type: "INDIVIDUAL",
      firstName: "Dinesh",
      lastName: "Fernando",
      phone: "+94 77 987 6543",
      email: "dinesh.fernando@gmail.com",
      address: "No. 12, Flower Road, Colombo 07",
      creditLimit: 100000,
      outstandingBalance: 0,
    },
  });

  const vehicle1 = await prisma.vehicle.upsert({
    where: { organizationId_registrationNumber: { organizationId: org.id, registrationNumber: "WP CAB-1234" } },
    update: {
      make: "Toyota",
      model: "Prius Hybrid",
      variant: "S Touring Grade",
      year: 2018,
      fuelType: "Hybrid",
      transmission: "e-CVT",
      mileage: 68450,
      color: "Pearl White",
    },
    create: {
      organizationId: org.id,
      customerId: customer1.id,
      registrationNumber: "WP CAB-1234",
      vehicleType: "HYBRID",
      make: "Toyota",
      model: "Prius Hybrid",
      variant: "S Touring Grade",
      year: 2018,
      fuelType: "Hybrid",
      transmission: "e-CVT",
      mileage: 68450,
      color: "Pearl White",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { organizationId_customerCode: { organizationId: org.id, customerCode: "CUST-0002" } },
    update: {
      type: "CORPORATE",
      firstName: "Lanka Logistics",
      companyName: "Lanka Logistics Express (Pvt) Ltd",
      phone: "+94 11 432 1098",
      email: "fleet@lankalogistics.lk",
      taxNumber: "VAT-98765432-0000",
      creditLimit: 500000,
    },
    create: {
      organizationId: org.id,
      customerCode: "CUST-0002",
      type: "CORPORATE",
      firstName: "Lanka Logistics",
      companyName: "Lanka Logistics Express (Pvt) Ltd",
      phone: "+94 11 432 1098",
      email: "fleet@lankalogistics.lk",
      taxNumber: "VAT-98765432-0000",
      creditLimit: 500000,
      outstandingBalance: 0,
    },
  });

  await prisma.vehicle.upsert({
    where: { organizationId_registrationNumber: { organizationId: org.id, registrationNumber: "WP ND-5566" } },
    update: {
      make: "Toyota",
      model: "HiAce KDH201",
      year: 2017,
      fuelType: "Diesel",
      transmission: "Automatic",
      mileage: 145200,
      color: "Silver Metallic",
    },
    create: {
      organizationId: org.id,
      customerId: customer2.id,
      registrationNumber: "WP ND-5566",
      vehicleType: "VAN",
      make: "Toyota",
      model: "HiAce KDH201",
      year: 2017,
      fuelType: "Diesel",
      transmission: "Automatic",
      mileage: 145200,
      color: "Silver Metallic",
    },
  });

  // 12. SAMPLE JOB CARD IN PROGRESS
  console.log("📋 Seeding Sample Live Job Card...");
  const mechanicEmployee = await prisma.employee.findFirst({ where: { organizationId: org.id } });
  const advisorUser = await prisma.user.findUnique({ where: { email: "advisor@apexautocare.lk" } });
  const bay1 = await prisma.workshopBay.findFirst({ where: { branchId: colomboBranch.id, code: "BAY-03" } });

  const sampleJobCard = await prisma.jobCard.upsert({
    where: { organizationId_jobNumber: { organizationId: org.id, jobNumber: "JC-2026-0001" } },
    update: {
      stage: "REPAIR_IN_PROGRESS",
      priority: "HIGH",
    },
    create: {
      organizationId: org.id,
      branchId: colomboBranch.id,
      jobNumber: "JC-2026-0001",
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      advisorId: advisorUser?.id,
      bayId: bay1?.id,
      stage: "REPAIR_IN_PROGRESS",
      priority: "HIGH",
      currentMileage: 68450,
      fuelLevel: "3/4",
      customerComplaints: "Hybrid system warning light intermittent on dashboard. Slight vibration during regenerative braking.",
      conditionNotes: "Exterior minor stone chip on front bumper. Interior clean.",
      estimatedLaborCost: 24000,
      estimatedPartsCost: 28300,
      estimatedTotalCost: 52300,
      actualLaborCost: 24000,
      actualPartsCost: 28300,
      actualTotalCost: 52300,
    },
  });

  // Sample Diagnostic Session with DTC Code
  const diagSession = await prisma.diagnosticSession.create({
    data: {
      jobCardId: sampleJobCard.id,
      deviceUsed: "Autel MaxiSys MS908S Pro",
      scannerType: "OBD-II",
      protocol: "ISO 15765-4 (CAN)",
      sessionNotes: "Scan performed on Toyota Prius Hybrid Control System.",
    },
  });

  await prisma.diagnosticCode.create({
    data: {
      sessionId: diagSession.id,
      dtcCode: "P0A80",
      severity: "CRITICAL",
      description: "Replace Hybrid Battery Pack / Weak Cell Block 14",
      symptoms: "HV warning light active, reduced regenerative braking efficiency",
      suggestedAction: "Conduct individual cell balancing and check cooling blower dust blockage",
      status: "PENDING_REPAIR",
    },
  });

  console.log("✅ AutoCare Pro Database Seeding Completed Successfully!");
  console.log("-----------------------------------------------------------------");
  console.log("🔑 Default Credentials:");
  console.log("   Super Admin: superadmin@autocarepro.com  / SuperAdmin@2026!");
  console.log("   Business Owner: owner@apexautocare.lk     / Password@1234");
  console.log("   Service Advisor: advisor@apexautocare.lk  / Password@1234");
  console.log("   Technician:     mechanic@apexautocare.lk / Password@1234");
  console.log("   Cashier:        cashier@apexautocare.lk  / Password@1234");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
