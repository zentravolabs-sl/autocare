import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { customerUpdateSchema } from "@/lib/validation/customer";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await getTenantContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        vehicles: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { jobCards: true },
            },
          },
        },
        jobCards: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            vehicle: true,
            branch: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            payments: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("customer.update");
    const { organizationId, userId } = await getTenantContext();
    const { id } = await params;
    const body = await req.json();

    const validated = customerUpdateSchema.parse(body);

    const existing = await prisma.customer.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check phone uniqueness if phone is being changed
    if (validated.phone && validated.phone !== existing.phone) {
      const duplicatePhone = await prisma.customer.findFirst({
        where: {
          organizationId,
          phone: validated.phone,
          id: { not: id },
        },
      });

      if (duplicatePhone) {
        return NextResponse.json(
          { error: "Another customer already has this phone number" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        type: validated.type,
        firstName: validated.firstName,
        lastName: validated.lastName,
        companyName: validated.companyName,
        taxNumber: validated.taxNumber,
        phone: validated.phone,
        whatsapp: validated.whatsapp,
        email: validated.email,
        address: validated.address,
        creditLimit: validated.creditLimit,
        notes: validated.notes,
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "UPDATE",
        entity: "CUSTOMER",
        entityId: id,
        oldValues: { name: `${existing.firstName} ${existing.lastName || ""}`, phone: existing.phone },
        newValues: { name: `${updated.firstName} ${updated.lastName || ""}`, phone: updated.phone },
      },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
