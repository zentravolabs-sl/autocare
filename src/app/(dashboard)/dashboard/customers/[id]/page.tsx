import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Car,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  PlusCircle,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
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
        orderBy: { receivedAt: "desc" },
        include: {
          vehicle: true,
          branch: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: {
          payments: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const outstanding = Number(customer.outstandingBalance || 0);
  const creditLimit = Number(customer.creditLimit || 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/customers" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Customer Directory
            </Link>
            <span className="text-xs text-slate-400">•</span>
            <Badge variant={customer.type === "CORPORATE" ? "info" : "default"}>
              {customer.type}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {customer.type === "CORPORATE" && customer.companyName
              ? customer.companyName
              : `${customer.firstName} ${customer.lastName || ""}`}
          </h1>
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/50">
            {customer.customerCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {customer.whatsapp && (
            <a
              href={`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 border-emerald-500/30">
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>
            </a>
          )}
          <Link href={`/dashboard/vehicles?customerId=${customer.id}`}>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <PlusCircle className="h-4 w-4" />
              <span>Register New Vehicle</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer 360 Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contact & Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-bold text-slate-900 dark:text-white">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">{customer.address}</span>
              </div>
            )}
            {customer.taxNumber && (
              <div className="pt-1 text-[11px] font-mono text-slate-500">
                VAT/TIN: {customer.taxNumber}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial & Ledger Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Financial Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs text-slate-500 block">Current Outstanding Balance</span>
              <span
                className={`text-2xl font-black font-mono ${
                  outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatCurrencyLKR(outstanding)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Authorized Credit Limit</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrencyLKR(creditLimit)}
                </span>
              </div>
              {creditLimit > 0 && (
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (outstanding / creditLimit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fleet & Lifetime Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {customer.vehicles.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mt-1">
                Vehicles Registered
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {customer.jobCards.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mt-1">
                Total Job Cards
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registered Vehicles Fleet */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" /> Customer Vehicle Fleet ({customer.vehicles.length})
          </h2>
          <Link href={`/dashboard/vehicles?customerId=${customer.id}`}>
            <Button variant="outline" size="sm" className="text-xs">
              + Add Vehicle
            </Button>
          </Link>
        </div>

        {customer.vehicles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              No vehicles registered yet for this client.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customer.vehicles.map((v) => (
              <Card key={v.id} className="hover:border-blue-500/50 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/50">
                      {v.registrationNumber}
                    </span>
                    <Badge variant={v.fuelType.toLowerCase().includes("hybrid") ? "info" : "default"}>
                      {v.vehicleType}
                    </Badge>
                  </div>
                  <CardTitle className="text-base pt-2">
                    {v.make} {v.model} {v.variant ? `(${v.variant})` : ""}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Year: {v.year || "N/A"} • Fuel: {v.fuelType} • {v.transmission}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Odometer Mileage:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {v.mileage.toLocaleString()} km
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link href={`/dashboard/vehicles/${v.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <span>360° History ({v._count.jobCards})</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>

                    <Link href={`/dashboard/job-cards?vehicleId=${v.id}`}>
                      <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                        Intake Job
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Service History & Job Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" /> Service History & Job Cards
        </h2>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Job Card #</th>
                    <th className="px-6 py-3.5">Vehicle</th>
                    <th className="px-6 py-3.5">Branch</th>
                    <th className="px-6 py-3.5">Received Date</th>
                    <th className="px-6 py-3.5">Workflow Stage</th>
                    <th className="px-6 py-3.5 text-right">Job Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customer.jobCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                        No job cards created yet for this customer.
                      </td>
                    </tr>
                  ) : (
                    customer.jobCards.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3.5">
                          <Link href={`/dashboard/job-cards/${j.id}`} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            {j.jobNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                          {j.vehicle.registrationNumber}
                        </td>
                        <td className="px-6 py-3.5">{j.branch.name}</td>
                        <td className="px-6 py-3.5 text-slate-500">{formatDateLK(j.receivedAt)}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant="info" className="font-mono text-[10px]">
                            {j.stage.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrencyLKR(j.actualTotalCost || j.estimatedTotalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
