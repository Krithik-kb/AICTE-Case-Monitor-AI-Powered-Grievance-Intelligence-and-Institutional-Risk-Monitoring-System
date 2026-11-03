"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { api, getCurrentStoredUser } from "@/lib/api";

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (e: any) {
      setError(e.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getCurrentStoredUser();
    if (!u || u.role !== "ADMIN") {
      router.replace("/public");
      return;
    }
    loadLogs();
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-blue-900" />
            <span>Administrative Security & Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of official actions, role logins, case status changes, and data exports
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      <div className="aicte-card bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading system audit logs...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-700 bg-rose-50">
            {error}. Administrator privileges required.
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No audit records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Official User</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Entity ID / Ref</th>
                  <th className="py-2.5 px-3">Details / Audit Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {log.user_email || "System Service"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {log.entity_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {log.entity_id || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[280px] truncate" title={log.details}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
