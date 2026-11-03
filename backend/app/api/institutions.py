from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.models import Institution, Complaint, InspectionRecord, LegalCase, ApprovalHistory, User
from app.schemas.schemas import InstitutionResponse, InstitutionDetailResponse, ScoreComponentBreakdown
from app.api.deps import get_current_user

router = APIRouter(prefix="/institutions", tags=["Institutions & Monitoring Score"])

def compute_explainable_score(inst: Institution, complaints: List[Complaint], inspections: List[InspectionRecord], legal_cases: List[LegalCase]) -> tuple:
    """
    Computes a transparent, explainable monitoring score out of 100 with clear constituent breakdown.
    Disclaimer: Complaint counts reflect reported allegations under verification, not final verdicts.
    """
    now = datetime.now(timezone.utc)
    base_score = 100.0
    
    total = len(complaints)
    open_cases = [c for c in complaints if c.status not in ["RESOLVED", "REJECTED"]]
    overdue_cases = [
        c for c in open_cases 
        if (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
    ]
    repeat_cases = [c for c in complaints if c.is_repeat_complaint]

    # Component 1: Open Complaint Volume (Max 20 deduction)
    open_penalty = min(20.0, len(open_cases) * 1.5)
    
    # Component 2: Overdue SLA Cases (Max 25 deduction)
    overdue_penalty = min(25.0, len(overdue_cases) * 4.0)

    # Component 3: Repeat Complaints Frequency (Max 20 deduction)
    repeat_penalty = min(20.0, len(repeat_cases) * 3.0)

    # Component 4: Inspection Findings (Max 20 deduction)
    inspection_penalty = 0.0
    for insp in inspections:
        if insp.status == "NON_COMPLIANT":
            inspection_penalty += 15.0
        elif insp.status == "DEFICIENCIES_NOTED":
            inspection_penalty += 7.0
    inspection_penalty = min(20.0, inspection_penalty)

    # Component 5: Active Litigation / Legal disputes (Max 15 deduction)
    legal_penalty = 0.0
    pending_legal = [lc for lc in legal_cases if lc.status == "PENDING"]
    legal_penalty = min(15.0, len(pending_legal) * 5.0)

    final_score = max(10.0, base_score - (open_penalty + overdue_penalty + repeat_penalty + inspection_penalty + legal_penalty))
    final_score = round(final_score, 1)

    if final_score >= 85:
        risk_level = "LOW"
    elif final_score >= 70:
        risk_level = "MODERATE"
    elif final_score >= 55:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    breakdown = [
        ScoreComponentBreakdown(
            name="Open Complaints Volume",
            weight="20%",
            penalty_applied=round(open_penalty, 1),
            description=f"{len(open_cases)} active allegations currently under administrative inquiry."
        ),
        ScoreComponentBreakdown(
            name="SLA Overdue Escalations",
            weight="25%",
            penalty_applied=round(overdue_penalty, 1),
            description=f"{len(overdue_cases)} unresolved matters exceeding regulatory response deadline."
        ),
        ScoreComponentBreakdown(
            name="Repeat Grievance Recurrence",
            weight="20%",
            penalty_applied=round(repeat_penalty, 1),
            description=f"{len(repeat_cases)} repeat or recurring allegations lodged regarding similar issues."
        ),
        ScoreComponentBreakdown(
            name="Regulatory Inspection Compliance",
            weight="20%",
            penalty_applied=round(inspection_penalty, 1),
            description=f"Field audit reports: {len([i for i in inspections if i.status != 'COMPLIANT'])} past committee deficiency notations."
        ),
        ScoreComponentBreakdown(
            name="Pending Litigation / Legal Disputes",
            weight="15%",
            penalty_applied=round(legal_penalty, 1),
            description=f"{len(pending_legal)} ongoing court writ petitions or regulatory stays in High Court/tribunals."
        )
    ]

    return final_score, risk_level, breakdown

@router.get("", response_model=dict)
def list_institutions(
    search: Optional[str] = None,
    state: Optional[str] = None,
    risk_level: Optional[str] = None,
    institution_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Institution)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search_fmt),
                Institution.code.ilike(search_fmt),
                Institution.district.ilike(search_fmt)
            )
        )
    if state:
        query = query.filter(Institution.state == state)
    if risk_level:
        query = query.filter(Institution.monitoring_risk_level == risk_level.upper())
    if institution_type:
        query = query.filter(Institution.institution_type == institution_type)

    total_count = query.count()
    institutions = query.offset(skip).limit(limit).all()

    now = datetime.now(timezone.utc)
    results = []
    for inst in institutions:
        c_list = inst.complaints
        tot_c = len(c_list)
        open_c = sum(1 for c in c_list if c.status not in ["RESOLVED", "REJECTED"])
        res_c = sum(1 for c in c_list if c.status == "RESOLVED")
        ovd_c = sum(
            1 for c in c_list 
            if c.status not in ["RESOLVED", "REJECTED"] and (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
        )

        results.append({
            "id": inst.id,
            "code": inst.code,
            "name": inst.name,
            "state": inst.state,
            "district": inst.district,
            "institution_type": inst.institution_type,
            "approved_intake": inst.approved_intake,
            "nirf_rank": inst.nirf_rank,
            "accreditation_grade": inst.accreditation_grade,
            "address": inst.address,
            "contact_email": inst.contact_email,
            "contact_phone": inst.contact_phone,
            "monitoring_score": inst.monitoring_score,
            "monitoring_risk_level": inst.monitoring_risk_level,
            "total_complaints": tot_c,
            "open_complaints": open_c,
            "resolved_complaints": res_c,
            "overdue_complaints": ovd_c
        })

    return {
        "items": results,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/{institution_id}", response_model=InstitutionDetailResponse)
def get_institution_detail(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    complaints = inst.complaints
    inspections = inst.inspections
    legal_cases = inst.legal_cases
    approvals = inst.approvals

    # Compute live explainable score & breakdown
    score, risk, breakdown = compute_explainable_score(inst, complaints, inspections, legal_cases)
    
    # Optionally update cached values on inst
    inst.monitoring_score = score
    inst.monitoring_risk_level = risk
    db.commit()

    now = datetime.now(timezone.utc)
    tot_c = len(complaints)
    open_c = sum(1 for c in complaints if c.status not in ["RESOLVED", "REJECTED"])
    res_c = sum(1 for c in complaints if c.status == "RESOLVED")
    ovd_c = sum(
        1 for c in complaints 
        if c.status not in ["RESOLVED", "REJECTED"] and (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
    )

    return {
        "id": inst.id,
        "code": inst.code,
        "name": inst.name,
        "state": inst.state,
        "district": inst.district,
        "institution_type": inst.institution_type,
        "approved_intake": inst.approved_intake,
        "nirf_rank": inst.nirf_rank,
        "accreditation_grade": inst.accreditation_grade,
        "address": inst.address,
        "contact_email": inst.contact_email,
        "contact_phone": inst.contact_phone,
        "monitoring_score": score,
        "monitoring_risk_level": risk,
        "total_complaints": tot_c,
        "open_complaints": open_c,
        "resolved_complaints": res_c,
        "overdue_complaints": ovd_c,
        "inspections": inspections,
        "legal_cases": legal_cases,
        "approvals": approvals,
        "score_breakdown": breakdown
    }
