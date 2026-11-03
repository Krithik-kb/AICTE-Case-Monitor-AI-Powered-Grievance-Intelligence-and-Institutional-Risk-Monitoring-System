from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Bureau, Complaint, User
from app.schemas.schemas import BureauResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/bureaus", tags=["Bureaus & Administrative Cells"])

@router.get("", response_model=List[dict])
def list_bureaus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bureaus = db.query(Bureau).filter(Bureau.is_active == True).all()
    now = datetime.now(timezone.utc)
    
    results = []
    for b in bureaus:
        complaints = b.complaints
        tot = len(complaints)
        open_c = sum(1 for c in complaints if c.status not in ["RESOLVED", "REJECTED"])
        res_c = sum(1 for c in complaints if c.status == "RESOLVED")
        ovd_c = sum(
            1 for c in complaints 
            if c.status not in ["RESOLVED", "REJECTED"] and (c.sla_deadline.replace(tzinfo=timezone.utc) if c.sla_deadline.tzinfo is None else c.sla_deadline) < now
        )

        results.append({
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "description": b.description,
            "lead_officer_name": b.lead_officer_name,
            "contact_email": b.contact_email,
            "is_active": b.is_active,
            "total_complaints": tot,
            "open_complaints": open_c,
            "resolved_complaints": res_c,
            "overdue_complaints": ovd_c
        })
    return results
