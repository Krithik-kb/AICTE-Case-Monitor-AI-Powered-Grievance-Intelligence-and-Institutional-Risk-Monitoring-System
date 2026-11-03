import io
import csv
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.core.database import get_db
from app.models.models import Complaint, Institution, Bureau, CaseAction, User, ComplaintStatus, ActionType
from app.schemas.schemas import (
    ComplaintResponse, ComplaintDetailResponse, ComplaintStatusUpdate, 
    ComplaintForwardRequest, CaseActionResponse, DocumentResponse
)
from app.api.deps import get_current_user, require_officer
from app.services.sla_service import evaluate_sla_status
from app.services.audit_service import record_audit, record_case_action

router = APIRouter(prefix="/complaints", tags=["Complaints Management"])

def serialize_complaint(c: Complaint) -> dict:
    is_ovd, days_rem, urgency = evaluate_sla_status(c.sla_deadline, c.status, c.resolved_at)
    return {
        "id": c.id,
        "reference_id": c.reference_id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.name if c.institution else "Unknown",
        "complainant_name": "Confidential" if c.is_anonymous else c.complainant_name,
        "is_anonymous": c.is_anonymous,
        "state": c.state,
        "district": c.district,
        "category": c.category,
        "severity": c.severity,
        "priority": c.priority,
        "assigned_bureau_id": c.assigned_bureau_id,
        "assigned_bureau_name": c.assigned_bureau.name if c.assigned_bureau else None,
        "status": c.status,
        "submission_date": c.submission_date,
        "sla_deadline": c.sla_deadline,
        "resolved_at": c.resolved_at,
        "description": c.description,
        "is_repeat_complaint": c.is_repeat_complaint,
        "repeat_count": c.repeat_count,
        "is_overdue": is_ovd,
        "days_remaining": days_rem,
        "ai_category_suggested": c.ai_category_suggested,
        "ai_category_confidence": c.ai_category_confidence,
        "ai_bureau_suggested": c.ai_bureau_suggested,
        "ai_priority_suggested": c.ai_priority_suggested,
        "ai_is_duplicate": c.ai_is_duplicate,
        "ai_duplicate_reference_id": c.ai_duplicate_reference_id,
        "ai_duplicate_score": c.ai_duplicate_score,
        "ai_summary": c.ai_summary,
        "apaar_id": c.apaar_id,
        "is_apaar_verified": bool(c.is_apaar_verified)
    }

@router.get("", response_model=dict)
def list_complaints(
    search: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    bureau_id: Optional[int] = None,
    state: Optional[str] = None,
    institution_id: Optional[int] = None,
    is_overdue: Optional[bool] = None,
    apaar_verified: Optional[str] = None,
    sort_by: str = "submission_date",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Complaint).join(Institution, Complaint.institution_id == Institution.id, isouter=True)

    # Role enforcement: Bureau officers by default view their assigned bureau unless explicitly filtering
    if current_user.role == "BUREAU_OFFICER" and current_user.bureau_id and not bureau_id:
        query = query.filter(Complaint.assigned_bureau_id == current_user.bureau_id)
    elif bureau_id:
        query = query.filter(Complaint.assigned_bureau_id == bureau_id)

    if category:
        query = query.filter(Complaint.category == category)
    if severity:
        query = query.filter(Complaint.severity == severity.upper())
    if status_filter:
        query = query.filter(Complaint.status == status_filter.upper())
    if state and state.strip():
        clean_state = state.strip()
        query = query.filter(
            or_(
                Complaint.state.ilike(clean_state),
                Institution.state.ilike(clean_state)
            )
        )
    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)

    now = datetime.now(timezone.utc)
    if is_overdue is True:
        query = query.filter(
            Complaint.status.notin_(["RESOLVED", "REJECTED"]),
            Complaint.sla_deadline < now
        )
    elif is_overdue is False:
        query = query.filter(
            or_(
                Complaint.status.in_(["RESOLVED", "REJECTED"]),
                Complaint.sla_deadline >= now
            )
        )

    if apaar_verified == "true":
        query = query.filter(Complaint.is_apaar_verified == True)
    elif apaar_verified == "false":
        query = query.filter(or_(Complaint.is_apaar_verified == False, Complaint.is_apaar_verified.is_(None)))

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Complaint.reference_id.ilike(search_fmt),
                Complaint.description.ilike(search_fmt),
                Institution.name.ilike(search_fmt),
                Complaint.state.ilike(search_fmt),
                Complaint.apaar_id.ilike(search_fmt)
            )
        )

    total_count = query.count()

    # Sorting
    sort_column = getattr(Complaint, sort_by, Complaint.submission_date)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    complaints = query.offset(skip).limit(limit).all()
    items = [serialize_complaint(c) for c in complaints]

    return {
        "items": items,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/export/csv")
def export_complaints_csv(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Complaint).join(Institution, Complaint.institution_id == Institution.id, isouter=True)
    if category:
        query = query.filter(Complaint.category == category)
    if status_filter:
        query = query.filter(Complaint.status == status_filter.upper())

    complaints = query.limit(500).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reference ID", "Institution", "State", "District", "Category", 
        "Severity", "Priority", "Status", "Submission Date", "SLA Deadline", 
        "Assigned Bureau", "Is Repeat", "APAAR ID", "APAAR Verified", "Description"
    ])

    for c in complaints:
        writer.writerow([
            c.reference_id,
            c.institution.name if c.institution else "N/A",
            c.state,
            c.district,
            c.category,
            c.severity,
            c.priority,
            c.status,
            c.submission_date.strftime("%Y-%m-%d %H:%M"),
            c.sla_deadline.strftime("%Y-%m-%d %H:%M"),
            c.assigned_bureau.name if c.assigned_bureau else "Unassigned",
            "Yes" if c.is_repeat_complaint else "No",
            c.apaar_id or "Not Provided",
            "VERIFIED" if c.is_apaar_verified else "UNVERIFIED",
            c.description.replace("\n", " ")[:200]
        ])

    record_audit(
        db=db,
        action="EXPORT_CSV",
        entity_name="Complaint",
        user_id=current_user.id,
        user_email=current_user.email,
        details={"exported_count": len(complaints)}
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aicte_complaints_export.csv"}
    )

@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_detail(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    serialized = serialize_complaint(c)
    
    # Institution details
    inst_data = None
    if c.institution:
        inst_data = {
            "code": c.institution.code,
            "name": c.institution.name,
            "state": c.institution.state,
            "district": c.institution.district,
            "institution_type": c.institution.institution_type,
            "approved_intake": c.institution.approved_intake,
            "nirf_rank": c.institution.nirf_rank,
            "accreditation_grade": c.institution.accreditation_grade,
            "address": c.institution.address,
            "contact_email": c.institution.contact_email,
            "contact_phone": c.institution.contact_phone
        }

    # Bureau details
    bureau_data = None
    if c.assigned_bureau:
        bureau_data = {
            "id": c.assigned_bureau.id,
            "code": c.assigned_bureau.code,
            "name": c.assigned_bureau.name,
            "description": c.assigned_bureau.description,
            "lead_officer_name": c.assigned_bureau.lead_officer_name,
            "contact_email": c.assigned_bureau.contact_email,
            "is_active": c.assigned_bureau.is_active
        }

    # Actions timeline
    actions_list = [
        {
            "id": a.id,
            "complaint_id": a.complaint_id,
            "user_id": a.user_id,
            "action_type": a.action_type,
            "old_status": a.old_status,
            "new_status": a.new_status,
            "comment": a.comment,
            "is_public": a.is_public,
            "created_at": a.created_at,
            "user_name": a.user.full_name if a.user else "AICTE Public System"
        }
        for a in c.actions
    ]

    # Documents
    documents_list = [
        {
            "id": d.id,
            "complaint_id": d.complaint_id,
            "filename": d.filename,
            "original_name": d.original_name,
            "file_size_kb": d.file_size_kb,
            "file_type": d.file_type,
            "is_public": d.is_public,
            "created_at": d.created_at
        }
        for d in c.documents
    ]

    serialized["institution"] = inst_data
    serialized["assigned_bureau"] = bureau_data
    serialized["actions"] = actions_list
    serialized["documents"] = documents_list

    return serialized

@router.put("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    req: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    old_status = c.status
    c.status = req.status.upper()
    
    if req.status.upper() == ComplaintStatus.RESOLVED.value:
        c.resolved_at = datetime.now(timezone.utc)
    elif old_status == ComplaintStatus.RESOLVED.value and req.status.upper() != ComplaintStatus.RESOLVED.value:
        c.resolved_at = None

    # Record Timeline Action
    record_case_action(
        db=db,
        complaint_id=c.id,
        user_id=current_user.id,
        action_type=ActionType.STATUS_CHANGE.value,
        old_status=old_status,
        new_status=c.status,
        comment=req.comment,
        is_public=req.is_public
    )

    # Record Audit Log
    record_audit(
        db=db,
        action="UPDATE_STATUS",
        entity_name="Complaint",
        entity_id=c.reference_id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"old_status": old_status, "new_status": c.status, "comment": req.comment}
    )

    db.commit()
    return {"message": "Status updated successfully", "complaint_id": c.id, "new_status": c.status}

@router.post("/{complaint_id}/forward")
def forward_complaint(
    complaint_id: int,
    req: ComplaintForwardRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    target_bureau = db.query(Bureau).filter(Bureau.id == req.bureau_id).first()
    if not target_bureau:
        raise HTTPException(status_code=404, detail="Target bureau not found")

    old_bureau_name = c.assigned_bureau.name if c.assigned_bureau else "Unassigned"
    c.assigned_bureau_id = target_bureau.id
    if req.priority:
        c.priority = req.priority.upper()

    comment_text = f"Case forwarded from {old_bureau_name} to {target_bureau.name}. Reason: {req.comment}"
    record_case_action(
        db=db,
        complaint_id=c.id,
        user_id=current_user.id,
        action_type=ActionType.FORWARDED.value,
        old_status=c.status,
        new_status=c.status,
        comment=comment_text,
        is_public=True
    )

    record_audit(
        db=db,
        action="FORWARD_CASE",
        entity_name="Complaint",
        entity_id=c.reference_id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"from_bureau": old_bureau_name, "to_bureau": target_bureau.name, "comment": req.comment}
    )

    db.commit()
    return {"message": f"Case successfully forwarded to {target_bureau.name}", "bureau_id": target_bureau.id}

@router.post("/{complaint_id}/escalate")
def escalate_complaint(
    complaint_id: int,
    reason: Optional[str] = "Overdue SLA deadline reached threshold or urgent safety concern reported.",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer)
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    c.priority = "URGENT"
    comment_text = f"Case formally escalated to Urgent Priority Level by {current_user.full_name}. Reason: {reason}"

    record_case_action(
        db=db,
        complaint_id=c.id,
        user_id=current_user.id,
        action_type=ActionType.ESCALATED.value,
        old_status=c.status,
        new_status=c.status,
        comment=comment_text,
        is_public=True
    )

    record_audit(
        db=db,
        action="ESCALATE_CASE",
        entity_name="Complaint",
        entity_id=c.reference_id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"reason": reason}
    )

    db.commit()
    return {"message": "Case escalated successfully", "priority": c.priority}
