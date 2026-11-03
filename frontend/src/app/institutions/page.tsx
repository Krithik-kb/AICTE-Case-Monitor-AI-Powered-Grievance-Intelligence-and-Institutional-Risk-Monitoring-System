"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Landmark, Search, Filter, ShieldAlert, Award, 
  MapPin, ChevronRight, ChevronLeft, AlertCircle, Building2, RotateCcw
} from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";
import { RiskBadge } from "@/components/Badges";
import { INDIA_STATES_META } from "@/data/indiaMapData";

function InstitutionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialState = searchParams.get("state") || "";

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || (u.role !== "ADMIN" && u.role !== "BUREAU_OFFICER" && u.role !== "VIEWER")) {
      router.replace("/login");
    }
  }, [router]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState(initialState);
  const [riskLevel, setRiskLevel] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        skip: page * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (state) params.state = state;
      if (riskLevel) params.risk_level = riskLevel;
      if (institutionType) params.institution_type = institutionType;

      const res = await api.getInstitutions(params);
      setInstitutions(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = searchParams.get("state");
    if (s !== null) {
      setState(s);
      setPage(0);
    }
  }, [searchParams]);

  useEffect(() => {
    loadInstitutions();
  }, [page, pageSize, state, riskLevel, institutionType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadInstitutions();
  };

  const handleReset = () => {
    setSearch("");
    setState("");
    setRiskLevel("");
    setInstitutionType("");
    setPage(0);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/institutions");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Landmark className="w-6 h-6 text-blue-900" />
            <span>Regulated Institutions & Monitoring Index</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent institutional directory, inspection audits, and algorithmic risk telemetry across India
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          Total Registered: <strong className="text-blue-900">{total} Institutions</strong>
        </div>
      </div>

      {/* Official Allegation Disclaimer Card */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-3 text-xs text-blue-950">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold uppercase tracking-wider text-blue-900">
            Regulatory Allegation Principle:
          </strong>{" "}
          A complaint represents a lodged grievance under administrative verification, not proven wrongdoing or regulatory guilt. The Explainable Monitoring Score assists AICTE bureaus in prioritizing quality inspection visits and inquiry hearings without prejudice.
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="aicte-card p-4 bg-white space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by institution name, city, or AICTE permanent code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setPage(0); }}
            className="p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All States ({total})</option>
            {Object.keys(INDIA_STATES_META).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value); setPage(0); }}
            className="p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All Risk Tiers</option>
            <option value="LOW">Low Risk (&gt;85 score)</option>
            <option value="MODERATE">Moderate Risk (70-84)</option>
            <option value="HIGH">High Risk (55-69)</option>
            <option value="CRITICAL">Critical Risk (&lt;55)</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value={12}>Show 12 per page</option>
            <option value={24}>Show 24 per page</option>
            <option value={48}>Show All (48 per page)</option>
          </select>

          <button
            onClick={handleReset}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Active Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span>
          Showing <strong>{institutions.length > 0 ? page * pageSize + 1 : 0}</strong> to{" "}
          <strong>{Math.min((page + 1) * pageSize, total)}</strong> of <strong>{total}</strong> institutions
          {state && <span> in <strong className="text-blue-900">{state}</strong></span>}
        </span>
        {state && (
          <button
            onClick={() => setState("")}
            className="text-xs text-blue-900 hover:underline font-semibold"
          >
            Clear State Filter &times;
          </button>
        )}
      </div>

      {/* Grid of Institutions */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>Loading institutions registry...</div>
        </div>
      ) : institutions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 space-y-2 bg-white aicte-card">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-sm text-slate-700">No Institutions Match Criteria</h4>
          <p className="text-xs text-slate-500">Adjust the state or risk tier filter, or click Reset.</p>
          <button
            onClick={handleReset}
            className="mt-2 px-3 py-1.5 bg-blue-900 text-white rounded text-xs font-semibold"
          >
            Show All Institutions
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {institutions.map((inst) => {
            const score = inst.monitoring_score;
            let scoreColor = "text-emerald-600";
            if (score < 55) scoreColor = "text-rose-600";
            else if (score < 70) scoreColor = "text-rose-500";
            else if (score < 85) scoreColor = "text-amber-600";

            return (
              <div
                key={inst.id}
                className="aicte-card p-5 bg-white flex flex-col justify-between hover:border-blue-400 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold font-mono uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      ID: {inst.code}
                    </span>
                    <RiskBadge riskLevel={inst.monitoring_risk_level} />
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-1" title={inst.name}>
                    {inst.name}
                  </h3>

                  <div className="text-xs text-slate-500 flex items-center space-x-1 mb-3">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{inst.district}, {inst.state}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Institution Type:</span>
                      <span className="font-medium text-slate-800">{inst.institution_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Accreditation:</span>
                      <span className="font-semibold text-blue-900">{inst.accreditation_grade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approved Intake:</span>
                      <span className="font-semibold text-slate-800">{inst.approved_intake}</span>
                    </div>
                  </div>

                  {/* Complaint Metric Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="p-2 bg-slate-100/60 rounded">
                      <div className="text-[10px] text-slate-500">Total</div>
                      <div className="font-extrabold text-slate-900">{inst.total_complaints}</div>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <div className="text-[10px] text-amber-700">Active</div>
                      <div className="font-extrabold text-amber-700">{inst.open_complaints}</div>
                    </div>
                    <div className="p-2 bg-rose-50 rounded">
                      <div className="text-[10px] text-rose-700">Overdue</div>
                      <div className="font-extrabold text-rose-700">{inst.overdue_complaints}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Monitoring Score</div>
                    <div className={`text-xl font-black ${scoreColor}`}>
                      {score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>
                  </div>

                  <Link
                    href={`/institutions/${inst.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-blue-900 hover:text-blue-700 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <span>Full Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="aicte-card p-3 bg-white border border-slate-200 flex items-center justify-between text-xs">
        <div className="text-slate-500">
          Page <strong>{page + 1}</strong> of <strong>{Math.max(1, totalPages)}</strong>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading institutions directory...</div>}>
      <InstitutionsPageContent />
    </Suspense>
  );
}
