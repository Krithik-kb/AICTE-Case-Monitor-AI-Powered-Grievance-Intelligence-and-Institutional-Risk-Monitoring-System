import React from "react";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, ShieldCheck, FileText } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-500"></span>
          Submitted
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
          Under Review
        </span>
      );
    case "INVESTIGATION":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-purple-500"></span>
          Investigation
        </span>
      );
    case "ACTION_TAKEN":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-cyan-500"></span>
          Action Taken
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Resolved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export function SeverityBadge({ severity }: { severity: string }) {
  const sev = (severity || "").toUpperCase();
  if (sev === "HIGH") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
        HIGH
      </span>
    );
  }
  if (sev === "MEDIUM") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        MEDIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      LOW
    </span>
  );
}

export function SLABadge({ isOverdue, daysRemaining }: { isOverdue: boolean; daysRemaining: number }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500 text-white shadow-xs animate-pulse">
        <Clock className="w-3 h-3 mr-1" />
        OVERDUE ({Math.abs(daysRemaining)}d)
      </span>
    );
  }
  if (daysRemaining <= 1) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white shadow-xs">
        <Clock className="w-3 h-3 mr-1" />
        &lt; 24h Left
      </span>
    );
  }
  if (daysRemaining <= 3) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3 mr-1" />
        {daysRemaining}d Left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
      {daysRemaining}d Left
    </span>
  );
}

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const r = (riskLevel || "").toUpperCase();
  switch (r) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
          <ShieldAlert className="w-3 h-3 mr-1" />
          CRITICAL RISK
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          HIGH RISK
        </span>
      );
    case "MODERATE":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
          MODERATE RISK
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          LOW RISK
        </span>
      );
  }
}

export function ApaarBadge({ 
  isVerified, 
  apaarId, 
  isAnonymous 
}: { 
  isVerified?: boolean; 
  apaarId?: string | null; 
  isAnonymous?: boolean;
}) {
  if (isVerified) {
    return (
      <span 
        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs" 
        title={`Verified via National Academic Depository (APAAR ID: ${apaarId || "Active"})`}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>APAAR Verified</span>
        {apaarId && <span className="font-mono text-[9px] opacity-80">({apaarId})</span>}
      </span>
    );
  }
  if (isAnonymous) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Anonymous
      </span>
    );
  }
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
      title="Unverified / Non-APAAR Student Identity"
    >
      Non-APAAR
    </span>
  );
}

export function EvidenceBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
      <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
      <span>{count} Attachment{count > 1 ? "s" : ""}</span>
    </span>
  );
}
