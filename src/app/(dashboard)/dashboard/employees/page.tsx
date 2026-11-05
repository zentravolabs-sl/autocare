"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  Plus,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Calendar,
  Layers,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK } from "@/lib/utils";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
  hourlyRate: number;
  monthlySalary: number;
  commissionRate: number;
  status: string;
  joinedDate: string;
  email?: string | null;
  phone?: string | null;
  branch: {
    name: string;
    code: string;
  };
  stats: {
    taskAssignments: number;
    timeLogs: number;
    attendances: number;
  };
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  clockIn: string;
  clockOut?: string | null;
  totalHours: number;
  status: string;
  notes?: string | null;
}

export default function EmployeesHRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("directory");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEmp, setNewEmp] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    designation: "Technician",
    department: "Mechanical",
    hourlyRate: 4500,
    monthlySalary: 120000,
    commissionRate: 5,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/attendance"),
      ]);
      const empData = await empRes.json();
      const attData = await attRes.json();
      if (empData.employees) setEmployees(empData.employees);
      if (attData.attendances) setAttendances(attData.attendances);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmp({
          employeeCode: "",
          firstName: "",
          lastName: "",
          designation: "Technician",
          department: "Mechanical",
          hourlyRate: 4500,
          monthlySalary: 120000,
          commissionRate: 5,
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockAction = async (employeeId: string, action: "CLOCK_IN" | "CLOCK_OUT") => {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, action }),
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
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
              <Users className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">
              WORKFORCE & PAYROLL
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Human Resources & Technician Attendance
          </h1>
          <p className="text-xs text-slate-400">
            Technician staff profiles, hourly rates, commission structures and daily timesheet tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Enroll Employee</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "directory"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "attendance"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Daily Timesheet / Clock Log</span>
        </button>
      </div>

      {/* Staff Directory Tab */}
      {activeTab === "directory" && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Code & Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Hourly Rate</th>
                <th className="px-4 py-3 text-right">Monthly Base</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Attendance Quick Clock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.map((emp) => {
                const todayClock = attendances.find((a) => a.employeeId === emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{emp.name}</div>
                      <span className="font-mono text-[10px] text-purple-400">{emp.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{emp.designation}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">
                        {emp.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                      {formatCurrencyLKR(emp.hourlyRate)}/hr
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {formatCurrencyLKR(emp.monthlySalary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      {emp.commissionRate}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!todayClock ? (
                        <button
                          onClick={() => handleClockAction(emp.id, "CLOCK_IN")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg"
                        >
                          Clock In
                        </button>
                      ) : !todayClock.clockOut ? (
                        <button
                          onClick={() => handleClockAction(emp.id, "CLOCK_OUT")}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg"
                        >
                          Clock Out
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          Completed ({todayClock.totalHours}h)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No employees enrolled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Timesheet Tab */}
      {activeTab === "attendance" && (
        <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Today&apos;s Clock-In Log</h3>
            <span className="text-xs text-slate-400 font-mono">{new Date().toDateString()}</span>
          </div>

          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-2">Employee</th>
                <th className="py-2">Clock In</th>
                <th className="py-2">Clock Out</th>
                <th className="py-2 text-right">Total Hours</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {attendances.map((att) => (
                <tr key={att.id}>
                  <td className="py-2.5 text-white">
                    <span className="text-purple-400 font-bold">{att.employeeCode}</span> - {att.employeeName}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {new Date(att.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {att.clockOut
                      ? new Date(att.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Still Active"}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-400">
                    {att.totalHours > 0 ? `${att.totalHours} hrs` : "-"}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))}
              {attendances.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No clock-in records for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEmployee}
            className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Enroll Staff / Technician</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Employee Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-001"
                  value={newEmp.employeeCode}
                  onChange={(e) => setNewEmp({ ...newEmp, employeeCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Designation</label>
                <input
                  type="text"
                  required
                  placeholder="Senior Hybrid Technician"
                  value={newEmp.designation}
                  onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={newEmp.firstName}
                  onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={newEmp.lastName}
                  onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Hourly Billing Rate (LKR)</label>
                <input
                  type="number"
                  value={newEmp.hourlyRate}
                  onChange={(e) => setNewEmp({ ...newEmp, hourlyRate: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Monthly Base Salary (LKR)</label>
                <input
                  type="number"
                  value={newEmp.monthlySalary}
                  onChange={(e) => setNewEmp({ ...newEmp, monthlySalary: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-900 text-slate-300 py-2.5 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-bold"
              >
                {isSubmitting ? "Enrolling..." : "Complete Enrollment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
