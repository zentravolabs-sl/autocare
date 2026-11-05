"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Shield, Car, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@apexautocare.lk");
  const [password, setPassword] = useState("Password@1234");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.user?.isSuperAdmin && !data.user?.organization) {
        router.push("/super-admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quickRoles = [
    { label: "👑 Super Admin", email: "superadmin@autocarepro.com", pass: "SuperAdmin@2026!" },
    { label: "🏢 Business Owner", email: "owner@apexautocare.lk", pass: "Password@1234" },
    { label: "📋 Service Advisor", email: "advisor@apexautocare.lk", pass: "Password@1234" },
    { label: "🔧 Senior Mechanic", email: "mechanic@apexautocare.lk", pass: "Password@1234" },
    { label: "💳 Cashier / POS", email: "cashier@apexautocare.lk", pass: "Password@1234" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      {/* Left Branding Hero Banner */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0A1128] border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.15),transparent_70%)]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/30">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                AUTOCARE <span className="text-blue-400">PRO</span>
              </h1>
              <p className="text-xs font-mono uppercase tracking-widest text-blue-300">
                Enterprise Workshop Operating System
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
            <Shield className="h-3.5 w-3.5" />
            <span>Sri Lanka Enterprise Edition • LKR Precision Engine</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Transforming Multi-Brand & Hybrid Workshops into High-Precision Machines.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            End-to-end 14-stage job cards, immutable stock ledgers, OBD-II diagnostic logging, double-entry financial accounting, and offline-first edge sync.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              "Multi-Branch Architecture",
              "Dynamic SaaS Entitlements",
              "Offline-First Dexie Engine",
              "Hybrid & EV Battery Health",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex justify-between">
          <span>© 2026 AutoCare Pro SaaS. All rights reserved.</span>
          <span>Asia/Colombo • en-LK</span>
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <div className="flex lg:hidden items-center gap-2.5 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Wrench className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">AUTOCARE PRO</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Enterprise Sign In
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Access your automotive workshop terminal or platform admin portal.
            </p>
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              ⚡ Quick One-Click Credentials
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {quickRoles.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEmail(r.email);
                    setPassword(r.pass);
                  }}
                  className="rounded-md border border-slate-700/60 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-blue-500 hover:bg-blue-600/20 hover:text-white transition-all text-left truncate"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Staff Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. owner@apexautocare.lk"
              required
              className="bg-slate-900 border-slate-800 text-white"
            />

            <Input
              id="password"
              type="password"
              label="Security Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="bg-slate-900 border-slate-800 text-white"
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full font-semibold shadow-lg shadow-blue-600/30"
            >
              <span>Sign In to Terminal</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <div className="border-t border-slate-900 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Isolated Multi-Tenant Security • Server-Enforced RBAC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
