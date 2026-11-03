"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, Lock, Mail, Shield, ArrowRight, 
  CheckCircle2, AlertOctagon, UserCheck
} from "lucide-react";
import { api } from "@/lib/api";

const DEMO_PRESETS = [
  {
    role: "ADMIN",
    title: "Central Administrator",
    name: "Dr. Arvind Kumar",
    email: "admin@aicte.gov.in",
    password: "AdminPassword@2026",
    color: "border-blue-900 bg-blue-50/50 text-blue-900",
    badge: "Full Privileges",
    desc: "Oversee all bureaus, audit logs, system-wide SLA escalation, and algorithm parameters."
  },
  {
    role: "BUREAU_OFFICER",
    title: "Bureau Officer (Approval Bureau)",
    name: "Smt. Ritu Sharma",
    email: "officer.ab@aicte.gov.in",
    password: "OfficerPassword@2026",
    color: "border-amber-600 bg-amber-50/50 text-amber-900",
    badge: "Jurisdiction Access",
    desc: "Manage assigned complaints, update progress notes, reassign bureaus, and schedule inquiries."
  },
  {
    role: "VIEWER",
    title: "Transparency Ombudsman / Auditor",
    name: "Shri Rajesh Verma",
    email: "viewer@aicte.gov.in",
    password: "ViewerPassword@2026",
    color: "border-emerald-600 bg-emerald-50/50 text-emerald-900",
    badge: "Read-Only Auditor",
    desc: "Access executive dashboards, institutional risk scores, and public health telemetry without edit permissions."
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@aicte.gov.in");
  const [password, setPassword] = useState("AdminPassword@2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = async (preset: typeof DEMO_PRESETS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setLoading(true);
    setError(null);
    try {
      await api.login(preset.email, preset.password);
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Preset authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="p-8 space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-amber-400 flex items-center justify-center mb-2 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Official Portal Sign In
            </h2>
            <p className="text-xs text-slate-500">
              AICTE Case Monitor — Central Grievance & SLA Command
            </p>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hackathon Live Database</span>
              </span>
              <span className="text-[10px] font-semibold bg-blue-200/60 text-blue-900 px-1.5 py-0.5 rounded">
                346 Cases Monitored
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickPreset(DEMO_PRESETS[0])}
              disabled={loading}
              className="w-full py-2 px-3 bg-blue-900 hover:bg-blue-800 text-amber-300 hover:text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>⚡ 1-Click Launch: Central Admin (Full Access)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                AICTE Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 text-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In as Official</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <Link href="/public" className="hover:underline text-blue-900 font-semibold">
              Public Grievance Portal &rarr;
            </Link>
            <Link href="/track" className="hover:underline text-blue-900 font-semibold">
              Track Reference ID &rarr;
            </Link>
          </div>
        </div>

        {/* Right Side: Demo Accounts Switcher (Official Role Profiles) */}
        <div className="bg-slate-50 p-8 border-l border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-900" />
              <h3 className="font-bold text-sm text-slate-900">
                1-Click Official Role Profiles
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Select any pre-configured demo account to verify role-based permissions:
            </p>

            <div className="space-y-3">
              {DEMO_PRESETS.map((p) => (
                <div
                  key={p.role}
                  onClick={() => handleQuickPreset(p)}
                  className={`p-3 rounded-xl border bg-white cursor-pointer hover:shadow-md transition-all ${
                    email === p.email ? "border-blue-900 ring-2 ring-blue-900/10" : "border-slate-200 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{p.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {p.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-blue-900">{p.email}</div>
                  <p className="text-[10px] text-slate-500 mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            Secure JWT authentication with bcrypt hashing. Passwords are encrypted in database.
          </div>
        </div>
      </div>
    </div>
  );
}
