from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
    bureau_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "VIEWER"
    bureau_id: Optional[int] = None
    designation: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    bureau_id: Optional[int] = None
    designation: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# --- Bureau Schemas ---
class BureauResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    lead_officer_name: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# --- Case Action Schemas ---
class CaseActionCreate(BaseModel):
    action_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: str
    is_public: bool = True

class CaseActionResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: Optional[int] = None
    action_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: str
    is_public: bool
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    complaint_id: int
    filename: str
    original_name: str
    file_size_kb: int
    file_type: str
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Inspection & Legal & Approval ---
class InspectionRecordResponse(BaseModel):
    id: int
    institution_id: int
    inspection_type: str
    inspection_date: datetime
    committee_lead: Optional[str] = None
    findings_summary: str
    status: str
    deficiency_items: Optional[str] = None
    recommendations: Optional[str] = None

    class Config:
        from_attributes = True

class LegalCaseResponse(BaseModel):
    id: int
    institution_id: int
    case_number: str
    court_name: str
    case_type: str
    status: str
    summary: str
    filing_date: datetime
    next_hearing_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApprovalHistoryResponse(BaseModel):
    id: int
    institution_id: int
    academic_year: str
    approval_status: str
    approved_courses_count: int
    total_sanctioned_intake: int
    deficiency_count: int
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

# --- Institution Schemas ---
class InstitutionBase(BaseModel):
    code: str
    name: str
    state: str
    district: str
    institution_type: str
    approved_intake: int = 0
    nirf_rank: Optional[int] = None
    accreditation_grade: str = "NAAC A"
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class InstitutionResponse(InstitutionBase):
    id: int
    monitoring_score: float
    monitoring_risk_level: str
    total_complaints: Optional[int] = 0
    open_complaints: Optional[int] = 0
    resolved_complaints: Optional[int] = 0
    overdue_complaints: Optional[int] = 0

    class Config:
        from_attributes = True

class ScoreComponentBreakdown(BaseModel):
    name: str
    weight: str
    penalty_applied: float
    description: str

class InstitutionDetailResponse(InstitutionResponse):
    inspections: List[InspectionRecordResponse] = []
    legal_cases: List[LegalCaseResponse] = []
    approvals: List[ApprovalHistoryResponse] = []
    score_breakdown: List[ScoreComponentBreakdown] = []

# --- Complaint Schemas ---
class ComplaintCreatePublic(BaseModel):
    institution_id: int
    complainant_name: Optional[str] = None
    complainant_email: Optional[EmailStr] = None
    complainant_phone: Optional[str] = None
    is_anonymous: bool = False
    apaar_id: Optional[str] = None
    state: str
    district: str
    category: str
    severity: str = "MEDIUM"
    description: str = Field(..., min_length=20)
    evidence_files: Optional[List[dict]] = []

class ComplaintStatusUpdate(BaseModel):
    status: str
    comment: str
    is_public: bool = True

class ComplaintForwardRequest(BaseModel):
    bureau_id: int
    comment: str
    priority: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    reference_id: str
    institution_id: int
    institution_name: Optional[str] = None
    complainant_name: Optional[str] = None
    is_anonymous: bool
    apaar_id: Optional[str] = None
    is_apaar_verified: bool = False
    state: str
    district: str
    category: str
    severity: str
    priority: str
    assigned_bureau_id: Optional[int] = None
    assigned_bureau_name: Optional[str] = None
    status: str
    submission_date: datetime
    sla_deadline: datetime
    resolved_at: Optional[datetime] = None
    description: str
    is_repeat_complaint: bool
    repeat_count: int
    
    # SLA Computed
    is_overdue: bool = False
    days_remaining: int = 0
    
    # AI highlights
    ai_category_suggested: Optional[str] = None
    ai_category_confidence: Optional[float] = None
    ai_bureau_suggested: Optional[str] = None
    ai_priority_suggested: Optional[str] = None
    ai_is_duplicate: bool = False
    ai_duplicate_reference_id: Optional[str] = None
    ai_duplicate_score: Optional[float] = None
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True

class ComplaintDetailResponse(ComplaintResponse):
    institution: Optional[InstitutionBase] = None
    assigned_bureau: Optional[BureauResponse] = None
    actions: List[CaseActionResponse] = []
    documents: List[DocumentResponse] = []

class PublicTrackingResponse(BaseModel):
    reference_id: str
    institution_name: str
    state: str
    category: str
    status: str
    submission_date: datetime
    sla_deadline: datetime
    is_apaar_verified: bool = False
    timeline: List[CaseActionResponse] = []
    notice: str = "This tracking record is authenticated by AICTE Case Monitor. Sensitive personal details are omitted to protect complainant privacy."

# --- Dashboard & Stats Schemas ---
class MetricOverview(BaseModel):
    total_complaints: int
    open_complaints: int
    resolved_complaints: int
    overdue_complaints: int
    average_resolution_days: float
    escalated_count: int

class DonutItem(BaseModel):
    name: str
    value: int
    color: str

class TrendItem(BaseModel):
    month: str
    received: int
    resolved: int
    overdue: int

class BureauStatItem(BaseModel):
    bureau_id: int
    code: str
    name: str
    total: int
    pending: int
    resolved: int
    overdue: int

class CategoryStatItem(BaseModel):
    category: str
    count: int
    percentage: float

class StateStatItem(BaseModel):
    state: str
    total: int
    open: int
    resolved: int
    overdue: int
    institutions_count: int

class DashboardResponse(BaseModel):
    metrics: MetricOverview
    status_distribution: List[DonutItem]
    monthly_trend: List[TrendItem]
    bureau_distribution: List[BureauStatItem]
    category_breakdown: List[CategoryStatItem]
    state_statistics: List[StateStatItem]
    priority_queue: List[ComplaintResponse]
    recent_activity: List[CaseActionResponse]

# --- AI Suggestion Schemas ---
class AICheckResponse(BaseModel):
    suggested_category: str
    category_confidence: float
    suggested_bureau: str
    suggested_bureau_id: Optional[int] = None
    suggested_priority: str
    is_duplicate: bool
    duplicate_reference_id: Optional[str] = None
    duplicate_score: Optional[float] = None
    generated_summary: str
    model_mode: str = "Trained ML (TF-IDF + LogisticRegression) with Rule-Based Safeguards"

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_name: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
