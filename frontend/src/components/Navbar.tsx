"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  Building2, UserCheck, LogOut, RefreshCw, Shield, 
  ExternalLink, ChevronDown, CheckCircle
} from "lucide-react";
import { api, getCurrentStoredUser, removeAuthToken, User } from "@/lib/api";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  useEffect(() => {
    const u = getCurrentStoredUser();
    setUser(u);
    api.getDemoAccounts().then(setDemoAccounts).catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    window.location.href = "/login";
  };

  const switchAccount = async (account: any) => {
    try {
      await api.login(account.email, account.password);
      const updated = getCurrentStoredUser();
      setUser(updated);
      setShowDemoModal(false);
      window.location.reload();
    } catch (e) {
      alert("Failed to switch account");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="tricolor-bar" />
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand / Emblem */}
        <div className="flex items-center space-x-3">
          <Link href={user ? "/" : "/public"} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-xs border border-blue-800">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-blue-900 transition-colors">
                  AICTE Case Monitor
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                  GOVT OF INDIA
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {user ? "Central Grievance Intelligence & Institutional Monitoring System" : "Citizen Grievance Lodging & Case Milestones Portal"}
              </p>
            </div>
          </Link>
        </div>

        {/* User / Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDemoModal(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-left"
                title="Switch demo role (Admin / Officer / Viewer)"
              >
                <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                  {user.role === "ADMIN" ? "A" : user.role === "BUREAU_OFFICER" ? "O" : "V"}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-blue-700 font-medium">
                    {user.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/public"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-900 hover:bg-slate-100 transition-colors"
              >
                Lodge Grievance
              </Link>
              <Link
                href="/track"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-900 hover:bg-slate-100 transition-colors"
              >
                Track Status
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 shadow-xs transition-colors"
              >
                Official Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Demo Account Switcher Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Switch Demo Profile (Role-Based Permissions)</h3>
              </div>
              <button 
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 mb-2">
                Select an authorized test profile to verify backend permission enforcement and bureau views:
              </p>
              {demoAccounts.map((acc) => {
                const isCurrent = user?.email === acc.email;
                return (
                  <div 
                    key={acc.email}
                    onClick={() => switchAccount(acc)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isCurrent 
                        ? "border-blue-600 bg-blue-50/50" 
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-900 flex items-center space-x-1.5">
                        <span>{acc.name}</span>
                        {isCurrent && <CheckCircle className="w-3.5 h-3.5 text-blue-600 inline" />}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-1">{acc.email}</div>
                    <div className="text-[10px] text-slate-600 bg-white/70 p-1.5 rounded border border-slate-100">
                      <strong>Access:</strong> {acc.permissions}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
