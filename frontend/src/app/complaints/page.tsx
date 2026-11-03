"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  FileText, Search, Download, Filter, RotateCcw, 
  ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown, Clock,
  ShieldCheck, CheckCircle2, X
} from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";
import { StatusBadge, SeverityBadge, SLABadge, ApaarBadge } from "@/components/Badges";
import { INDIA_STATES_META } from "@/data/indiaMapData";

const CATEGORIES = [
  "Fees & Refund",
  "Infrastructure & Facilities",
  "Faculty & Staff Irregularities",
  "Approvals & Misrepresentation",
  "Harassment & Ragging",
  "Academics & Examination",
  "Other"
];

const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INVESTIGATION",
  "ACTION_TAKEN",
  "RESOLVED",
  "REJECTED"
];

function ComplaintsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialSeverity = searchParams.get("severity") || "";
  const initialStatus = searchParams.get("status") || "";
  const initialState = searchParams.get("state") || "";

  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 15;

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || (u.role !== "ADMIN" && u.role !== "BUREAU_OFFICER" && u.role !== "VIEWER")) {
      router.replace("/login");
    }
  }, [router]);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [severity, setSeverity] = useState(initialSeverity);
  const [status, setStatus] = useState(initialStatus);
  const [state, setState] = useState(initialState);
  const [isOverdue, setIsOverdue] = useState<string>("");
  const [apaarVerified, setApaarVerified] = useState<string>("");
  const [sortBy, setSortBy] = useState("submission_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // APAAR Modal
  const [showApaarModal, setShowApaarModal] = useState(false);
  const [apaarRegistryData, setApaarRegistryData] = useState<any>(null);
  const [loadingApaarRegistry, setLoadingApaarRegistry] = useState(false);

  // Keep reference counter to avoid out-of-order race conditions
  const requestIdRef = useRef(0);

  // Sync state if URL search parameters change via client navigation
  useEffect(() => {
    const s = searchParams.get("state");
    const c = searchParams.get("category");
    const sev = searchParams.get("severity");
    const stat = searchParams.get("status");
    if (s !== null) setState(s);
    if (c !== null) setCategory(c);
    if (sev !== null) setSeverity(sev);
    if (stat !== null) setStatus(stat);
    setPage(0);
  }, [searchParams]);

  const loadComplaints = async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        skip: page * limit,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (search) params.search = search;
      if (category) params.category = category;
      if (severity) params.severity = severity;
      if (status) params.status = status;
      if (state) params.state = state;
      if (isOverdue === "true") params.is_overdue = true;
      if (isOverdue === "false") params.is_overdue = false;
      if (apaarVerified) params.apaar_verified = apaarVerified;

      const res = await api.getComplaints(params);
      if (reqId === requestIdRef.current) {
        setComplaints(res.items);
        setTotal(res.total);
      }
    } catch (e) {
      if (reqId === requestIdRef.current) {
        console.error(e);
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [page, category, severity, status, state, isOverdue, apaarVerified, sortBy, sortOrder]);

  const handleOpenApaarRegistry = async () => {
    setShowApaarModal(true);
    setLoadingApaarRegistry(true);
    try {
      const data = await api.getApaarRegistry();
      setApaarRegistryData(data);
    } catch (e: any) {
      console.error("Failed to load APAAR registry", e);
    } finally {
      setLoadingApaarRegistry(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadComplaints();
  };

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setSeverity("");
    setStatus("");
    setState("");
    setIsOverdue("");
    setApaarVerified("");
    setPage(0);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/complaints");
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.downloadExportCsv(category, status);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aicte_complaints_${state || "export"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to export CSV: " + (e.message || "Unauthorized"));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Title & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-900" />
            <span>Complaints Central Desk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, examine case timelines, and dispatch official administrative actions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenApaarRegistry}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-200" />
            <span>APAAR Registry Gateway</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="aicte-card p-4 bg-white space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Reference ID, Institution Name, APAAR ID, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 text-xs">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All Severities</option>
            <option value="HIGH">HIGH Severity</option>
            <option value="MEDIUM">MEDIUM Severity</option>
            <option value="LOW">LOW Severity</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          {/* State */}
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All States</option>
            {Object.keys(INDIA_STATES_META).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Overdue Filter */}
          <select
            value={isOverdue}
            onChange={(e) => { setIsOverdue(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-blue-900"
          >
            <option value="">All SLA Deadlines</option>
            <option value="true">Overdue Cases Only</option>
            <option value="false">On Track Only</option>
          </select>

          {/* APAAR Identity Filter */}
          <select
            value={apaarVerified}
            onChange={(e) => { setApaarVerified(e.target.value); setPage(0); }}
            className="p-2 rounded-lg border border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold focus:ring-1 focus:ring-emerald-700"
          >
            <option value="">All Identities</option>
            <option value="true">✓ APAAR Verified Only</option>
            <option value="false">Unverified / Non-APAAR</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={handleReset}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="aicte-card bg-white overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong>{complaints.length > 0 ? page * limit + 1 : 0}</strong> to{" "}
            <strong>{Math.min((page + 1) * limit, total)}</strong> of <strong>{total}</strong> complaints
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-1 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="submission_date">Submission Date</option>
              <option value="sla_deadline">SLA Deadline</option>
              <option value="severity">Severity</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 font-bold"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>Querying complaints database...</div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-700">No Complaints Match Filters</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try clearing specific category, status, or search terms to broaden results.
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Reference ID</th>
                  <th className="py-3 px-3">Student Identity (APAAR)</th>
                  <th className="py-3 px-3">Institution & Location</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Assigned Bureau</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">SLA Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-blue-900 whitespace-nowrap">
                      <Link href={`/complaints/${c.id}`} className="hover:underline flex items-center space-x-1">
                        <span>{c.reference_id}</span>
                      </Link>
                      {c.is_repeat_complaint && (
                        <span className="block text-[9px] font-bold text-rose-600">
                          REPEAT #{c.repeat_count}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <ApaarBadge 
                        isVerified={c.is_apaar_verified} 
                        apaarId={c.apaar_id} 
                        isAnonymous={c.is_anonymous} 
                      />
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <div className="font-semibold text-slate-900 truncate" title={c.institution_name}>
                        {c.institution_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.district}, {c.state}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {c.category}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <SeverityBadge severity={c.severity} />
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {c.assigned_bureau_name || "Unassigned"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <SLABadge isOverdue={c.is_overdue} daysRemaining={c.days_remaining} />
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Due: {new Date(c.sla_deadline).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Link
                        href={`/complaints/${c.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold text-xs"
                      >
                        <span>View</span>
                        <span>&rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Page <strong>{page + 1}</strong> of <strong>{Math.max(1, totalPages)}</strong>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* APAAR Registry Gateway Modal */}
      {showApaarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-linear-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-lg font-black tracking-tight">
                    AICTE APAAR Student Registry Integration
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    GATEWAY ONLINE
                  </span>
                </div>
                <p className="text-xs text-indigo-200">
                  National Academic Depository (NAD) & DigiLocker Gateway • One Nation, One Student ID (Ministry of Education & AICTE)
                </p>
              </div>
              <button
                onClick={() => setShowApaarModal(false)}
                className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gateway Information Banner */}
            <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-950 gap-3">
              <div>
                <span className="font-bold text-emerald-900">Post-Development AICTE Integration:</span> Real-time verification prevents spoofed IDs, bot submissions, and malicious revenge campaigns by validating student enrollment against DigiLocker.
              </div>
              <div className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md shrink-0">
                {apaarRegistryData?.total_verified || 0} Authenticated Records
              </div>
            </div>

            {/* Modal Content / Table */}
            <div className="p-5 overflow-y-auto flex-1 text-xs">
              {loadingApaarRegistry ? (
                <div className="py-16 text-center space-y-2 text-slate-500">
                  <div className="w-8 h-8 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>Querying National Academic Depository gateway...</div>
                </div>
              ) : !apaarRegistryData || apaarRegistryData.items.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No verified APAAR records found in this view.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Reference ID</th>
                        <th className="py-2.5 px-3">Verified APAAR ID</th>
                        <th className="py-2.5 px-3">Enrolled Institution</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Gateway Auth Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {apaarRegistryData.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-blue-900 font-mono">
                            {item.reference_id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.apaar_id}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.institution_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>DigiLocker Enrolled</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/complaints?search=${encodeURIComponent(item.reference_id)}`}
                              onClick={() => setShowApaarModal(false)}
                              className="text-xs text-blue-900 font-bold hover:underline"
                            >
                              Inspect Dossier &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">
                Complies with AICTE Academic Verifiability Norms & National Education Policy (NEP 2020).
              </span>
              <button
                onClick={() => setShowApaarModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-lg text-xs"
              >
                Close Gateway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComplaintsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading complaints desk...</div>}>
      <ComplaintsPageContent />
    </React.Suspense>
  );
}
