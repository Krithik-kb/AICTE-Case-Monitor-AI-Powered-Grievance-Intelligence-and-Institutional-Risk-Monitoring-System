from datetime import datetime, timedelta, timezone
from typing import Tuple
from app.core.config import settings

def calculate_sla_deadline(submission_date: datetime, severity: str) -> datetime:
    severity_upper = severity.upper()
    if severity_upper == "HIGH":
        days = settings.SLA_DAYS_HIGH
    elif severity_upper == "MEDIUM":
        days = settings.SLA_DAYS_MEDIUM
    else:
        days = settings.SLA_DAYS_LOW
    
    return submission_date + timedelta(days=days)

def evaluate_sla_status(sla_deadline: datetime, current_status: str, resolved_at: datetime = None) -> Tuple[bool, int, str]:
    """
    Returns (is_overdue, days_remaining, urgency_badge)
    """
    now = datetime.now(timezone.utc)
    # Ensure tz-aware comparison
    if sla_deadline.tzinfo is None:
        sla_deadline = sla_deadline.replace(tzinfo=timezone.utc)
    
    if current_status in ["RESOLVED", "REJECTED"]:
        if resolved_at:
            if resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=timezone.utc)
            was_overdue = resolved_at > sla_deadline
            return (was_overdue, 0, "RESOLVED_ON_TIME" if not was_overdue else "RESOLVED_OVERDUE")
        return (False, 0, "COMPLETED")
    
    time_diff = sla_deadline - now
    days_remaining = time_diff.days
    is_overdue = time_diff.total_seconds() < 0
    
    if is_overdue:
        urgency = "OVERDUE"
    elif days_remaining <= 1:
        urgency = "CRITICAL_IMMINENT"
    elif days_remaining <= 3:
        urgency = "APPROACHING"
    else:
        urgency = "ON_TRACK"
        
    return (is_overdue, days_remaining, urgency)
