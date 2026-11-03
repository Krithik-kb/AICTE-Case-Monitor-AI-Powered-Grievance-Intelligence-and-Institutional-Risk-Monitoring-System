from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.models import User
from app.schemas.schemas import Token, LoginRequest, UserResponse
from app.api.deps import get_current_user
from app.services.audit_service import record_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        bureau_id=user.bureau_id
    )

    record_audit(
        db=db,
        action="LOGIN",
        entity_name="Auth",
        entity_id=str(user.id),
        user_id=user.id,
        user_email=user.email,
        details={"role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login for FastAPI docs"""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.id, role=user.role, bureau_id=user.bureau_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-accounts")
def get_demo_accounts():
    """Provides pre-configured demo account hints for SIH Hackathon presentation"""
    return [
        {
            "role": "ADMIN",
            "name": "Dr. Arvind Kumar (Central Admin)",
            "email": "admin@aicte.gov.in",
            "password": "AdminPassword@2026",
            "permissions": "Full system management, audit trail inspection, all bureau queues, score overrides"
        },
        {
            "role": "BUREAU_OFFICER",
            "name": "Smt. Ritu Sharma (Approval Bureau Officer)",
            "email": "officer.ab@aicte.gov.in",
            "password": "OfficerPassword@2026",
            "permissions": "Assigned bureau management, status progression, case forwarding, official notes"
        },
        {
            "role": "VIEWER",
            "name": "Shri Rajesh Verma (Public Ombudsman / Viewer)",
            "email": "viewer@aicte.gov.in",
            "password": "ViewerPassword@2026",
            "permissions": "Read-only access to executive dashboard, institutions scorecards, non-confidential telemetry"
        }
    ]
