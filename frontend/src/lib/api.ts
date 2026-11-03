const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "ADMIN" | "BUREAU_OFFICER" | "VIEWER";
  bureau_id?: number | null;
  designation?: string | null;
  is_active: boolean;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aicte_auth_token");
}

export function setAuthToken(token: string, user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("aicte_auth_token", token);
  localStorage.setItem("aicte_user", JSON.stringify(user));
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("aicte_auth_token");
  localStorage.removeItem("aicte_user");
}

export function getCurrentStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("aicte_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/public") && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/track")) {
      window.location.href = "/login";
    }
  }

  return response;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid login credentials");
    }
    const data = await res.json();
    setAuthToken(data.access_token, data.user);
    return data;
  },

  async getMe() {
    const res = await fetchWithAuth("/auth/me");
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  async getDemoAccounts() {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return res.json();
  },

  // Dashboard
  async getDashboardSummary() {
    const res = await fetchWithAuth("/dashboard/summary");
    if (!res.ok) throw new Error("Failed to load dashboard statistics");
    return res.json();
  },

  // Complaints
  async getComplaints(params: Record<string, any> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        qs.append(k, String(v));
      }
    });
    const res = await fetchWithAuth(`/complaints?${qs.toString()}`);
    if (!res.ok) throw new Error("Failed to load complaints");
    return res.json();
  },

  async getComplaintDetail(id: number) {
    const res = await fetchWithAuth(`/complaints/${id}`);
    if (!res.ok) throw new Error("Complaint not found");
    return res.json();
  },

  async updateComplaintStatus(id: number, status: string, comment: string, is_public: boolean = true) {
    const res = await fetchWithAuth(`/complaints/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, comment, is_public }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update status");
    }
    return res.json();
  },

  async forwardComplaint(id: number, bureau_id: number, comment: string, priority?: string) {
    const res = await fetchWithAuth(`/complaints/${id}/forward`, {
      method: "POST",
      body: JSON.stringify({ bureau_id, comment, priority }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to forward case");
    }
    return res.json();
  },

  async escalateComplaint(id: number, reason?: string) {
    const res = await fetchWithAuth(`/complaints/${id}/escalate?reason=${encodeURIComponent(reason || "")}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to escalate case");
    return res.json();
  },

  async downloadExportCsv(category?: string, status?: string) {
    const qs = new URLSearchParams();
    if (category) qs.append("category", category);
    if (status) qs.append("status", status);
    const res = await fetchWithAuth(`/complaints/export/csv?${qs.toString()}`);
    if (!res.ok) throw new Error("Failed to export CSV");
    return res.blob();
  },

  getExportCsvUrl(category?: string, status?: string) {
    const qs = new URLSearchParams();
    if (category) qs.append("category", category);
    if (status) qs.append("status", status);
    return `${API_BASE}/complaints/export/csv?${qs.toString()}`;
  },

  // Institutions
  async getInstitutions(params: Record<string, any> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        qs.append(k, String(v));
      }
    });
    const res = await fetchWithAuth(`/institutions?${qs.toString()}`);
    if (!res.ok) throw new Error("Failed to load institutions");
    return res.json();
  },

  async getInstitutionDetail(id: number) {
    const res = await fetchWithAuth(`/institutions/${id}`);
    if (!res.ok) throw new Error("Institution not found");
    return res.json();
  },

  // Bureaus
  async getBureaus() {
    const res = await fetchWithAuth("/bureaus");
    if (!res.ok) throw new Error("Failed to load bureaus");
    return res.json();
  },

  // SLA
  async getSLAOverview() {
    const res = await fetchWithAuth("/sla/overview");
    if (!res.ok) throw new Error("Failed to load SLA statistics");
    return res.json();
  },

  // AI
  async analyzeText(description: string, institution_id?: number, severity?: string) {
    const res = await fetchWithAuth("/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ description, institution_id, severity }),
    });
    if (!res.ok) throw new Error("AI analysis failed");
    return res.json();
  },

  // Public
  async submitPublicComplaint(data: any) {
    const res = await fetch(`${API_BASE}/public/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Submission failed");
    }
    return res.json();
  },

  async trackPublicComplaint(reference_id: string) {
    const res = await fetch(`${API_BASE}/public/track/${encodeURIComponent(reference_id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Record not found");
    }
    return res.json();
  },

  async getPublicInstitutions(state?: string) {
    const qs = state ? `?state=${encodeURIComponent(state)}` : "";
    const res = await fetch(`${API_BASE}/public/institutions${qs}`);
    if (!res.ok) throw new Error("Failed to load institutions list");
    return res.json();
  },

  // APAAR Registry Gateway (One Nation One Student ID)
  async verifyApaarId(apaar_id: string) {
    const res = await fetch(`${API_BASE}/public/apaar/verify/${encodeURIComponent(apaar_id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "APAAR verification gateway unavailable");
    }
    return res.json();
  },

  async getApaarRegistry() {
    const res = await fetch(`${API_BASE}/public/apaar/registry`);
    if (!res.ok) throw new Error("Failed to load APAAR student registry");
    return res.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetchWithAuth("/audit-logs");
    if (!res.ok) throw new Error("Failed to load audit logs");
    return res.json();
  }
};

