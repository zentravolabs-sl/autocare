import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        features: true,
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const {
      code,
      name,
      description,
      priceMonthly,
      priceYearly,
      trialDays,
      gracePeriodDays,
      features,
    } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Plan code and name are required" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.upsert({
      where: { code: code.toUpperCase() },
      update: {
        name,
        description,
        priceMonthly,
        priceYearly,
        trialDays: Number(trialDays) || 14,
        gracePeriodDays: Number(gracePeriodDays) || 7,
      },
      create: {
        code: code.toUpperCase(),
        name,
        description,
        priceMonthly,
        priceYearly,
        trialDays: Number(trialDays) || 14,
        gracePeriodDays: Number(gracePeriodDays) || 7,
      },
    });

    if (Array.isArray(features)) {
      for (const f of features) {
        await prisma.planFeature.upsert({
          where: {
            planId_featureKey: {
              planId: plan.id,
              featureKey: f.featureKey,
            },
          },
          update: {
            isEnabled: f.isEnabled ?? true,
            limitValue: f.limitValue !== undefined ? f.limitValue : null,
            description: f.description,
          },
          create: {
            planId: plan.id,
            featureKey: f.featureKey,
            isEnabled: f.isEnabled ?? true,
            limitValue: f.limitValue !== undefined ? f.limitValue : null,
            description: f.description,
          },
        });
      }
    }

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
