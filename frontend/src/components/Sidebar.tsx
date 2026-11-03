"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, FileText, Landmark, Clock, 
  BrainCircuit, Send, Search, ShieldCheck, ChevronRight
} from "lucide-react";
import { getCurrentStoredUser, User } from "@/lib/api";

const NAV_ITEMS = [
  {
    label: "Executive Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: "Live"
  },
  {
    label: "Complaints Desk",
    href: "/complaints",
    icon: FileText,
  },
  {
    label: "Institutions & Scores",
    href: "/institutions",
    icon: Landmark,
  },
  {
    label: "SLA & Escalations",
    href: "/sla",
    icon: Clock,
  },
  {
    label: "AI Intelligence Cell",
    href: "/ai-insights",
    icon: BrainCircuit,
    badge: "ML",
    officerOrAdminOnly: true
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ShieldCheck,
    adminOnly: true
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentStoredUser());
  }, []);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0 border-r border-slate-800">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 mb-2">
            AICTE Case Monitor
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              if (item.adminOnly && user?.role !== "ADMIN") return null;
              if (item.officerOrAdminOnly && user?.role !== "ADMIN" && user?.role !== "BUREAU_OFFICER") return null;
              
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-800 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Current Bureau Context */}
        {user?.bureau_id && (
          <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Bureau</div>
            <div className="text-xs font-bold text-amber-400 mt-0.5">
              Bureau Officer Active
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Filtering enabled for assigned bureau cases and official action dispatch.
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">AICTE Enterprise</span>
          <span className="text-emerald-400 font-mono text-[10px]">v1.0-PROD</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Centralized Grievance Intelligence & Institutional Monitoring System
        </p>
      </div>
    </aside>
  );
}
