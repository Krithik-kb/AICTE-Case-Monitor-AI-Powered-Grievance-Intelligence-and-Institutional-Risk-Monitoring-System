import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    BUREAU_OFFICER = "BUREAU_OFFICER"
    VIEWER = "VIEWER"

class ComplaintSeverity(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INVESTIGATION = "INVESTIGATION"
    ACTION_TAKEN = "ACTION_TAKEN"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class ActionType(str, enum.Enum):
    SUBMISSION = "SUBMISSION"
    STATUS_CHANGE = "STATUS_CHANGE"
    ASSIGNMENT = "ASSIGNMENT"
    NOTE_ADDED = "NOTE_ADDED"
    FORWARDED = "FORWARDED"
    ESCALATED = "ESCALATED"
    RESOLUTION = "RESOLUTION"
    AI_ANALYSIS = "AI_ANALYSIS"

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    state = Column(String(100), index=True, nullable=False)
    district = Column(String(100), index=True, nullable=False)
    institution_type = Column(String(100), nullable=False)
    approved_intake = Column(Integer, default=0)
    nirf_rank = Column(Integer, nullable=True)
    accreditation_grade = Column(String(50), default="NAAC A")
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    monitoring_score = Column(Float, default=85.0)  # Calculated 0-100
    monitoring_risk_level = Column(String(20), default="LOW")  # LOW, MODERATE, HIGH, CRITICAL
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    complaints = relationship("Complaint", back_populates="institution", cascade="all, delete-orphan")
    inspections = relationship("InspectionRecord", back_populates="institution", cascade="all, delete-orphan")
    legal_cases = relationship("LegalCase", back_populates="institution", cascade="all, delete-orphan")
    approvals = relationship("ApprovalHistory", back_populates="institution", cascade="all, delete-orphan")

class Bureau(Base):
    __tablename__ = "bureaus"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    lead_officer_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    users = relationship("User", back_populates="bureau")
    complaints = relationship("Complaint", back_populates="assigned_bureau")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="VIEWER", nullable=False)  # ADMIN, BUREAU_OFFICER, VIEWER
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    designation = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    bureau = relationship("Bureau", back_populates="users")
    actions = relationship("CaseAction", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), index=True, nullable=False)
    complainant_name = Column(String(255), nullable=True)
    complainant_email = Column(String(255), nullable=True)
    complainant_phone = Column(String(50), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    apaar_id = Column(String(50), nullable=True, index=True)
    is_apaar_verified = Column(Boolean, default=False, index=True)
    state = Column(String(100), index=True, nullable=False)
    district = Column(String(100), index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    severity = Column(String(20), default="MEDIUM", index=True, nullable=False)
    priority = Column(String(20), default="NORMAL", index=True, nullable=False)
    assigned_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    status = Column(String(50), default="SUBMITTED", index=True, nullable=False)
    submission_date = Column(DateTime, default=utc_now, index=True)
    sla_deadline = Column(DateTime, index=True, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    description = Column(Text, nullable=False)
    is_repeat_complaint = Column(Boolean, default=False)
    repeat_count = Column(Integer, default=0)

    # AI/ML Assisted metadata
    ai_category_suggested = Column(String(100), nullable=True)
    ai_category_confidence = Column(Float, nullable=True)
    ai_bureau_suggested = Column(String(100), nullable=True)
    ai_priority_suggested = Column(String(50), nullable=True)
    ai_is_duplicate = Column(Boolean, default=False)
    ai_duplicate_reference_id = Column(String(50), nullable=True)
    ai_duplicate_score = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", back_populates="complaints")
    assigned_bureau = relationship("Bureau", back_populates="complaints")
    actions = relationship("CaseAction", back_populates="complaint", cascade="all, delete-orphan", order_by="CaseAction.created_at.desc()")
    documents = relationship("Document", back_populates="complaint", cascade="all, delete-orphan")

class CaseAction(Base):
    __tablename__ = "case_actions"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(50), nullable=False)  # ActionType enum value
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comment = Column(Text, nullable=False)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    complaint = relationship("Complaint", back_populates="actions")
    user = relationship("User", back_populates="actions")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(50), nullable=False)
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)

    user = relationship("User", back_populates="audit_logs")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_kb = Column(Integer, default=0)
    file_type = Column(String(50), default="application/pdf")
    is_public = Column(Boolean, default=False)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    complaint = relationship("Complaint", back_populates="documents")

class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), index=True, nullable=False)
    inspection_type = Column(String(100), nullable=False)
    inspection_date = Column(DateTime, nullable=False)
    committee_lead = Column(String(255), nullable=True)
    findings_summary = Column(Text, nullable=False)
    status = Column(String(50), default="COMPLIANT")  # COMPLIANT, DEFICIENCIES_NOTED, NON_COMPLIANT
    deficiency_items = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    institution = relationship("Institution", back_populates="inspections")

class LegalCase(Base):
    __tablename__ = "legal_cases"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), index=True, nullable=False)
    case_number = Column(String(100), nullable=False)
    court_name = Column(String(255), nullable=False)
    case_type = Column(String(100), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, DISPOSED, STAY_GRANTED
    summary = Column(Text, nullable=False)
    filing_date = Column(DateTime, nullable=False)
    next_hearing_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    institution = relationship("Institution", back_populates="legal_cases")

class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), index=True, nullable=False)
    academic_year = Column(String(50), nullable=False)
    approval_status = Column(String(50), default="APPROVED")  # APPROVED, EXTENSION_GRANTED, WITHDRAWN, REDUCED_INTAKE
    approved_courses_count = Column(Integer, default=5)
    total_sanctioned_intake = Column(Integer, default=300)
    deficiency_count = Column(Integer, default=0)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    institution = relationship("Institution", back_populates="approvals")
