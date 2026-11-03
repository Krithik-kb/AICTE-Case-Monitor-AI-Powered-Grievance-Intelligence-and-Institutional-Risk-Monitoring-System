from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Complaint, Bureau, User
from app.services.ai_service import ai_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Intelligence & Categorization"])

class AIAnalyzeRequest(BaseModel):
    description: str
    institution_id: Optional[int] = None
    severity: Optional[str] = "MEDIUM"

@router.post("/analyze")
def analyze_complaint_text(
    req: AIAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Category suggestion
    sugg_category, confidence = ai_service.predict_category(req.description)

    # 2. Bureau recommendation
    bureau_info = ai_service.suggest_bureau(sugg_category)
    bureau_db = db.query(Bureau).filter(Bureau.code == bureau_info["bureau_code"]).first()
    bureau_id = bureau_db.id if bureau_db else bureau_info["bureau_id"]

    # 3. Priority suggestion
    priority = ai_service.suggest_priority(req.severity, req.description)

    # 4. Duplicate detection (checking against recent complaints)
    existing_query = db.query(Complaint)
    if req.institution_id:
        existing_query = existing_query.filter(Complaint.institution_id == req.institution_id)
    recent_cases = existing_query.order_by(Complaint.submission_date.desc()).limit(40).all()
    
    existing_list = [
        {"reference_id": c.reference_id, "description": c.description}
        for c in recent_cases
    ]
    duplicate_info = ai_service.detect_duplicate(req.description, existing_list)

    # 5. Case summary
    summary = ai_service.generate_summary(req.description, sugg_category, req.severity)

    return {
        "suggested_category": sugg_category,
        "category_confidence": confidence,
        "suggested_bureau": bureau_info["bureau_name"],
        "suggested_bureau_code": bureau_info["bureau_code"],
        "suggested_bureau_id": bureau_id,
        "suggested_priority": priority,
        "is_duplicate": duplicate_info["is_duplicate"],
        "duplicate_reference_id": duplicate_info["duplicate_ref"],
        "duplicate_score": duplicate_info["score"],
        "generated_summary": summary,
        "model_mode": "Trained ML (TF-IDF + Logistic Regression) with Rule-Based Safeguards",
        "notice": "AI outputs are purely advisory suggestions for authorized human officers. Never reject complaints or establish institutional guilt automatically."
    }
