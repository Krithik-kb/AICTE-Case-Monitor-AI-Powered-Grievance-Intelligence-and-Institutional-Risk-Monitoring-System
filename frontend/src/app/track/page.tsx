"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, ShieldCheck, CheckCircle2, Clock, 
  Building2, AlertOctagon, ArrowLeft, Lock, FileCheck, FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge, ApaarBadge } from "@/components/Badges";

function TrackPageContent() {
  const [refId, setRefId] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (searchId?: string) => {
    const id = searchId || refId;
    if (!id || id.trim().length < 5) {
      alert("Please enter a valid Reference ID (e.g. AICTE-2026-10001).");
      return;
    }
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const res = await api.trackPublicComplaint(id.trim());
      setRecord(res);
    } catch (e: any) {
      setError(e.message || "No record found matching this Reference ID.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get("ref");
      if (r) {
        setRefId(r);
        handleTrack(r);
      }
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Search className="w-6 h-6 text-blue-900" />
          <span>Public Complaint Milestones Tracker</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter your unique reference ID to verify current inquiry status and official action milestones
        </p>
      </div>

      {/* Lookup Bar */}
      <div className="aicte-card p-5 bg-white space-y-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleTrack(); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Enter Reference ID (e.g. AICTE-2026-10001)..."
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-hidden"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
          >
            {loading ? "Searching..." : "Track Status"}
          </button>
        </form>

        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Privacy Protected: Non-authenticated public queries only show authorized milestone timeline steps. Complainant identity is protected.
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="aicte-card p-6 bg-rose-50 border-rose-200 text-center space-y-2">
          <AlertOctagon className="w-8 h-8 text-rose-600 mx-auto" />
          <h4 className="font-bold text-sm text-rose-900">Record Not Located</h4>
          <p className="text-xs text-rose-700 max-w-sm mx-auto">{error}</p>
        </div>
      )}

      {/* Result Card */}
      {record && (
        <div className="aicte-card p-6 bg-white space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Authenticated Record</span>
              <h2 className="text-xl font-black text-blue-900 font-mono tracking-tight">
                {record.reference_id}
              </h2>
              <div className="text-xs text-slate-600 mt-0.5">
                {record.institution_name} • {record.state}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ApaarBadge isVerified={record.is_apaar_verified} apaarId={record.apaar_id} />
              <StatusBadge status={record.status} />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-800">{record.category}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Submission Date</span>
              <span className="font-medium text-slate-800">
                {new Date(record.submission_date).toLocaleDateString()}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">SLA Response Target</span>
              <span className="font-medium text-slate-800">
                {new Date(record.sla_deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Milestone Timeline */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Official Milestone Progress
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {record.timeline && record.timeline.map((act: any, idx: number) => (
                <div key={act.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {act.action_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{act.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting Evidence Documents */}
          {record.evidence_files && record.evidence_files.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Supporting Evidence Documents ({record.evidence_files.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {record.evidence_files.map((d: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{d.original_name}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono shrink-0">
                      {d.file_size_kb} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>{record.notice}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading tracking portal...</div>}>
      <TrackPageContent />
    </React.Suspense>
  );
}
