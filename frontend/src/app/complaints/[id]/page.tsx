"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, User, Clock, AlertTriangle, ShieldCheck, 
  Send, Forward, AlertOctagon, FileCheck, CheckCircle2, Copy, Check, Sparkles
} from "lucide-react";
import { api, getCurrentStoredUser, User as AuthUser } from "@/lib/api";
import { StatusBadge, SeverityBadge, SLABadge } from "@/components/Badges";

function ComplaintDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const complaintId = Number(params.id);

  const [complaint, setComplaint] = useState<any>(null);
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Officer action states
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [targetBureauId, setTargetBureauId] = useState<number>(1);
  const [forwardComment, setForwardComment] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const c = await api.getComplaintDetail(complaintId);
      setComplaint(c);
      setNewStatus(c.status);
      const bList = await api.getBureaus();
      setBureaus(bList);
      if (bList.length > 0) setTargetBureauId(bList[0].id);
    } catch (e: any) {
      setError(e.message || "Failed to load complaint");
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
    setCurrentUser(u);
    if (complaintId) loadData();
  }, [complaintId, router]);

  const handleCopyRef = () => {
    if (!complaint) return;
    navigator.clipboard.writeText(complaint.reference_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusComment) {
      alert("Please enter an official action comment explaining the status update.");
      return;
    }
    setSubmitting(true);
    try {
      await api.updateComplaintStatus(complaintId, newStatus, statusComment, isPublic);
      setActionSuccess("Case status successfully updated and recorded in audit log.");
      setStatusComment("");
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardComment) {
      alert("Please provide the reason for reassigning to another bureau.");
      return;
    }
    setSubmitting(true);
    try {
      await api.forwardComplaint(complaintId, targetBureauId, forwardComment);
      setActionSuccess("Case successfully reassigned and forwarded to bureau.");
      setForwardComment("");
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Forwarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!confirm("Are you sure you want to escalate this complaint to Urgent Priority?")) return;
    setSubmitting(true);
    try {
      await api.escalateComplaint(complaintId, "Formal officer escalation triggered due to regulatory sensitivity or SLA warning.");
      setActionSuccess("Complaint has been escalated to URGENT priority level.");
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Escalation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-2">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>Loading complaint dossier...</div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="aicte-card p-8 bg-rose-50 text-center">
        <AlertOctagon className="w-10 h-10 text-rose-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-rose-900">Record Not Found</h3>
        <p className="text-xs text-rose-700 mt-1">{error || "The requested complaint does not exist."}</p>
        <Link href="/complaints" className="mt-4 inline-block text-xs font-semibold text-blue-900 underline">
          &larr; Return to Complaints Desk
        </Link>
      </div>
    );
  }

  const isOfficerOrAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "BUREAU_OFFICER";

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/complaints"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {complaint.reference_id}
              </h1>
              <button
                onClick={handleCopyRef}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                title="Copy Reference ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Lodged on {new Date(complaint.submission_date).toLocaleString()} • {complaint.state}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <SeverityBadge severity={complaint.severity} />
          <SLABadge isOverdue={complaint.is_overdue} daysRemaining={complaint.days_remaining} />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Case Dossier & Action Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Dossier, Allegations & AI Intelligence */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Case Summary Banner (Restricted to Authorized Officers) */}
          {isOfficerOrAdmin && complaint.ai_summary && (
            <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  AI Heuristic Case Synthesis
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                  Advisory
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {complaint.ai_summary}
              </p>
            </div>
          )}

          {/* Institution Reference Card */}
          <div className="aicte-card p-5 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Regulated Institution
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {complaint.institution_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {complaint.district}, {complaint.state} • Code: {complaint.institution?.code || "AICTE-REG"}
                  </p>
                </div>
              </div>
              <Link
                href={`/institutions/${complaint.institution_id}`}
                className="text-xs font-bold text-blue-900 hover:underline bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                Inspect Institution Scorecard &rarr;
              </Link>
            </div>
          </div>

          {/* Full Allegation Description */}
          <div className="aicte-card p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Grievance Particulars & Filed Statement</span>
              <span className="text-xs font-medium text-slate-500">
                Category: <strong>{complaint.category}</strong>
              </span>
            </h3>
            <div className="p-4 bg-slate-50 rounded-lg text-slate-800 text-xs leading-relaxed font-sans border border-slate-200 whitespace-pre-wrap">
              {complaint.description}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div>
                <strong>Complainant:</strong>{" "}
                {complaint.is_anonymous ? (
                  <span className="italic text-slate-400">Anonymous / Confidential</span>
                ) : (
                  <span>{complaint.complainant_name} ({complaint.district})</span>
                )}
              </div>
              <div>
                <strong>Assigned Bureau:</strong> {complaint.assigned_bureau_name || "Approval Bureau"}
              </div>
            </div>
          </div>

          {/* AI Intelligence & Classifier Card (Strictly Restricted to Authorized Officers) */}
          {isOfficerOrAdmin && (
            <div className="aicte-card p-5 bg-white space-y-4 border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Algorithmic Classification & Pattern Detection</span>
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
                  TF-IDF + Scikit-Learn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Suggested Category</div>
                  <div className="font-bold text-slate-900 mt-1">{complaint.ai_category_suggested || complaint.category}</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    Confidence: {Math.round((complaint.ai_category_confidence || 0.92) * 100)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Recommended Bureau</div>
                  <div className="font-bold text-blue-900 mt-1">{complaint.ai_bureau_suggested || "Approval Bureau"}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Automated jurisdictional mapping</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Priority Suggestion</div>
                  <div className="font-bold text-rose-600 mt-1">{complaint.ai_priority_suggested || complaint.priority}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Keyword & deadline weighted</div>
                </div>
              </div>

              {/* Duplicate Detection Alert */}
              {complaint.ai_is_duplicate && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Cosine Similarity Warning:</strong> Potential repeat/duplicate grievance identified with {Math.round((complaint.ai_duplicate_score || 0.78) * 100)}% semantic overlap.
                    {complaint.ai_duplicate_reference_id && (
                      <div className="mt-1">
                        Related record: <span className="font-bold underline">{complaint.ai_duplicate_reference_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic">
                Notice: AI outputs are provided as advisory suggestions to assist authorized human officers. Administrative determinations and official sanctions require human oversight.
              </p>
            </div>
          )}

          {/* Action History Timeline */}
          <div className="aicte-card p-5 bg-white space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Chronological Case Actions Timeline
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.actions && complaint.actions.map((act: any) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-900 ring-4 ring-white" />
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {act.action_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{act.comment}</p>
                    <div className="text-[10px] text-slate-400">
                      Recorded by: {act.user_name || "AICTE Automated System"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Officer Action Console & SLA Details */}
        <div className="space-y-6">
          {/* APAAR Student Identity & Trust Verification Card */}
          <div className="aicte-card p-5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Student Identity Verification</span>
              </h3>
              {complaint.is_apaar_verified ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  APAAR VERIFIED
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  NON-APAAR
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Complainant:</span>
                <span className="font-semibold text-slate-900">
                  {complaint.is_anonymous ? "Confidential / Anonymous" : complaint.complainant_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">APAAR ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {complaint.apaar_id || "Not Provided"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registry Source:</span>
                <span className="text-slate-800 font-medium">
                  {complaint.is_apaar_verified ? "NAD / DigiLocker Central Gateway" : "Self-Reported"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Trust Credential:</span>
                <span className={`font-bold ${complaint.is_apaar_verified ? "text-emerald-700" : "text-amber-700"}`}>
                  {complaint.is_apaar_verified ? "Tier-1 Authenticated Student" : "Tier-3 Unverified Allegation"}
                </span>
              </div>
            </div>

            {complaint.is_apaar_verified ? (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Spoofing Validated:</strong> Student identity confirmed via Ministry of Education APAAR Registry. Low likelihood of fake or malicious revenge filing.
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                <strong>Notice:</strong> This complaint was filed without APAAR integration. Bureau officers should verify student enrollment before issuing punitive notices.
              </div>
            )}
          </div>

          {/* SLA Tracking Snapshot */}
          <div className="aicte-card p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-900" />
              <span>SLA Target Deadlines</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Submission Date:</span>
                <span className="font-medium text-slate-800">
                  {new Date(complaint.submission_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Statutory Deadline:</span>
                <span className="font-medium text-slate-800">
                  {new Date(complaint.sla_deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Severity Protocol:</span>
                <span className="font-semibold text-slate-800">
                  {complaint.severity === "HIGH" ? "3 Days (High Priority)" : complaint.severity === "MEDIUM" ? "7 Days" : "15 Days"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                <SLABadge isOverdue={complaint.is_overdue} daysRemaining={complaint.days_remaining} />
              </div>
            </div>

            {/* Quick Escalate Button */}
            {isOfficerOrAdmin && complaint.status !== "RESOLVED" && (
              <button
                onClick={handleEscalate}
                disabled={submitting}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Escalate to Urgent Priority</span>
              </button>
            )}
          </div>

          {/* Officer Action Console (Authorized) */}
          {isOfficerOrAdmin ? (
            <div className="aicte-card p-5 bg-white space-y-4 border-t-4 border-t-blue-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                  <span>Authorized Action Console</span>
                </h3>
                <span className="text-[10px] text-blue-800 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                  {currentUser?.role}
                </span>
              </div>

              {/* Form 1: Update Status */}
              <form onSubmit={handleStatusUpdate} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Progress Case Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="INVESTIGATION">INVESTIGATION</option>
                    <option value="ACTION_TAKEN">ACTION TAKEN</option>
                    <option value="RESOLVED">RESOLVED (Close Case)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Official Action Note
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official inquiry note, committee directive, or closure rationale..."
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 text-slate-800"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublicCheck"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded text-blue-900 focus:ring-blue-900 w-3.5 h-3.5"
                  />
                  <label htmlFor="isPublicCheck" className="text-[11px] text-slate-600">
                    Visible on Public Reference ID Tracking
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Update Case Status</span>
                </button>
              </form>

              {/* Form 2: Forward to Another Bureau */}
              <div className="pt-4 border-t border-slate-100">
                <form onSubmit={handleForward} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Forward / Reassign to Bureau
                    </label>
                    <select
                      value={targetBureauId}
                      onChange={(e) => setTargetBureauId(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-900"
                    >
                      {bureaus.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Reason for reassignment..."
                      value={forwardComment}
                      onChange={(e) => setForwardComment(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Forward className="w-3.5 h-3.5" />
                    <span>Reassign Jurisdictional Bureau</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="aicte-card p-5 bg-slate-50 border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Read-Only Viewer Mode</span>
              </div>
              <p>
                You are currently viewing this complaint under <strong>VIEWER</strong> permissions. Administrative action dispatch and status updates require Bureau Officer or Administrator credentials.
              </p>
              <Link href="/login" className="text-blue-900 font-bold underline block mt-2">
                Switch to Admin or Bureau Officer Account &rarr;
              </Link>
            </div>
          )}

          {/* Supporting Documents Card */}
          <div className="aicte-card p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-blue-900" />
              <span>Evidence & Uploaded Documents</span>
            </h3>
            {complaint.documents && complaint.documents.length > 0 ? (
              <div className="space-y-2">
                {complaint.documents.map((d: any) => (
                  <div key={d.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{d.original_name}</div>
                      <div className="text-[10px] text-slate-400">{d.file_size_kb} KB • {d.file_type}</div>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                      SECURED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs text-center border border-slate-100">
                No external document attachments submitted with this record.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading case details...</div>}>
      <ComplaintDetailPageContent />
    </React.Suspense>
  );
}
