"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BrainCircuit, Sparkles, Send, Copy, AlertTriangle, 
  CheckCircle2, Building2, ShieldAlert, Cpu
} from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";

const PRESET_PROMPTS = [
  {
    title: "Excess Capitation Fee & Deposit Refund",
    category: "Fees & Refund",
    severity: "HIGH",
    text: "College management is demanding an illegal building development capitation fee of 75,000 rupees in cash without official receipt and refusing to refund my 40,000 security deposit after withdrawal."
  },
  {
    title: "Hostel Ragging & Senior Intimidation",
    category: "Harassment & Ragging",
    severity: "HIGH",
    text: "Severe ragging incident in boys hostel block B by senior final year students. Physical altercation occurred and anti-ragging squad warden took no action despite written complaint."
  },
  {
    title: "Unapproved Intake & Fake NBA Accreditation",
    category: "Approvals & Misrepresentation",
    severity: "HIGH",
    text: "Institution admitted 150 students in B.Tech Artificial Intelligence against an approved AICTE intake quota of only 60. The college website also advertises false Tier-1 NBA accreditation."
  },
  {
    title: "Ghost Faculty & Withheld Pay Scales",
    category: "Faculty & Staff Irregularities",
    severity: "HIGH",
    text: "Assistant professors have not been paid AICTE 7th Central Pay Commission salaries for 6 consecutive months. Management employs ghost faculty who only show up on inspection days."
  },
  {
    title: "Broken Lab Equipment & Safety Violation",
    category: "Infrastructure & Facilities",
    severity: "MEDIUM",
    text: "Computer science laboratory has only 12 functional computers for 120 enrolled students, internet connection is down, and chemistry lab lacks required fire extinguishers."
  }
];

export default function AIInsightsPage() {
  const [description, setDescription] = useState(PRESET_PROMPTS[0].text);
  const [severity, setSeverity] = useState("HIGH");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || (u.role !== "ADMIN" && u.role !== "BUREAU_OFFICER")) {
      router.replace("/public");
      return;
    }
    setCurrentUser(u);
  }, [router]);

  const runAnalysis = async (textToAnalyze?: string, sev?: string) => {
    const text = textToAnalyze || description;
    const s = sev || severity;
    if (!text || text.length < 15) {
      alert("Please enter a grievance text of at least 15 characters.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzeText(text, undefined, s);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "AI Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectPreset = (p: typeof PRESET_PROMPTS[0]) => {
    setDescription(p.text);
    setSeverity(p.severity);
    runAnalysis(p.text, p.severity);
  };

  if (currentUser?.role === "VIEWER") {
    return (
      <div className="aicte-card p-8 bg-slate-50 border border-slate-200 text-center max-w-xl mx-auto space-y-4 my-12">
        <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Restricted Module — Authorized Personnel Only</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The <strong>AI Intelligence & Pattern Recognition Cell</strong> is reserved for Bureau Officers and Central Administrators for grievance triage and jurisdictional dispatch.
        </p>
        <Link href="/" className="inline-block px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <BrainCircuit className="w-6 h-6 text-blue-900" />
            <span>AI Intelligence & Algorithmic Sandbox</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test and evaluate machine learning categorization, cosine-similarity duplicate checks, and jurisdictional mapping
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>TF-IDF + Logistic Regression + Cosine Sim</span>
          </span>
        </div>
      </div>

      {/* Preset Quick Tests */}
      <div className="aicte-card p-4 bg-white space-y-2">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Operational Evaluation Presets (Click to Test Real-time Inference):
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSelectPreset(p)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 font-semibold transition-all text-left"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Input Form & Output Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form (Col 1) */}
        <div className="aicte-card p-5 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Grievance Particulars Input
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Complaint Statement / Narrative
            </label>
            <textarea
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste or type complaint text to analyze..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 font-sans text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Filed Severity Rating
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
            >
              <option value="HIGH">HIGH (Imminent impact / harassment / accreditation fraud)</option>
              <option value="MEDIUM">MEDIUM (Delay / infrastructure deficiency)</option>
              <option value="LOW">LOW (General inquiries)</option>
            </select>
          </div>

          <button
            onClick={() => runAnalysis()}
            disabled={analyzing}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-2"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Executing Algorithmic Model...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Run Real-time AI Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Output Dossier (Col 2) */}
        <div className="aicte-card p-5 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Model Predictions & Suggestions</span>
            {result && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Inference Complete
              </span>
            )}
          </h3>

          {!result ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Click "Run Real-time AI Analysis" or select a preset above.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Category & Confidence */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-blue-900 mb-1">
                  1. Suggested Complaint Category
                </div>
                <div className="text-base font-extrabold text-blue-950">
                  {result.suggested_category}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Model Confidence: {Math.round(result.category_confidence * 100)}%</span>
                </div>
              </div>

              {/* Bureau & Priority Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                    2. Recommended Bureau
                  </div>
                  <div className="font-bold text-slate-900">
                    {result.suggested_bureau}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Jurisdiction Code: {result.suggested_bureau_code}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                    3. Priority Classification
                  </div>
                  <div className="font-bold text-rose-600">
                    {result.suggested_priority}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Transparent rule & keyword weighted
                  </div>
                </div>
              </div>

              {/* Duplicate Detection */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  4. Semantic Duplicate Detection (Cosine Similarity)
                </div>
                {result.is_duplicate ? (
                  <div className="text-rose-700 font-semibold flex items-center space-x-1 mt-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Potential Duplicate Found! Similarity Score: {Math.round((result.duplicate_score || 0) * 100)}%
                    </span>
                  </div>
                ) : (
                  <div className="text-emerald-700 font-medium flex items-center space-x-1 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unique Complaint: No duplicate found above 60% similarity threshold.</span>
                  </div>
                )}
              </div>

              {/* Generated Heuristic Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  5. Generated Case Summary
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {result.generated_summary}
                </p>
              </div>

              {/* Ethical Disclaimer */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <strong>Responsible AI Guarantee:</strong> {result.notice}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
