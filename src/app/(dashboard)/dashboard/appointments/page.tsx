"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Car,
  User,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { formatDateLK } from "@/lib/utils";

interface Appointment {
  id: string;
  appointmentDate: string;
  timeSlot: string;
  serviceRequested?: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
  branch: {
    name: string;
    code: string;
  };
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicles: Array<{ id: string; registrationNumber: string; make: string; model: string }>;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("09:00 - 10:00");
  const [serviceRequested, setServiceRequested] = useState("Regular Maintenance Service");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [appRes, custRes] = await Promise.all([
        fetch(`/api/appointments?${params.toString()}`),
        fetch("/api/customers?limit=100"),
      ]);
      const appData = await appRes.json();
      const custData = await custRes.json();

      if (appData.appointments) setAppointments(appData.appointments);
      if (custData.customers) {
        setCustomers(custData.customers);
        if (custData.customers.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custData.customers[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // When customer changes, update vehicles list
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId && currentCustomer?.vehicles?.[0]) {
      // fallback
    }
    setIsSubmitting(true);
    try {
      const vehicleId = selectedVehicleId || currentCustomer?.vehicles?.[0]?.id;
      if (!vehicleId) throw new Error("Please select a registered vehicle");

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          vehicleId,
          appointmentDate,
          timeSlot,
          serviceRequested,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule appointment");

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "CONFIRMED" | "COMPLETED" | "CANCELLED") => {
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <Calendar className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              WORKSHOP SCHEDULE & BOOKINGS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Service Appointments & Reception Desk
          </h1>
          <p className="text-xs text-slate-400">
            Pre-booked customer slots, time-window availability and automated job reception intake
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Book Appointment</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-[#0B132B] border border-slate-800 p-3 rounded-2xl w-full sm:w-auto">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PENDING">PENDING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-white">
                  {formatDateLK(appt.appointmentDate)}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  appt.status === "CONFIRMED"
                    ? "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                    : appt.status === "COMPLETED"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                    : appt.status === "CANCELLED"
                    ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                    : "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                }`}
              >
                {appt.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                <span>{appt.vehicle.registrationNumber}</span>
                <span className="text-slate-400 font-normal">
                  ({appt.vehicle.make} {appt.vehicle.model})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {appt.customer.firstName} {appt.customer.lastName} ({appt.customer.phone})
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-300 font-mono text-[11px]">
                <Clock className="h-3.5 w-3.5" />
                <span>Time Slot: {appt.timeSlot}</span>
              </div>
              {appt.serviceRequested && (
                <p className="text-[11px] text-slate-400 italic mt-1">&quot;{appt.serviceRequested}&quot;</p>
              )}
            </div>

            {appt.status === "CONFIRMED" && (
              <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(appt.id, "COMPLETED")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Reception Intake</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(appt.id, "CANCELLED")}
                  className="bg-slate-900 hover:bg-rose-950 border border-slate-700 text-rose-400 text-[10px] font-bold px-2 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && !isLoading && (
          <div className="col-span-3 py-16 text-center text-slate-500 text-xs">
            No service appointments scheduled. Click &quot;Book Appointment&quot; to reserve a slot.
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAppointment}
            className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Book Service Appointment</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust && cust.vehicles.length > 0) {
                      setSelectedVehicleId(cust.vehicles[0].id);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 outline-none"
                >
                  {currentCustomer?.vehicles?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.make} {v.model})
                    </option>
                  ))}
                  {(!currentCustomer?.vehicles || currentCustomer.vehicles.length === 0) && (
                    <option value="">No vehicles registered for this client</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 outline-none font-mono"
                  >
                    <option value="08:30 - 09:30">08:30 - 09:30</option>
                    <option value="09:30 - 10:30">09:30 - 10:30</option>
                    <option value="10:30 - 11:30">10:30 - 11:30</option>
                    <option value="11:30 - 12:30">11:30 - 12:30</option>
                    <option value="13:30 - 14:30">13:30 - 14:30</option>
                    <option value="14:30 - 15:30">14:30 - 15:30</option>
                    <option value="15:30 - 16:30">15:30 - 16:30</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Service Requested</label>
                <input
                  type="text"
                  value={serviceRequested}
                  onChange={(e) => setServiceRequested(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-900 text-slate-300 py-2.5 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
