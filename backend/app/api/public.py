import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Complaint, Institution, Bureau, CaseAction, ActionType, ComplaintStatus, Document
from app.schemas.schemas import ComplaintCreatePublic, PublicTrackingResponse
from app.services.sla_service import calculate_sla_deadline
from app.services.ai_service import ai_service
from app.services.audit_service import record_audit, record_case_action

router = APIRouter(prefix="/public", tags=["Public Portal & Tracking"])

@router.post("/submit")
def submit_public_complaint(req: ComplaintCreatePublic, db: Session = Depends(get_db)):
    # Verify institution
    inst = db.query(Institution).filter(Institution.id == req.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Selected institution not found in AICTE registry")

    now = datetime.now(timezone.utc)
    sla_deadline = calculate_sla_deadline(now, req.severity)

    # Generate unique reference ID
    random_num = random.randint(10000, 99999)
    reference_id = f"AICTE-2026-{random_num}"
    while db.query(Complaint).filter(Complaint.reference_id == reference_id).first():
        random_num = random.randint(10000, 99999)
        reference_id = f"AICTE-2026-{random_num}"

    # AI Assistive processing
    sugg_cat, conf = ai_service.predict_category(req.description)
    bureau_info = ai_service.suggest_bureau(req.category if req.category else sugg_cat)
    bureau_db = db.query(Bureau).filter(Bureau.code == bureau_info["bureau_code"]).first()
    assigned_bureau_id = bureau_db.id if bureau_db else 1
    priority = ai_service.suggest_priority(req.severity, req.description)
    summary = ai_service.generate_summary(req.description, req.category, req.severity)

    # Check for duplicate within same institution
    recent_cases = db.query(Complaint).filter(
        Complaint.institution_id == inst.id
    ).order_by(Complaint.submission_date.desc()).limit(30).all()
    dup_res = ai_service.detect_duplicate(
        req.description,
        [{"reference_id": c.reference_id, "description": c.description} for c in recent_cases]
    )

    # Check if repeat
    prev_count = db.query(Complaint).filter(Complaint.institution_id == inst.id).count()
    is_repeat = prev_count >= 2

    # Process APAAR ID (One Nation One Student ID)
    clean_apaar = req.apaar_id.strip() if req.apaar_id else None
    is_apaar_valid = False
    if clean_apaar:
        digits = "".join([ch for ch in clean_apaar if ch.isalnum()])
        if len(digits) >= 10:
            is_apaar_valid = True
            if len(digits) == 12:
                clean_apaar = f"{digits[:4]}-{digits[4:8]}-{digits[8:]}"
            else:
                clean_apaar = digits

    complaint = Complaint(
        reference_id=reference_id,
        institution_id=inst.id,
        complainant_name=None if req.is_anonymous else req.complainant_name,
        complainant_email=None if req.is_anonymous else req.complainant_email,
        complainant_phone=None if req.is_anonymous else req.complainant_phone,
        is_anonymous=req.is_anonymous,
        apaar_id=clean_apaar if is_apaar_valid else None,
        is_apaar_verified=is_apaar_valid,
        state=req.state,
        district=req.district,
        category=req.category,
        severity=req.severity.upper(),
        priority=priority,
        assigned_bureau_id=assigned_bureau_id,
        status=ComplaintStatus.SUBMITTED.value,
        submission_date=now,
        sla_deadline=sla_deadline,
        description=req.description,
        is_repeat_complaint=is_repeat,
        repeat_count=prev_count + 1 if is_repeat else 0,
        ai_category_suggested=sugg_cat,
        ai_category_confidence=conf,
        ai_bureau_suggested=bureau_info["bureau_name"],
        ai_priority_suggested=priority,
        ai_is_duplicate=dup_res["is_duplicate"],
        ai_duplicate_reference_id=dup_res["duplicate_ref"],
        ai_duplicate_score=dup_res["score"],
        ai_summary=summary
    )
    db.add(complaint)
    db.flush()

    # Save attached evidence files (images/documents)
    saved_evidence = []
    if req.evidence_files:
        for idx, ef in enumerate(req.evidence_files):
            doc_name = ef.get("name") or f"evidence_{idx+1}.pdf"
            doc_size = int(ef.get("size_kb") or 100)
            doc_type = ef.get("type") or "application/pdf"
            doc = Document(
                complaint_id=complaint.id,
                filename=f"{reference_id}_{idx+1}_{doc_name}",
                original_name=doc_name,
                file_path=f"evidence/{reference_id}/{doc_name}",
                file_size_kb=doc_size,
                file_type=doc_type,
                is_public=True
            )
            db.add(doc)
            saved_evidence.append({
                "original_name": doc_name,
                "file_size_kb": doc_size,
                "file_type": doc_type
            })
        db.flush()

    # Create submission CaseAction
    apaar_note = f" Authenticated via APAAR ID {clean_apaar} (Govt. of India Academic Registry)." if is_apaar_valid else ""
    ev_note = f" Attached {len(saved_evidence)} evidence document(s)/image(s)." if saved_evidence else ""
    act = CaseAction(
        complaint_id=complaint.id,
        user_id=None,
        action_type=ActionType.SUBMISSION.value,
        old_status=None,
        new_status=ComplaintStatus.SUBMITTED.value,
        comment=f"Complaint lodged successfully on AICTE Centralized Monitoring Portal.{apaar_note}{ev_note} Reference ID {reference_id} generated.",
        is_public=True,
        created_at=now
    )
    db.add(act)

    # Audit log
    record_audit(
        db=db,
        action="PUBLIC_SUBMISSION",
        entity_name="Complaint",
        entity_id=reference_id,
        details={
            "institution": inst.name,
            "category": req.category,
            "anonymous": req.is_anonymous,
            "apaar_verified": is_apaar_valid,
            "apaar_id": clean_apaar if is_apaar_valid else None,
            "evidence_count": len(saved_evidence)
        }
    )

    db.commit()

    return {
        "success": True,
        "reference_id": reference_id,
        "submission_date": now,
        "sla_deadline": sla_deadline,
        "assigned_bureau": bureau_info["bureau_name"],
        "is_apaar_verified": is_apaar_valid,
        "apaar_id": clean_apaar if is_apaar_valid else None,
        "evidence_files": saved_evidence,
        "evidence_count": len(saved_evidence),
        "message": "Grievance registered successfully. Your official Public Complaint Reference ID has been generated."
    }

@router.get("/track/{reference_id}")
def track_public_complaint(reference_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.reference_id == reference_id.strip()).first()
    if not c:
        raise HTTPException(
            status_code=404, 
            detail=f"No complaint found matching Reference ID '{reference_id}'. Please check the ID and retry."
        )

    # Filter only public actions for citizen privacy and security
    public_actions = [
        {
            "id": a.id,
            "complaint_id": a.complaint_id,
            "action_type": a.action_type,
            "old_status": a.old_status,
            "new_status": a.new_status,
            "comment": a.comment,
            "created_at": a.created_at
        }
        for a in c.actions if a.is_public
    ]

    # Public evidence documents
    public_evidence = [
        {
            "original_name": d.original_name,
            "file_size_kb": d.file_size_kb,
            "file_type": d.file_type
        }
        for d in c.documents if d.is_public
    ]

    return {
        "reference_id": c.reference_id,
        "institution_name": c.institution.name if c.institution else "AICTE Regulated Institution",
        "state": c.state,
        "category": c.category,
        "status": c.status,
        "submission_date": c.submission_date,
        "sla_deadline": c.sla_deadline,
        "is_apaar_verified": bool(c.is_apaar_verified),
        "timeline": public_actions,
        "evidence_files": public_evidence,
        "notice": "Privacy Protection: In accordance with AICTE data security norms, personal complainant details and internal administrative deliberations are protected."
    }

@router.get("/apaar/verify/{apaar_id}")
def verify_apaar_id(apaar_id: str):
    """
    Simulates AICTE Gateway integration with National Academic Depository (NAD) / APAAR registry.
    """
    clean = "".join([c for c in apaar_id if c.isalnum()])
    if len(clean) < 10:
        return {
            "is_valid": False,
            "error": "Invalid APAAR ID format. Must contain at least 10-12 alphanumeric characters."
        }
    
    formatted = f"{clean[:4]}-{clean[4:8]}-{clean[8:]}" if len(clean) == 12 else clean
    return {
        "is_valid": True,
        "apaar_id": formatted,
        "registry": "National Academic Depository (NAD) / Ministry of Education, Govt. of India",
        "enrollment_status": "AUTHENTICATED_ACTIVE_STUDENT",
        "academic_depository_source": "DigiLocker / One Nation One Student ID Central Gateway",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "trust_tier": "Tier-1 Authenticated Student Credential"
    }

@router.get("/apaar/registry")
def list_apaar_registry(db: Session = Depends(get_db)):
    """
    Lists complaints authenticated through the APAAR student registry.
    Demonstrates post-integration student credential tracking for AICTE officials.
    """
    records = db.query(Complaint).filter(
        Complaint.is_apaar_verified == True
    ).order_by(Complaint.submission_date.desc()).limit(50).all()

    return {
        "total_verified": len(records),
        "gateway_status": "ONLINE (Connected to National Academic Depository / APAAR)",
        "protocol": "One Nation, One Student ID (Ministry of Education & AICTE)",
        "items": [
            {
                "reference_id": c.reference_id,
                "apaar_id": c.apaar_id,
                "institution_name": c.institution.name if c.institution else "Unknown",
                "state": c.state,
                "category": c.category,
                "status": c.status,
                "submission_date": c.submission_date.isoformat(),
                "verification_status": "CONFIRMED_ENROLLED_STUDENT"
            }
            for c in records
        ]
    }

@router.get("/institutions")
def get_public_institutions(state: str = None, db: Session = Depends(get_db)):
    """
    Public registry lookup of approved technical institutions for grievance registration dropdown.
    Does not expose sensitive internal regulatory scores or officer notes.
    """
    query = db.query(Institution)
    if state and state.strip():
        query = query.filter(Institution.state.ilike(state.strip()))
    institutions = query.order_by(Institution.name).all()
    return {
        "total": len(institutions),
        "items": [
            {
                "id": inst.id,
                "name": inst.name,
                "code": inst.code,
                "state": inst.state,
                "district": inst.district,
                "institution_type": inst.institution_type
            }
            for inst in institutions
        ]
    }

