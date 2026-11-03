"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Send, Building2, CheckCircle2, ShieldCheck, 
  Copy, Check, AlertCircle, FileText, ArrowRight,
  UploadCloud, Paperclip, Trash2, FileCheck
} from "lucide-react";
import { api } from "@/lib/api";
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

export default function PublicSubmissionPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [institutionId, setInstitutionId] = useState<number | "">("");
  const [complainantName, setComplainantName] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [apaarId, setApaarId] = useState("");
  const [apaarVerification, setApaarVerification] = useState<any>(null);
  const [verifyingApaar, setVerifyingApaar] = useState(false);
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("Pune");
  const [category, setCategory] = useState("Fees & Refund");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<{ name: string; size_kb: number; type: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load institutions for dropdown via public endpoint
    api.getPublicInstitutions().then((res) => {
      setInstitutions(res.items || []);
      if (res.items && res.items.length > 0) setInstitutionId(res.items[0].id);
    }).catch(() => {});
  }, []);

  const handleVerifyApaar = async () => {
    if (!apaarId || apaarId.trim().length < 8) {
      alert("Please enter a valid 12-digit APAAR ID (e.g. 2026-9812-4501).");
      return;
    }
    setVerifyingApaar(true);
    try {
      const res = await api.verifyApaarId(apaarId);
      setApaarVerification(res);
      if (res.is_valid && res.apaar_id) {
        setApaarId(res.apaar_id);
      }
    } catch (e: any) {
      alert(e.message || "Failed to verify APAAR ID");
    } finally {
      setVerifyingApaar(false);
    }
  };

  const handleAddPresetEvidence = (name: string, size_kb: number, type: string) => {
    if (evidenceFiles.some((f) => f.name === name)) return;
    setEvidenceFiles((prev) => [...prev, { name, size_kb, type }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: { name: string; size_kb: number; type: string }[] = [];
    Array.from(files).forEach((f) => {
      newItems.push({
        name: f.name,
        size_kb: Math.max(1, Math.round(f.size / 1024)),
        type: f.type || "application/pdf"
      });
    });
    setEvidenceFiles((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) {
      alert("Please select an institution.");
      return;
    }
    if (description.length < 20) {
      alert("Please describe the grievance in at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        institution_id: Number(institutionId),
        complainant_name: isAnonymous ? undefined : complainantName,
        complainant_email: isAnonymous ? undefined : complainantEmail,
        complainant_phone: isAnonymous ? undefined : complainantPhone,
        is_anonymous: isAnonymous,
        apaar_id: apaarId ? apaarId.trim() : undefined,
        state,
        district,
        category,
        severity,
        description,
        evidence_files: evidenceFiles
      };
      const res = await api.submitPublicComplaint(payload);
      setSubmittedData(res);
    } catch (e: any) {
      alert(e.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (!submittedData) return;
    navigator.clipboard.writeText(submittedData.reference_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submittedData) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="aicte-card p-8 bg-white border-2 border-emerald-500 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-slate-900">
            Grievance Lodged Successfully!
          </h2>

          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your complaint has been formally registered in the AICTE Case Monitor database. It has been routed to the <strong>{submittedData.assigned_bureau}</strong> with an initial response SLA deadline of <strong>{new Date(submittedData.sla_deadline).toLocaleDateString()}</strong>.
          </p>

          {/* APAAR Verification Status Callout */}
          {submittedData.is_apaar_verified ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 max-w-md mx-auto flex items-center justify-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Authenticated Student Grievance:</strong> Linked with APAAR ID <code className="font-mono font-bold bg-emerald-100 px-1 py-0.5 rounded">{submittedData.apaar_id}</code> via National Academic Depository.
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 max-w-md mx-auto">
              Identity Status: <strong>Unverified / Non-APAAR Lodging</strong>. (Officer manual verification required).
            </div>
          )}

          {/* Evidence Documents Callout */}
          {submittedData.evidence_files && submittedData.evidence_files.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 max-w-md mx-auto text-left space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-indigo-900">
                <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Supporting Evidence Registered ({submittedData.evidence_files.length}):</span>
              </div>
              <div className="space-y-1">
                {submittedData.evidence_files.map((ef: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded border border-indigo-100">
                    <span className="font-medium text-slate-800 truncate mr-2">{ef.original_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{ef.file_size_kb} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference ID Callout */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Permanent Reference ID
            </div>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className="font-mono text-2xl font-black text-blue-900 tracking-wider">
                {submittedData.reference_id}
              </span>
              <button
                onClick={handleCopyRef}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-600"
                title="Copy Reference ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Please record this reference ID. You can track real-time verification and action milestones anytime on the public tracking portal.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href={`/track?ref=${encodeURIComponent(submittedData.reference_id)}`}
              className="py-2.5 px-6 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center space-x-2"
            >
              <span>Track Live Case Timeline</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => { setSubmittedData(null); setDescription(""); setEvidenceFiles([]); }}
              className="py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700"
            >
              Lodge Another Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Official & Evaluator Quick Access Banner */}
      <div className="p-4 bg-linear-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-lg border border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-400 text-slate-900 rounded-xl shadow-xs shrink-0 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>AICTE Official & Hackathon Evaluator Access</span>
            </div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              Looking for the Central Command Dashboard & 340+ Live Monitored Cases?
            </div>
          </div>
        </div>
        <Link
          href="/login"
          className="shrink-0 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg shadow-xs transition-transform hover:scale-105 flex items-center space-x-1.5"
        >
          <span>Sign In & View Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Send className="w-6 h-6 text-blue-900" />
          <span>Public Grievance Lodging Portal</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Citizen and student portal for registering technical institution concerns under AICTE Central Regulations
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="aicte-card p-6 bg-white space-y-5">
        {/* Institution Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Target Regulated Institution *
          </label>
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(Number(e.target.value))}
            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-900"
            required
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.district}, {inst.state}) — {inst.code}
              </option>
            ))}
          </select>
        </div>

        {/* State & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              State / Union Territory *
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
              required
            >
              {Object.keys(INDIA_STATES_META).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              District *
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Pune, Chennai, Lucknow"
              className="w-full p-2 text-xs rounded-lg border border-slate-300 text-slate-900"
              required
            />
          </div>
        </div>

        {/* Category & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Grievance Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Severity Level *
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
              required
            >
              <option value="HIGH">HIGH (Immediate safety, ragging, financial extortion)</option>
              <option value="MEDIUM">MEDIUM (Delay, unfulfilled facilities)</option>
              <option value="LOW">LOW (Administrative queries)</option>
            </select>
          </div>
        </div>

        {/* Anonymous Toggle */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800">Confidential / Anonymous Lodging</div>
            <div className="text-[11px] text-slate-500">
              Personal name and contact information will be hidden from the institution and public records.
            </div>
          </div>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
          />
        </div>

        {/* Complainant Details (if not anonymous) */}
        {!isAnonymous && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Student / Parent / Staff"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-300 text-slate-900 bg-white"
                required={!isAnonymous}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={complainantEmail}
                onChange={(e) => setComplainantEmail(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-300 text-slate-900 bg-white"
                required={!isAnonymous}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={complainantPhone}
                onChange={(e) => setComplainantPhone(e.target.value)}
                className="w-full p-2 text-xs rounded border border-slate-300 text-slate-900 bg-white"
              />
            </div>
          </div>
        )}

        {/* APAAR ID Authentication Box (One Nation One Student ID) */}
        <div className="p-4 bg-linear-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  APAAR ID (One Nation, One Student ID) — Verified Student Authentication
                </h4>
                <p className="text-[11px] text-slate-600">
                  AICTE gateway integration with National Academic Depository (NAD) & DigiLocker to prevent fake complaints.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              Govt. Registry
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter 12-Digit APAAR ID (e.g. 2026-9812-4501)"
                value={apaarId}
                onChange={(e) => {
                  setApaarId(e.target.value);
                  setApaarVerification(null);
                }}
                className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyApaar}
              disabled={verifyingApaar || !apaarId}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1"
            >
              {verifyingApaar ? (
                <span>Checking Registry...</span>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify with NAD</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setApaarId("2026-9812-4501");
                setApaarVerification({
                  is_valid: true,
                  apaar_id: "2026-9812-4501",
                  enrollment_status: "AUTHENTICATED_ACTIVE_STUDENT",
                  registry: "National Academic Depository (NAD) / Ministry of Education, Govt. of India"
                });
              }}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 shrink-0"
              title="Fill demo verified APAAR ID"
            >
              Demo ID
            </button>
          </div>

          {apaarVerification && apaarVerification.is_valid && (
            <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-[11px] text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <strong>Identity Confirmed:</strong> APAAR ID <strong>{apaarVerification.apaar_id}</strong> is authenticated as an Active Enrolled Student in the National Academic Registry. Tier-1 Priority assigned.
              </div>
            </div>
          )}

          {apaarVerification && !apaarVerification.is_valid && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apaarVerification.error || "Unable to verify APAAR ID against registry."}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Detailed Statement of Facts & Allegation *
          </label>
          <textarea
            rows={6}
            placeholder="Describe what occurred, dates, involved departments, fee amounts, or evidence specifics..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-900"
            required
          />
          <p className="text-[11px] text-slate-400 mt-1">Minimum 20 characters required.</p>
        </div>

        {/* Supporting Documents & Evidence Upload */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-indigo-700" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Supporting Evidence & Document Upload (Optional)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Attach fee receipts, official emails, circulars, marklists, or photo proof (PDF, JPG, PNG). Max 10MB/file.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              {evidenceFiles.length} file{evidenceFiles.length !== 1 ? "s" : ""} attached
            </span>
          </div>

          {/* Quick Demo Attachment Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] text-slate-500 font-medium">Quick Attach Presets:</span>
            <button
              type="button"
              onClick={() => handleAddPresetEvidence("Fee_Payment_Receipt_Proof.pdf", 340, "application/pdf")}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 flex items-center space-x-1"
            >
              <FileCheck className="w-3 h-3 text-emerald-600" />
              <span>+ Fee Receipt (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetEvidence("Representation_Letter_Copy.pdf", 215, "application/pdf")}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 flex items-center space-x-1"
            >
              <FileCheck className="w-3 h-3 text-blue-600" />
              <span>+ Representation (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddPresetEvidence("Campus_Deficiency_Evidence.jpg", 1450, "image/jpeg")}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 flex items-center space-x-1"
            >
              <FileCheck className="w-3 h-3 text-amber-600" />
              <span>+ Site Photo (JPG)</span>
            </button>
          </div>

          {/* Upload Input Box */}
          <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-900 rounded-lg p-3 text-center bg-white transition-colors cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
              <UploadCloud className="w-5 h-5 text-blue-900" />
              <span className="font-semibold text-blue-900 hover:underline">Click or drag files here</span>
              <span className="text-slate-400">to upload evidence from your device</span>
            </div>
          </div>

          {/* Attached Files List */}
          {evidenceFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {evidenceFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate mr-2">
                    <FileText className="w-4 h-4 text-blue-800 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      ({f.size_kb} KB • {f.type.split("/")[1] || "doc"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEvidence(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-6 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <span>Transmitting to AICTE Central Registry...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Grievance to AICTE</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
