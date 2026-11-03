import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog, CaseAction

def record_audit(
    db: Session,
    action: str,
    entity_name: str,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)
            
    log_entry = AuditLog(
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        user_id=user_id,
        user_email=user_email,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    return log_entry

def record_case_action(
    db: Session,
    complaint_id: int,
    action_type: str,
    comment: str,
    user_id: Optional[int] = None,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    is_public: bool = True
) -> CaseAction:
    action = CaseAction(
        complaint_id=complaint_id,
        user_id=user_id,
        action_type=action_type,
        old_status=old_status,
        new_status=new_status,
        comment=comment,
        is_public=is_public
    )
    db.add(action)
    db.commit()
    return action
