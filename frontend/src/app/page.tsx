"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, Clock, CheckCircle2, AlertOctagon, TrendingUp, 
  BarChart3, PieChart as PieChartIcon, ShieldAlert, ArrowUpRight, RefreshCw, Filter
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, getCurrentStoredUser } from "@/lib/api";
import { IndiaMap } from "@/components/IndiaMap";
import { StatusBadge, SeverityBadge, SLABadge } from "@/components/Badges";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await api.getDashboardSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentStoredUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BUREAU_OFFICER" && user.role !== "VIEWER")) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded"></div>
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 aicte-card bg-rose-50 border-rose-200 text-center">
        <AlertOctagon className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-rose-900">Dashboard Offline</h3>
        <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
          {error || "Unable to retrieve real-time telemetry from FastAPI backend."}
        </p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, status_distribution, monthly_trend, bureau_distribution, category_breakdown, state_statistics, priority_queue, recent_activity } = data;

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>AICTE Central Monitoring Command</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized grievance telemetry, SLA breach detection, and institutional risk indexing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-500 hidden md:inline">
            Live database sync active
          </span>
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/complaints"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Complaints</span>
          </Link>
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Complaints */}
        <div className="aicte-card p-4 bg-white border-l-4 border-l-blue-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Complaints</span>
            <FileText className="w-4 h-4 text-blue-900" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.total_complaints}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across 8 Bureaus & Cells</div>
        </div>

        {/* Open Complaints */}
        <div className="aicte-card p-4 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Inquiries</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.open_complaints}</div>
          <div className="text-[11px] text-slate-500 mt-1">Under review / investigation</div>
        </div>

        {/* Resolved Complaints */}
        <div className="aicte-card p-4 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.resolved_complaints}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            {metrics.total_complaints > 0
              ? Math.round((metrics.resolved_complaints / metrics.total_complaints) * 100)
              : 0}% resolution rate
          </div>
        </div>

        {/* Overdue SLA Complaints */}
        <div className="aicte-card p-4 bg-white border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Overdue</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{metrics.overdue_complaints}</div>
          <div className="text-[11px] text-rose-700 mt-1 font-semibold flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block"></span>
            <span>Urgent escalation queue</span>
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="aicte-card p-4 bg-white border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Resolution</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {metrics.average_resolution_days} <span className="text-xs font-normal text-slate-500">Days</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Target SLA: &lt; 7.0 Days</div>
        </div>
      </div>

      {/* Interactive India Map */}
      <IndiaMap stateStatistics={state_statistics || []} />

      {/* Row: Status Donut Chart & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <div className="aicte-card p-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <PieChartIcon className="w-4 h-4 text-blue-900" />
                <span>Status Breakdown</span>
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                Live Distribution
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Proportion of active vs closed cases in database
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={status_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {status_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Custom Mini Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {status_distribution.map((st: any) => (
              <div key={st.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                <span className="text-slate-600 text-[11px] truncate">{st.name.replace("_", " ")}:</span>
                <span className="font-bold text-slate-900 text-[11px]">{st.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Complaint Trend */}
        <div className="lg:col-span-2 aicte-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span>Monthly Intake & Resolution Trajectory</span>
            </h3>
            <span className="text-[10px] text-slate-500">Past 6 Months</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Comparison of received complaints against resolved closures and overdue cases
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                <Area type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row: Bureau Workload & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau Bar Chart */}
        <div className="aicte-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Bureau-wise Case Load</h3>
            <span className="text-[10px] bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded">
              8 Bureaus
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Pending versus resolved distribution across administrative cells
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureau_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div className="aicte-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Grievance Category Breakdown</h3>
            <span className="text-[10px] text-slate-500">Distribution %</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Relative frequency of grievance categories across all logged records
          </p>
          <div className="space-y-3.5">
            {category_breakdown.map((cat: any) => (
              <div key={cat.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{cat.category}</span>
                  <span className="text-slate-500 font-medium">
                    {cat.count} cases ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-900 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Priority Escalation Queue & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Escalation Queue (2 Cols) */}
        <div className="lg:col-span-2 aicte-card p-5 bg-white">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Priority Action Queue (Urgent & Approaching Breach)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cases ranked by severity, SLA threshold, and repeat complaint frequency
              </p>
            </div>
            <Link
              href="/complaints?severity=HIGH"
              className="text-xs font-semibold text-blue-900 hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2 px-2.5">Ref ID</th>
                  <th className="py-2 px-2.5">Institution</th>
                  <th className="py-2 px-2.5">Category</th>
                  <th className="py-2 px-2.5">Severity</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">SLA Target</th>
                  <th className="py-2 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priority_queue.slice(0, 6).map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-2.5 font-bold text-blue-900">
                      <Link href={`/complaints/${c.id}`} className="hover:underline">
                        {c.reference_id}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2.5 font-medium text-slate-800 max-w-[170px] truncate" title={c.institution_name}>
                      {c.institution_name}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">{c.category}</td>
                    <td className="py-2.5 px-2.5">
                      <SeverityBadge severity={c.severity} />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <SLABadge isOverdue={c.is_overdue} daysRemaining={c.days_remaining} />
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      <Link
                        href={`/complaints/${c.id}`}
                        className="text-blue-900 hover:text-blue-700 font-bold"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Action Activity Feed (1 Col) */}
        <div className="aicte-card p-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Official Actions</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="space-y-3.5">
              {recent_activity.slice(0, 5).map((act: any) => (
                <div key={act.id} className="text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-800">{act.user_name}</span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-900 font-semibold mb-0.5">
                    {act.action_type.replace("_", " ")}
                  </div>
                  <p className="text-slate-600 line-clamp-2 text-[11px]">
                    {act.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4">
            <Link
              href="/complaints"
              className="text-center block text-xs font-semibold text-blue-900 hover:underline"
            >
              Open Complaints Central Desk &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
