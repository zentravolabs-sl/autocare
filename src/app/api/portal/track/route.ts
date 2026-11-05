import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, BusinessRuleError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const phone = sp.get("phone")?.trim();
    const plate = sp.get("plate")?.trim().toUpperCase();

    if (!phone && !plate) {
      throw new BusinessRuleError("Phone number or vehicle license plate required for customer lookup");
    }

    let customer = null;
    if (phone) {
      customer = await prisma.customer.findFirst({
        where: { phone: { contains: phone } },
        include: {
          vehicles: {
            include: {
              warranties: { where: { status: "ACTIVE" } },
            },
          },
          jobCards: {
            include: {
              vehicle: { select: { registrationNumber: true, make: true, model: true } },
              invoices: {
                select: { id: true, invoiceNumber: true, totalAmount: true, status: true, balanceAmount: true },
              },
            },
            orderBy: { receivedAt: "desc" },
            take: 10,
          },
          appointments: {
            include: {
              vehicle: { select: { registrationNumber: true, make: true, model: true } },
            },
            orderBy: { appointmentDate: "desc" },
            take: 5,
          },
        },
      });
    }

    if (!customer && plate) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { registrationNumber: { contains: plate } },
        include: {
          customer: {
            include: {
              vehicles: true,
              jobCards: {
                where: { vehicle: { registrationNumber: { contains: plate } } },
                include: {
                  vehicle: { select: { registrationNumber: true, make: true, model: true } },
                  invoices: {
                    select: { id: true, invoiceNumber: true, totalAmount: true, status: true, balanceAmount: true },
                  },
                },
                orderBy: { receivedAt: "desc" },
              },
              appointments: {
                include: {
                  vehicle: { select: { registrationNumber: true, make: true, model: true } },
                },
              },
            },
          },
        },
      });
      if (vehicle) customer = vehicle.customer as any;
    }

    if (!customer) {
      return NextResponse.json({ customer: null, message: "No customer profile found" });
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName || ""}`.trim(),
        phone: customer.phone,
        email: customer.email,
        customerCode: customer.customerCode,
        outstandingBalance: Number(customer.outstandingBalance),
        vehicles: customer.vehicles,
        activeRepairs: customer.jobCards.filter((jc: any) =>
          !["VEHICLE_DELIVERY", "CLOSED", "CANCELLED"].includes(jc.stage)
        ),
        pastRepairs: customer.jobCards.filter((jc: any) =>
          ["VEHICLE_DELIVERY", "CLOSED"].includes(jc.stage)
        ),
        appointments: customer.appointments,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
