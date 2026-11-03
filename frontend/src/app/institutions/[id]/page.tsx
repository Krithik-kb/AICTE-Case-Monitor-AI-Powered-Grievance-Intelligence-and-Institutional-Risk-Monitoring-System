"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, MapPin, Mail, Phone, ShieldAlert, 
  FileText, CheckCircle2, AlertTriangle, Scale, History, Award, Check
} from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";
import { RiskBadge, StatusBadge, SeverityBadge, SLABadge } from "@/components/Badges";

function InstitutionDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const instId = Number(params.id);

  const [institution, setInstitution] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"complaints" | "inspections" | "legal" | "approvals">("complaints");

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || (u.role !== "ADMIN" && u.role !== "BUREAU_OFFICER" && u.role !== "VIEWER")) {
      router.replace("/public");
      return;
    }
    async function load() {
      setLoading(true);
      try {
        const data = await api.getInstitutionDetail(instId);
        setInstitution(data);

        // Also fetch complaints for this institution
        const cRes = await api.getComplaints({ institution_id: instId, limit: 30 });
        setComplaints(cRes.items);
      } catch (e: any) {
        setError(e.message || "Failed to load institution profile");
      } finally {
        setLoading(false);
      }
    }
    if (instId) load();
  }, [instId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-2">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>Loading institutional dossier and algorithmic score...</div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="aicte-card p-8 bg-rose-50 text-center text-xs">
        <p className="text-rose-700 font-bold">{error || "Institution not found"}</p>
        <Link href="/institutions" className="text-blue-900 underline mt-2 inline-block">
          &larr; Back to Institutions Index
        </Link>
      </div>
    );
  }

  const score = institution.monitoring_score;
  let scoreColor = "text-emerald-600";
  let scoreBg = "bg-emerald-50 border-emerald-200";
  if (score < 55) { scoreColor = "text-rose-600"; scoreBg = "bg-rose-50 border-rose-200"; }
  else if (score < 70) { scoreColor = "text-rose-500"; scoreBg = "bg-rose-50/70 border-rose-200"; }
  else if (score < 85) { scoreColor = "text-amber-600"; scoreBg = "bg-amber-50 border-amber-200"; }

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/institutions"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {institution.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
              <span>Code: <strong>{institution.code}</strong></span>
              <span>•</span>
              <span>{institution.institution_type}</span>
              <span>•</span>
              <span>{institution.district}, {institution.state}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <RiskBadge riskLevel={institution.monitoring_risk_level} />
        </div>
      </div>

      {/* Official Allegation Disclaimer */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-900 uppercase tracking-wide">
            Ethical Governance Disclaimer:
          </strong>{" "}
          A complaint is an administrative allegation under verification, not legal proof of wrongdoing. The AICTE Case Monitor score is an explainable monitoring heuristic for scheduling quality reviews; institutions are never labeled guilty solely based on complaint counts or AI suggestions.
        </div>
      </div>

      {/* Row: Scorecard & Overview Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scorecard Gauge & Factor Breakdown (2 Cols) */}
        <div className="lg:col-span-2 aicte-card p-6 bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Explainable Monitoring Scorecard
              </h3>
              <p className="text-xs text-slate-500">
                Transparent constituent penalty breakdown starting from 100.0 baseline
              </p>
            </div>

            <div className={`p-3 rounded-xl border text-center ${scoreBg}`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Composite Index</div>
              <div className={`text-2xl font-black ${scoreColor}`}>
                {score} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-4">
            {institution.score_breakdown && institution.score_breakdown.map((item: any, idx: number) => {
              const penaltyPct = Math.min(100, (item.penalty_applied / 25) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({item.weight} weight)</span>
                    </span>
                    <span className="font-semibold text-rose-600">
                      -{item.penalty_applied} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${penaltyPct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institution Metadata Card (1 Col) */}
        <div className="aicte-card p-6 bg-white space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              Institutional Baseline Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Accreditation Grade:</span>
                <span className="font-bold text-blue-900 text-sm">{institution.accreditation_grade}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Approved Student Intake:</span>
                <span className="font-semibold text-slate-800">{institution.approved_intake} Students / Annum</span>
              </div>
              <div>
                <span className="text-slate-500 block">NIRF India Ranking:</span>
                <span className="font-semibold text-slate-800">
                  {institution.nirf_rank ? `Rank #${institution.nirf_rank}` : "Not in Top 100"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Campus Address:</span>
                <span className="text-slate-700">{institution.address}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Official Contact:</span>
                <span className="text-slate-700">{institution.contact_email}</span>
                <div className="text-slate-500">{institution.contact_phone}</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href={`/complaints?state=${encodeURIComponent(institution.state)}`}
              className="w-full block text-center py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
            >
              Filter State Queue &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Section: Related Complaints, Inspections, Legal Cases, Approvals */}
      <div className="aicte-card bg-white overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("complaints")}
            className={`py-3 px-5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "complaints"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Complaints ({complaints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inspections")}
            className={`py-3 px-5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "inspections"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Inspection Audits ({institution.inspections?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("legal")}
            className={`py-3 px-5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "legal"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Legal Court Cases ({institution.legal_cases?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`py-3 px-5 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === "approvals"
                ? "border-blue-900 text-blue-900 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Approval History ({institution.approvals?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content 1: Complaints Table */}
        {activeTab === "complaints" && (
          <div className="p-4">
            {complaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active complaints registered for this institution.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Reference ID</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">SLA Status</th>
                      <th className="py-2.5 px-3">Submission Date</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-blue-900">
                          <Link href={`/complaints/${c.id}`} className="hover:underline">
                            {c.reference_id}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3">{c.category}</td>
                        <td className="py-2.5 px-3">
                          <SeverityBadge severity={c.severity} />
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-2.5 px-3">
                          <SLABadge isOverdue={c.is_overdue} daysRemaining={c.days_remaining} />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(c.submission_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/complaints/${c.id}`} className="font-bold text-blue-900 hover:underline">
                            View &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Inspections */}
        {activeTab === "inspections" && (
          <div className="p-4 space-y-3">
            {(!institution.inspections || institution.inspections.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No past field inspection audits recorded.
              </div>
            ) : (
              institution.inspections.map((insp: any) => (
                <div key={insp.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{insp.inspection_type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      insp.status === "COMPLIANT" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {insp.status}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Date: <strong>{new Date(insp.inspection_date).toLocaleDateString()}</strong> • Committee Lead: {insp.committee_lead}
                  </div>
                  <p className="text-slate-800">{insp.findings_summary}</p>
                  {insp.deficiency_items && (
                    <div className="text-rose-700 font-medium">
                      Deficiencies: {insp.deficiency_items}
                    </div>
                  )}
                  {insp.recommendations && (
                    <div className="text-blue-900">
                      Committee Recommendations: {insp.recommendations}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content 3: Legal Cases */}
        {activeTab === "legal" && (
          <div className="p-4 space-y-3">
            {(!institution.legal_cases || institution.legal_cases.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No ongoing legal proceedings or High Court petitions recorded.
              </div>
            ) : (
              institution.legal_cases.map((lc: any) => (
                <div key={lc.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{lc.case_number} — {lc.court_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                      {lc.status}
                    </span>
                  </div>
                  <p className="text-slate-800">{lc.summary}</p>
                  <div className="text-slate-500 text-[11px]">
                    Filing Date: {new Date(lc.filing_date).toLocaleDateString()}
                    {lc.next_hearing_date && ` • Next Hearing: ${new Date(lc.next_hearing_date).toLocaleDateString()}`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content 4: Approvals */}
        {activeTab === "approvals" && (
          <div className="p-4">
            {(!institution.approvals || institution.approvals.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No approval records available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Academic Session</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Courses Sanctioned</th>
                      <th className="py-2.5 px-3">Total Intake</th>
                      <th className="py-2.5 px-3">Deficiencies</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {institution.approvals.map((appr: any) => (
                      <tr key={appr.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{appr.academic_year}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                            {appr.approval_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{appr.approved_courses_count} Programs</td>
                        <td className="py-2.5 px-3 font-semibold">{appr.total_sanctioned_intake}</td>
                        <td className="py-2.5 px-3">{appr.deficiency_count}</td>
                        <td className="py-2.5 px-3 text-slate-500">{appr.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstitutionDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading institution details...</div>}>
      <InstitutionDetailPageContent />
    </React.Suspense>
  );
}
