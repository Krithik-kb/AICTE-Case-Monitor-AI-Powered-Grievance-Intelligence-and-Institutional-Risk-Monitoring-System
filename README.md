# AICTE Case Monitor — Smart India Hackathon (SIH 2026)

**AI-Powered Centralized Grievance Intelligence, Bureau Escalation & Institutional Monitoring System**

---

> **Notice Regarding Synthetic Data:**
> All institution profiles, grievance allegations, complaint narratives, and metrics in this platform are **synthetic demonstration data** generated exclusively for Smart India Hackathon algorithmic testing, pattern recognition, and interface demonstration. They do not represent actual AICTE regulatory proceedings.

---

## 1. Overview & Architecture

**AICTE Case Monitor** centralizes complaint tracking, detects recurring institution issues, enforces timezone-aware SLA deadlines across administrative bureaus and cells, and generates an explainable institutional monitoring scorecard to assist AICTE leadership in making proactive, data-informed regulatory decisions.

### Technology Stack
- **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS, Lucide Icons, Recharts, React Leaflet (with locally bundled Indian boundary GeoJSON), Framer Motion.
- **Backend**: Python 3.14 + FastAPI, Pydantic, SQLAlchemy, PyJWT, Bcrypt password hashing.
- **Database**: SQLite (local zero-dependency fallback) / Supabase PostgreSQL via `DATABASE_URL`.
- **AI/ML Core**: scikit-learn (`TfidfVectorizer`, `LogisticRegression`), Cosine Similarity duplicate checking, rule-based safety overrides, and heuristic extractive summarization.

---

## 2. Seeded Demo Accounts (Role-Based Permissions)

| Role | Name & Title | Demo Email | Demo Password | Scope & Backend Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dr. Arvind Kumar (Central Admin) | `admin@aicte.gov.in` | `AdminPassword@2026` | Full platform control, audit trail inspection, bureau reassignments, system-wide SLA escalation. |
| **Bureau Officer** | Smt. Ritu Sharma (Approval Bureau Officer) | `officer.ab@aicte.gov.in` | `OfficerPassword@2026` | Bureau jurisdiction cases, status progression, case action notes, and inter-bureau forwarding. |
| **Viewer** | Shri Rajesh Verma (Ombudsman / Auditor) | `viewer@aicte.gov.in` | `ViewerPassword@2026` | Read-only access to executive dashboard, heatmaps, and institutional scorecards. |

*Quick Switcher*: On the login screen (`/login`) or navbar profile menu, click any demo account badge to switch profiles without manual typing.

---

## 3. Database Design & Synthetic Seed Data

The platform features 10 relational tables:
1. `Institution`: 40 fictional technical universities and colleges across Indian states.
2. `Bureau`: 8 configurable AICTE bureaus & cells (Approval Bureau, Policy Bureau, Faculty Development Cell, Finance Bureau, Administration Bureau, Grievance Cell, Regulation Bureau, e-Governance Cell).
3. `Complaint`: 340+ complaints covering 7 categories, 3 severity tiers, repeat recurrence flags, and SLA deadlines.
4. `CaseAction`: Chronological audit of every status transition, bureau assignment, officer note, and escalation.
5. `User`: Role-based authorized personnel with bcrypt-hashed credentials.
6. `AuditLog`: Immutable audit trail of system events, logins, updates, and CSV exports.
7. `Document`: Supporting evidence metadata.
8. `InspectionRecord`: Committee inspection audit reports and deficiency notices.
9. `LegalCase`: High Court and appellate writ petition records.
10. `ApprovalHistory`: Annual Extension of Approval (EOA) and sanctioned intake histories.

### Running the Seed Script
```bash
# From workspace root:
$env:PYTHONPATH="backend"
.\venv\Scripts\python.exe backend\seed_data.py
```

---

## 4. Key Capabilities & Features

### A. Executive Dashboard (`/`)
- Real-time KPIs: Total Complaints (340+), Active Inquiries, Resolved Closures, Overdue SLA Cases, and Average Resolution Time.
- **Status Donut Chart**: Live proportion of Submitted, Under Review, Investigation, Action Taken, and Resolved cases.
- **Intake vs. Resolution Trajectory**: Monthly trend area chart.
- **Bureau Workload Bars**: Comparative active versus resolved cases across the 8 bureaus.
- **Interactive India Map**: React Leaflet choropleth visualization displaying state-wise grievance density using locally bundled GeoJSON. Includes state click telemetry and a 100% reliable tabular fallback view.
- **Priority Escalation Queue**: Top urgent and overdue cases requiring immediate official intervention.

### B. Complaints Management (`/complaints`)
- Multi-dimensional search across Reference IDs, Institution names, and keywords.
- Filters by Category, Severity, Status, State, Bureau, and Overdue SLA threshold.
- Direct CSV export (`/api/complaints/export/csv`) with automated audit trail logging.
- Comprehensive Dossier (`/complaints/[id]`):
  - Allegation statement
  - AI heuristic case synthesis
  - Institution scorecard reference
  - Chronological action timeline
  - Authorized officer console: Progress case status, add official comments, forward between bureaus, or escalate to Urgent.

### C. Institution Profiles & Explainable Monitoring Score (`/institutions/[id]`)
- Explainable composite index (0–100) calculated from transparent factors:
  - Open complaint volume (-1.5 pts / open case, max 20)
  - SLA overdue cases (-4.0 pts / overdue case, max 25)
  - Repeat complaint recurrence (-3.0 pts / repeat grievance, max 20)
  - Field inspection findings (-7 to -15 pts for deficiencies, max 20)
  - Active High Court litigation (-5.0 pts / pending case, max 15)
- Clear ethical governance disclaimer: Complaints represent allegations under verification, not final verdicts of wrongdoing.

### D. SLA Tracking & Escalation Center (`/sla`)
- Timezone-aware deadline calculation: High (3 days), Medium (7 days), Low (15 days).
- Imminent breach countdown (<24 hours, <72 hours).
- Overdue queue with 1-click manual escalation action.
- Bureau compliance league table.

### E. AI Intelligence Cell & Sandbox (`/ai-insights`)
- TF-IDF + Logistic Regression classification across technical education categories.
- Cosine similarity duplicate detection against existing institution complaints.
- Bureau recommendation mapping and priority tagging.
- Interactive testing playground with 5 pre-filled real-world scenario presets.

### F. Citizen Grievance Portal (`/public`) & Milestone Tracker (`/track`)
- Public grievance submission with institution lookup, category selection, and confidential/anonymous filing option.
- Automatic generation of unique reference IDs (e.g., `AICTE-2026-XXXXX`).
- Privacy-preserving milestone tracker (`/track?ref=...`) displaying status milestones without exposing complainant identity or internal administrative deliberations.

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v24.19.0)

### 1. Clone & Virtual Environment Setup
```bash
git clone <repository_url>
cd sih

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Backend Setup
```bash
# Install backend dependencies
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# Run database seed (creates SQLite database with 340+ records)
$env:PYTHONPATH="backend"
.\venv\Scripts\python.exe backend\seed_data.py

# Start FastAPI backend server (runs on http://127.0.0.1:8000)
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Interactive API documentation will be available at: **http://127.0.0.1:8000/docs**

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install dependencies
npm.cmd install --legacy-peer-deps

# Start Next.js development server
npm.cmd run dev
```
Open your browser at: **http://localhost:3000**

---

## 6. Five-Minute Demonstration Walkthrough for Hackathon Judges

1. **Sign In (0:00 - 0:30)**:
   - Navigate to `http://localhost:3000/login`.
   - Click the **Central Administrator** card (`admin@aicte.gov.in`).
   - Observe the instant login and role badge in the top navigation bar.

2. **Executive Command Dashboard (0:30 - 1:30)**:
   - Point out the 5 KPI cards displaying live database calculations (Total 340, Active Inquiries, Overdue cases).
   - Scroll to the **Interactive India Map**: Hover over states (e.g., Maharashtra, Tamil Nadu, Delhi), observe the choropleth complaint density, and click a state to inspect its telemetry card.
   - Toggle the **State Fallback Table** to show guaranteed accessibility even in offline or canvas-limited environments.
   - Point out the Status Donut Chart and Monthly Trajectory graphs powered by live records.

3. **Complaints Desk & Case Dossier (1:30 - 2:30)**:
   - Click **Complaints Desk** (`/complaints`).
   - Filter by `Category: Fees & Refund` and `Severity: HIGH`.
   - Click **Export to CSV** to demonstrate instant structured data export with audit logging.
   - Click **View** on any complaint to open its full dossier.
   - Show the **AI Heuristic Case Synthesis**, **Institution Scorecard link**, and **Chronological Case Actions Timeline**.

4. **Official Action Dispatch (2:30 - 3:15)**:
   - Under the **Authorized Action Console**, change the case status to `INVESTIGATION`.
   - Add an official note: *"Inquiry committee convened; notice issued to college registrar."*
   - Click **Update Case Status**. Observe that the action immediately appends to the timeline and updates the audit log.

5. **Explainable Monitoring Score & Institutional Dossier (3:15 - 4:00)**:
   - Click **Institutions & Scores** (`/institutions`).
   - Select an institution with high risk (e.g., *Apex Institute* or *Vidyapeeth College*).
   - Review the **Explainable Monitoring Scorecard** breakdown showing exact point deductions for open complaints, SLA breaches, repeat grievances, field audits, and pending court cases.
   - Emphasize the **Ethical Governance Disclaimer**: AICTE never labels institutions guilty based solely on allegations or AI predictions.

6. **AI Intelligence Cell & Public Citizen Flow (4:00 - 5:00)**:
   - Navigate to **AI Intelligence Cell** (`/ai-insights`).
   - Click the preset *"Excess Capitation Fee & Deposit Refund"* and click **Run Real-time AI Analysis**. Show the 94% confidence classification, bureau recommendation, and cosine similarity duplicate check.
   - Switch to **Public Submission** (`/public`), submit a test complaint, and copy the generated reference ID (`AICTE-2026-XXXXX`).
   - Open **Track Reference ID** (`/track`), paste the ID, and demonstrate the sanitized citizen milestone progress view.

---

## 7. Acceptance Checklist Verification

- [x] **1. The application starts successfully**: FastAPI backend running on port 8000, Next.js on port 3000.
- [x] **2. Demo accounts can log in**: Admin, Bureau Officer, Viewer credentials hashed with bcrypt and verified with JWT tokens.
- [x] **3. Role-based permissions work**: Backend FastAPI dependencies (`require_admin`, `require_officer`, `require_viewer`) enforce authorization at endpoint level.
- [x] **4. Complaints are stored in database**: SQLite database seeded with 340+ records and receives new public submissions.
- [x] **5. Dashboard statistics update when records change**: Real SQL queries compute metrics, status distributions, and monthly trends dynamically.
- [x] **6. Complaint status updates appear in the timeline**: Every status change or forwarding action appends an immutable `CaseAction` record.
- [x] **7. The India map uses locally available geographic data**: React Leaflet loads bundled GeoJSON from `public/india-states.json` without external runtime dependencies.
- [x] **8. AI suggestions work with identified fallback**: TF-IDF + Logistic Regression model with keyword fallback, cosine similarity duplicate check, and heuristic summarizer.
- [x] **9. Overdue cases are calculated correctly**: Timezone-aware deadline comparison against High (3d), Medium (7d), and Low (15d) targets.
- [x] **10. Unauthorized users cannot access protected records**: Sensitive endpoints require JWT Bearer authentication; public tracking sanitizes confidential PII and internal officer notes.

---

## 8. Known Limitations & Production Enhancements

1. **Storage**: In local mode, file uploads are represented with database metadata and mock local disk storage. For production cloud deployment, configure Supabase Storage buckets via S3-compatible API keys.
2. **PostgreSQL Migration**: The system uses SQLAlchemy ORM and standard declarative models, allowing direct transition from SQLite to Supabase PostgreSQL simply by updating `DATABASE_URL` in `.env`.
3. **Background Daemon Scheduling**: Real-time SLA checks run on query evaluation. In a multi-server production deployment, a Celery worker or cron task can trigger automatic notification emails to bureau officers 24 hours prior to deadline breach.
