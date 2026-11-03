from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_
from app.core.database import get_db
from app.models.models import Complaint, Institution, Bureau, CaseAction, ComplaintStatus, User
from app.schemas.schemas import DashboardResponse
from app.services.sla_service import evaluate_sla_status
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"])

STATUS_COLORS = {
    "SUBMITTED": "#3b82f6",     # Blue
    "UNDER_REVIEW": "#f59e0b",  # Amber
    "INVESTIGATION": "#8b5cf6", # Purple
    "ACTION_TAKEN": "#06b6d4",  # Cyan
    "RESOLVED": "#10b981",      # Emerald Green
    "REJECTED": "#ef4444"       # Rose Red
}

@router.get("/summary", response_model=DashboardResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    
    # 1. Total, Open, Resolved
    total_complaints = db.query(Complaint).count()
    open_statuses = [
        ComplaintStatus.SUBMITTED.value,
        ComplaintStatus.UNDER_REVIEW.value,
        ComplaintStatus.INVESTIGATION.value,
        ComplaintStatus.ACTION_TAKEN.value
    ]
    open_complaints = db.query(Complaint).filter(Complaint.status.in_(open_statuses)).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED.value).count()
    
    # 2. Overdue complaints
    # Status is open and sla_deadline is in past
    overdue_complaints = db.query(Complaint).filter(
        Complaint.status.in_(open_statuses),
        Complaint.sla_deadline < now
    ).count()

    # 3. Average Resolution Time in days
    resolved_cases = db.query(Complaint).filter(
        Complaint.status == ComplaintStatus.RESOLVED.value,
        Complaint.resolved_at.isnot(None)
    ).all()
    
    total_res_days = 0.0
    res_count = len(resolved_cases)
    for c in resolved_cases:
        sub = c.submission_date.replace(tzinfo=timezone.utc) if c.submission_date.tzinfo is None else c.submission_date
        res = c.resolved_at.replace(tzinfo=timezone.utc) if c.resolved_at.tzinfo is None else c.resolved_at
        diff = (res - sub).total_seconds() / 86400.0
        total_res_days += max(0.5, diff)
        
    avg_resolution_days = round(total_res_days / res_count, 1) if res_count > 0 else 5.2

    # 4. Status Donut Chart Distribution
    status_counts = db.query(
        Complaint.status, func.count(Complaint.id)
    ).group_by(Complaint.status).all()
    
    status_distribution = [
        {
            "name": s,
            "value": count,
            "color": STATUS_COLORS.get(s, "#64748b")
        }
        for s, count in status_counts
    ]

    # 5. Monthly Trend
    # Query monthly received, resolved
    all_complaints = db.query(Complaint).all()
    monthly_data = {}
    for c in all_complaints:
        sub = c.submission_date
        m_key = sub.strftime("%b %Y")
        if m_key not in monthly_data:
            monthly_data[m_key] = {"received": 0, "resolved": 0, "overdue": 0, "sort_dt": sub.replace(day=1)}
        monthly_data[m_key]["received"] += 1
        
        if c.status == ComplaintStatus.RESOLVED.value and c.resolved_at:
            res_m_key = c.resolved_at.strftime("%b %Y")
            if res_m_key not in monthly_data:
                monthly_data[res_m_key] = {"received": 0, "resolved": 0, "overdue": 0, "sort_dt": c.resolved_at.replace(day=1)}
            monthly_data[res_m_key]["resolved"] += 1

        # Check if overdue
        c_sub = sub.replace(tzinfo=timezone.utc) if sub.tzinfo is None else sub
        c_deadline = c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline
        if c.status in open_statuses and c_deadline < now:
            monthly_data[m_key]["overdue"] += 1

    sorted_months = sorted(monthly_data.items(), key=lambda x: x[1]["sort_dt"])
    monthly_trend = [
        {
            "month": k,
            "received": v["received"],
            "resolved": v["resolved"],
            "overdue": v["overdue"]
        }
        for k, v in sorted_months[-6:] # past 6 recorded months
    ]

    # 6. Bureau Distribution
    bureaus = db.query(Bureau).filter(Bureau.is_active == True).all()
    bureau_distribution = []
    for b in bureaus:
        b_complaints = db.query(Complaint).filter(Complaint.assigned_bureau_id == b.id).all()
        b_total = len(b_complaints)
        b_pending = sum(1 for c in b_complaints if c.status in open_statuses)
        b_resolved = sum(1 for c in b_complaints if c.status == ComplaintStatus.RESOLVED.value)
        b_overdue = sum(
            1 for c in b_complaints 
            if c.status in open_statuses and (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
        )
        bureau_distribution.append({
            "bureau_id": b.id,
            "code": b.code,
            "name": b.name,
            "total": b_total,
            "pending": b_pending,
            "resolved": b_resolved,
            "overdue": b_overdue
        })

    # 7. Category Breakdown
    cat_counts = db.query(
        Complaint.category, func.count(Complaint.id)
    ).group_by(Complaint.category).order_by(func.count(Complaint.id).desc()).all()
    
    category_breakdown = [
        {
            "category": cat,
            "count": count,
            "percentage": round((count / total_complaints) * 100.0, 1) if total_complaints > 0 else 0
        }
        for cat, count in cat_counts
    ]

    # 8. State-wise Statistics (for Interactive India Map)
    state_counts = db.query(
        Complaint.state,
        func.count(Complaint.id).label("total"),
        func.sum(case((Complaint.status.in_(open_statuses), 1), else_=0)).label("open"),
        func.sum(case((Complaint.status == ComplaintStatus.RESOLVED.value, 1), else_=0)).label("resolved")
    ).group_by(Complaint.state).all()

    state_statistics = []
    for row in state_counts:
        # Count institutions in this state
        inst_cnt = db.query(Institution).filter(Institution.state == row.state).count()
        # Count overdue in this state
        st_overdue = db.query(Complaint).filter(
            Complaint.state == row.state,
            Complaint.status.in_(open_statuses),
            Complaint.sla_deadline < now
        ).count()
        
        state_statistics.append({
            "state": row.state,
            "total": int(row.total),
            "open": int(row.open),
            "resolved": int(row.resolved),
            "overdue": st_overdue,
            "institutions_count": inst_cnt
        })

    # 9. Priority Queue (Top 6 Urgent/Overdue cases)
    priority_complaints = db.query(Complaint).filter(
        Complaint.status.in_(open_statuses)
    ).order_by(
        case((Complaint.severity == "HIGH", 1), (Complaint.severity == "MEDIUM", 2), else_=3),
        Complaint.sla_deadline.asc()
    ).limit(8).all()

    priority_queue = []
    for pc in priority_complaints:
        is_ovd, days_rem, _ = evaluate_sla_status(pc.sla_deadline, pc.status, pc.resolved_at)
        b_name = pc.assigned_bureau.name if pc.assigned_bureau else None
        inst_name = pc.institution.name if pc.institution else None
        
        priority_queue.append({
            "id": pc.id,
            "reference_id": pc.reference_id,
            "institution_id": pc.institution_id,
            "institution_name": inst_name,
            "complainant_name": "Confidential" if pc.is_anonymous else pc.complainant_name,
            "is_anonymous": pc.is_anonymous,
            "state": pc.state,
            "district": pc.district,
            "category": pc.category,
            "severity": pc.severity,
            "priority": pc.priority,
            "assigned_bureau_id": pc.assigned_bureau_id,
            "assigned_bureau_name": b_name,
            "status": pc.status,
            "submission_date": pc.submission_date,
            "sla_deadline": pc.sla_deadline,
            "resolved_at": pc.resolved_at,
            "description": pc.description,
            "is_repeat_complaint": pc.is_repeat_complaint,
            "repeat_count": pc.repeat_count,
            "is_overdue": is_ovd,
            "days_remaining": days_rem,
            "ai_category_suggested": pc.ai_category_suggested,
            "ai_category_confidence": pc.ai_category_confidence,
            "ai_bureau_suggested": pc.ai_bureau_suggested,
            "ai_priority_suggested": pc.ai_priority_suggested,
            "ai_is_duplicate": pc.ai_is_duplicate,
            "ai_duplicate_reference_id": pc.ai_duplicate_reference_id,
            "ai_duplicate_score": pc.ai_duplicate_score,
            "ai_summary": pc.ai_summary
        })

    # 10. Recent Activity
    recent_actions = db.query(CaseAction).order_by(CaseAction.created_at.desc()).limit(8).all()
    recent_activity = [
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
            "user_name": a.user.full_name if a.user else "AICTE Public Portal"
        }
        for a in recent_actions
    ]

    return {
        "metrics": {
            "total_complaints": total_complaints,
            "open_complaints": open_complaints,
            "resolved_complaints": resolved_complaints,
            "overdue_complaints": overdue_complaints,
            "average_resolution_days": avg_resolution_days,
            "escalated_count": overdue_complaints
        },
        "status_distribution": status_distribution,
        "monthly_trend": monthly_trend,
        "bureau_distribution": bureau_distribution,
        "category_breakdown": category_breakdown,
        "state_statistics": state_statistics,
        "priority_queue": priority_queue,
        "recent_activity": recent_activity
    }
