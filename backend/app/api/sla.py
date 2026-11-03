from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Complaint, Bureau, User
from app.schemas.schemas import ComplaintResponse
from app.api.deps import get_current_user
from app.api.complaints import serialize_complaint

router = APIRouter(prefix="/sla", tags=["SLA Tracking & Escalations"])

@router.get("/overview")
def get_sla_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    open_statuses = ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATION", "ACTION_TAKEN"]

    open_complaints = db.query(Complaint).filter(Complaint.status.in_(open_statuses)).all()

    overdue_list = []
    critical_imminent_list = [] # < 24 hrs
    approaching_list = []       # < 72 hrs
    on_track_list = []

    for c in open_complaints:
        deadline = c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline
        diff = deadline - now
        
        serialized = serialize_complaint(c)

        if diff.total_seconds() < 0:
            overdue_list.append(serialized)
        elif diff.total_seconds() <= 86400: # 24 hrs
            critical_imminent_list.append(serialized)
        elif diff.total_seconds() <= 86400 * 3: # 72 hrs
            approaching_list.append(serialized)
        else:
            on_track_list.append(serialized)

    # Bureau SLA Compliance Rates
    bureaus = db.query(Bureau).filter(Bureau.is_active == True).all()
    bureau_compliance = []
    for b in bureaus:
        b_all = db.query(Complaint).filter(Complaint.assigned_bureau_id == b.id).all()
        if not b_all:
            continue
        b_overdue = sum(
            1 for c in b_all 
            if c.status in open_statuses and (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
        )
        rate = round(((len(b_all) - b_overdue) / len(b_all)) * 100.0, 1)
        bureau_compliance.append({
            "bureau_id": b.id,
            "bureau_code": b.code,
            "bureau_name": b.name,
            "total_cases": len(b_all),
            "overdue_cases": b_overdue,
            "compliance_rate": rate
        })

    # Severity SLA breakdown
    severity_breakdown = {}
    for sev in ["HIGH", "MEDIUM", "LOW"]:
        sev_cases = [c for c in open_complaints if c.severity == sev]
        sev_overdue = sum(
            1 for c in sev_cases 
            if (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
        )
        severity_breakdown[sev] = {
            "target_days": 3 if sev == "HIGH" else (7 if sev == "MEDIUM" else 15),
            "active_cases": len(sev_cases),
            "overdue_cases": sev_overdue,
            "compliance_rate": round(((len(sev_cases) - sev_overdue) / len(sev_cases)) * 100.0, 1) if sev_cases else 100.0
        }

    return {
        "summary": {
            "total_active_cases": len(open_complaints),
            "overdue_count": len(overdue_list),
            "imminent_24h_count": len(critical_imminent_list),
            "approaching_72h_count": len(approaching_list),
            "on_track_count": len(on_track_list),
            "overall_sla_compliance_rate": round(((len(open_complaints) - len(overdue_list)) / len(open_complaints)) * 100.0, 1) if open_complaints else 100.0
        },
        "bureau_compliance": bureau_compliance,
        "severity_breakdown": severity_breakdown,
        "escalation_queue": overdue_list[:15],
        "imminent_queue": critical_imminent_list[:10]
    }
