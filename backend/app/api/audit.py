from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail & Security"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity_name: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
        
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs
