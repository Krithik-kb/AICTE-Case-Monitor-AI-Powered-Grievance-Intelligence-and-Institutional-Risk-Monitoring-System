"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Clock, AlertTriangle, ShieldAlert, CheckCircle2, 
  ArrowUpRight, AlertOctagon, RotateCcw, Building2
} from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";
import { SeverityBadge, SLABadge } from "@/components/Badges";

export default function SLAPage() {
  const router = useRouter();
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadSLA = async () => {
    setLoading(true);
    try {
      const data = await api.getSLAOverview();
      setSlaData(data);
    } catch (e: any) {
      setError(e.message || "Failed to load SLA overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || (u.role !== "ADMIN" && u.role !== "BUREAU_OFFICER" && u.role !== "VIEWER")) {
      router.replace("/login");
      return;
    }
    loadSLA();
  }, [router]);

  const handleEscalate = async (complaintId: number, refId: string) => {
    try {
      await api.escalateComplaint(complaintId, "Manual escalation from SLA Overdue Command Center.");
      setActionSuccess(`Case ${refId} has been escalated to URGENT priority.`);
      await loadSLA();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Escalation failed");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-2">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>Calculating real-time SLA adherence matrices...</div>
      </div>
    );
  }

  if (error || !slaData) {
    return (
      <div className="aicte-card p-8 bg-rose-50 text-center text-xs">
        <p className="text-rose-700 font-bold">{error || "SLA data offline"}</p>
      </div>
    );
  }

  const { summary, bureau_compliance, severity_breakdown, escalation_queue, imminent_queue } = slaData;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-900" />
            <span>SLA Tracking & Breach Escalation Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized timezone-aware deadline oversight, imminent breach queues, and administrative escalation
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Protocol Targets Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="aicte-card p-4 bg-white border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase text-rose-700">HIGH Severity SLA Target</span>
            <span className="font-black text-rose-700 text-sm">3 Days</span>
          </div>
          <div className="text-xs text-slate-700 mt-1">
            Compliance: <strong>{severity_breakdown["HIGH"]?.compliance_rate}%</strong> ({severity_breakdown["HIGH"]?.active_cases} active cases)
          </div>
        </div>

        <div className="aicte-card p-4 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase text-amber-700">MEDIUM Severity SLA Target</span>
            <span className="font-black text-amber-700 text-sm">7 Days</span>
          </div>
          <div className="text-xs text-slate-700 mt-1">
            Compliance: <strong>{severity_breakdown["MEDIUM"]?.compliance_rate}%</strong> ({severity_breakdown["MEDIUM"]?.active_cases} active cases)
          </div>
        </div>

        <div className="aicte-card p-4 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase text-emerald-700">LOW Severity SLA Target</span>
            <span className="font-black text-emerald-700 text-sm">15 Days</span>
          </div>
          <div className="text-xs text-slate-700 mt-1">
            Compliance: <strong>{severity_breakdown["LOW"]?.compliance_rate}%</strong> ({severity_breakdown["LOW"]?.active_cases} active cases)
          </div>
        </div>
      </div>

      {/* Summary KPI Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="aicte-card p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500 uppercase">Overall Compliance</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {summary.overall_sla_compliance_rate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across active cases</div>
        </div>

        <div className="aicte-card p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500 uppercase">Overdue Cases</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {summary.overdue_count}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Statutory breach triggered</div>
        </div>

        <div className="aicte-card p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500 uppercase">&lt; 24h Imminent</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {summary.imminent_24h_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Critical response window</div>
        </div>

        <div className="aicte-card p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500 uppercase">&lt; 72h Approaching</div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {summary.approaching_72h_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Follow-up reminder sent</div>
        </div>
      </div>

      {/* Main Grid: Escalation Queue & Bureau League */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue Escalation Queue (2 Cols) */}
        <div className="lg:col-span-2 aicte-card p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Overdue Cases Escalation Queue ({escalation_queue.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cases that have exceeded SLA response targets. Officials can trigger 1-click administrative escalation.
              </p>
            </div>
          </div>

          {escalation_queue.length === 0 ? (
            <div className="py-12 text-center text-xs text-emerald-700 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <strong>All Clear:</strong> Zero unresolved cases currently exceeding SLA deadlines!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Ref ID</th>
                    <th className="py-2.5 px-3">Institution</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Overdue By</th>
                    <th className="py-2.5 px-3">Assigned Bureau</th>
                    <th className="py-2.5 px-3 text-right">Escalate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {escalation_queue.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-blue-900">
                        <Link href={`/complaints/${c.id}`} className="hover:underline">
                          {c.reference_id}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 max-w-[170px] truncate" title={c.institution_name}>
                        {c.institution_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                          {Math.abs(c.days_remaining)} Days Overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {c.assigned_bureau_name || "Unassigned"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleEscalate(c.id, c.reference_id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] shadow-xs"
                        >
                          Escalate Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bureau Compliance Ranking (1 Col) */}
        <div className="aicte-card p-5 bg-white space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Bureau SLA Compliance Rates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by on-time case resolution
            </p>
          </div>

          <div className="space-y-3">
            {bureau_compliance.map((b: any) => (
              <div key={b.bureau_id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{b.bureau_name}</span>
                  <span className="font-extrabold text-blue-900">{b.compliance_rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.compliance_rate >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${b.compliance_rate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Total Cases: {b.total_cases}</span>
                  <span className="text-rose-600 font-semibold">{b.overdue_cases} Overdue</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
