import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/permissions/rbac";
import { customerCreateSchema } from "@/lib/validation/customer";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getTenantContext();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get("query")?.trim() || "";
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (type && (type === "INDIVIDUAL" || type === "CORPORATE")) {
      where.type = type;
    }

    if (query) {
      where.OR = [
        { customerCode: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        {
          vehicles: {
            some: {
              registrationNumber: { contains: query, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vehicles: {
            select: {
              id: true,
              registrationNumber: true,
              make: true,
              model: true,
              vehicleType: true,
            },
          },
          _count: {
            select: {
              jobCards: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("customer.create");
    const { organizationId, userId } = await getTenantContext();
    const body = await req.json();

    const validated = customerCreateSchema.parse(body);

    // Generate next Customer Code for tenant
    const count = await prisma.customer.count({ where: { organizationId } });
    const customerCode = `CUST-${String(count + 1).padStart(4, "0")}`;

    // Check if phone already registered in tenant
    const existingPhone = await prisma.customer.findFirst({
      where: {
        organizationId,
        phone: validated.phone,
      },
    });

    if (existingPhone) {
      return NextResponse.json(
        {
          error: `A customer with phone number ${validated.phone} already exists (${existingPhone.firstName} ${existingPhone.lastName || ""})`,
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        customerCode,
        type: validated.type,
        firstName: validated.firstName,
        lastName: validated.lastName || null,
        companyName: validated.companyName || null,
        taxNumber: validated.taxNumber || null,
        phone: validated.phone,
        whatsapp: validated.whatsapp || null,
        email: validated.email || null,
        address: validated.address || null,
        creditLimit: validated.creditLimit || 0,
        notes: validated.notes || null,
      },
      include: {
        vehicles: true,
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "CREATE",
        entity: "CUSTOMER",
        entityId: customer.id,
        newValues: {
          customerCode: customer.customerCode,
          name: `${customer.firstName} ${customer.lastName || ""}`,
          phone: customer.phone,
        },
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (err: any) {
    console.error("Create customer error:", err);
    return NextResponse.json(
      { error: err.errors ? err.errors[0]?.message : err.message },
      { status: 400 }
    );
  }
}
