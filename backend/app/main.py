from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.complaints import router as complaints_router
from app.api.institutions import router as institutions_router
from app.api.bureaus import router as bureaus_router
from app.api.sla import router as sla_router
from app.api.ai import router as ai_router
from app.api.public import router as public_router
from app.api.audit import router as audit_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AICTE Case Monitor — Enterprise Dashboard API",
    description="Smart India Hackathon Prototype: AI-powered centralized complaint tracking, bureau escalation, explainable institutional monitoring, and SLA oversight for technical education.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(complaints_router, prefix=api_prefix)
app.include_router(institutions_router, prefix=api_prefix)
app.include_router(bureaus_router, prefix=api_prefix)
app.include_router(sla_router, prefix=api_prefix)
app.include_router(ai_router, prefix=api_prefix)
app.include_router(public_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "project": "AICTE Case Monitor — Smart India Hackathon",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs",
        "synthetic_data_notice": "ALL RECORDS SHOWN ARE SYNTHETIC DEMONSTRATION DATA DESIGNED FOR SMART INDIA HACKATHON EVALUATION."
    }

@app.get("/health")
def healthcheck():
    return {"status": "healthy", "timestamp": "ok"}
