import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Car,
  Users,
  Wrench,
  Cpu,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Phone,
  Fuel,
  Activity,
  CheckCircle2,
  FileText,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

export default async function Vehicle360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      jobCards: {
        orderBy: { receivedAt: "desc" },
        include: {
          branch: true,
          bay: true,
          tasks: {
            include: {
              assignments: {
                include: {
                  employee: true,
                },
              },
            },
          },
          partsIssued: {
            include: {
              part: true,
            },
          },
          diagnostics: {
            include: {
              codes: true,
            },
          },
        },
      },
      warranties: {
        orderBy: { startDate: "desc" },
        include: {
          claims: true,
        },
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  const isInsuranceExpired = vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) < new Date();
  const isLicenseExpired = vehicle.licenseExpiry && new Date(vehicle.licenseExpiry) < new Date();

  return (
    <div className="space-y-6 font-sans">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/vehicles" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Fleet Registry
            </Link>
            <span className="text-xs text-slate-400">•</span>
            <Badge variant="info">{vehicle.vehicleType}</Badge>
            <Badge variant={vehicle.fuelType.toLowerCase().includes("hybrid") ? "info" : "default"}>
              {vehicle.fuelType}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-200/50">
              {vehicle.registrationNumber}
            </h1>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {vehicle.make} {vehicle.model} {vehicle.variant ? `(${vehicle.variant})` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/job-cards?vehicleId=${vehicle.id}`}>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Wrench className="h-4 w-4" />
              <span>Intake New Job Card</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Specifications & Owner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Technical Specs */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Car className="h-4 w-4 text-blue-600" /> Technical Specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Manufacturing Year</span>
                <span className="font-bold text-slate-900 dark:text-white">{vehicle.year || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Transmission</span>
                <span className="font-bold text-slate-900 dark:text-white">{vehicle.transmission}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Odometer Mileage</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {vehicle.mileage.toLocaleString()} km
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Color</span>
                <span className="font-bold text-slate-900 dark:text-white">{vehicle.color || "Standard"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Chassis / VIN</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {vehicle.vinChassis || "Not Recorded"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Engine Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {vehicle.engineNumber || "Not Recorded"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Revenue License Expiry</span>
                <span className={`font-semibold ${isLicenseExpired ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                  {formatDateLK(vehicle.licenseExpiry)} {isLicenseExpired && "(Expired)"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Insurance Policy Expiry</span>
                <span className={`font-semibold ${isInsuranceExpired ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                  {formatDateLK(vehicle.insuranceExpiry)} {isInsuranceExpired && "(Expired)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registered Customer Owner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" /> Registered Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <Link
                href={`/dashboard/customers/${vehicle.customer.id}`}
                className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline block"
              >
                {vehicle.customer.type === "CORPORATE" && vehicle.customer.companyName
                  ? vehicle.customer.companyName
                  : `${vehicle.customer.firstName} ${vehicle.customer.lastName || ""}`}
              </Link>
              <span className="font-mono text-[10px] text-slate-500">
                {vehicle.customer.customerCode} • {vehicle.customer.type}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-800 dark:text-slate-200">{vehicle.customer.phone}</span>
            </div>

            {vehicle.customer.address && (
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {vehicle.customer.address}
              </p>
            )}

            <div className="pt-2">
              <Link href={`/dashboard/customers/${vehicle.customer.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Owner 360° Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 360-Degree Historical Service Lineage */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" /> Vehicle 360° Historical Service Lineage ({vehicle.jobCards.length})
          </h2>
        </div>

        {vehicle.jobCards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-xs text-slate-400">
              No historical job cards recorded yet for vehicle {vehicle.registrationNumber}.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vehicle.jobCards.map((job) => (
              <Card key={job.id} className="border-l-4 border-l-blue-600 overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/job-cards/${job.id}`}
                          className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {job.jobNumber}
                        </Link>
                        <Badge variant="info" className="font-mono text-[10px]">
                          {job.stage.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Branch: <strong>{job.branch.name}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Intake: {formatDateLK(job.receivedAt)} • Odometer at Reception:{" "}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {job.currentMileage.toLocaleString()} km
                        </strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total Work Cost</span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrencyLKR(job.actualTotalCost || job.estimatedTotalCost)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs">
                  {/* Complaints */}
                  {job.customerComplaints && (
                    <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 p-2.5 border border-amber-200/50 text-amber-900 dark:text-amber-300">
                      <strong>Client Stated Complaint:</strong> {job.customerComplaints}
                    </div>
                  )}

                  {/* OBD-II Diagnostic Codes Detected */}
                  {job.diagnostics?.some((d) => d.codes.length > 0) && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-purple-600" /> OBD-II Diagnostics Logged
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {job.diagnostics.flatMap((d) => d.codes).map((code) => (
                          <div
                            key={code.id}
                            className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-2"
                          >
                            <span className="font-mono font-black">{code.dtcCode}</span>
                            <span>•</span>
                            <span className="truncate max-w-[220px]">{code.description}</span>
                            <Badge variant={code.status === "REPAIRED" ? "success" : "warning"} className="text-[9px]">
                              {code.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks & Parts Replaced */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Tasks */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-blue-600" /> Services & Tasks Completed
                      </span>
                      {job.tasks.length === 0 ? (
                        <span className="text-slate-400 italic">No tasks logged</span>
                      ) : (
                        <div className="space-y-1">
                          {job.tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{t.name}</span>
                              <Badge variant={t.status === "COMPLETED" ? "success" : "default"} className="text-[9px]">
                                {t.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Consumed Parts */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-emerald-600" /> Spare Parts Replaced
                      </span>
                      {job.partsIssued.length === 0 ? (
                        <span className="text-slate-400 italic">No inventory parts issued</span>
                      ) : (
                        <div className="space-y-1">
                          {job.partsIssued.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {p.part.name} ({Number(p.quantity)} {p.part.sku})
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrencyLKR(Number(p.unitPrice) * Number(p.quantity))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
