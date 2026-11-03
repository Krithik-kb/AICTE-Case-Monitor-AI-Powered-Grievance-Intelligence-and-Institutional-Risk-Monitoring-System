import os
from pathlib import Path
from typing import List

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_WORKSPACE_ROOT = _BACKEND_DIR.parent
_DEFAULT_DB_FILE = _WORKSPACE_ROOT / "aicte_monitor.db"
if not _DEFAULT_DB_FILE.exists() and (_BACKEND_DIR / "aicte_monitor.db").exists():
    _DEFAULT_DB_FILE = _BACKEND_DIR / "aicte_monitor.db"

class Settings:
    PROJECT_NAME: str = "AICTE Case Monitor API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database (always resolves to absolute path of master aicte_monitor.db)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{_DEFAULT_DB_FILE.as_posix()}"
    )
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aicte_sih_secure_secret_key_2026_jwt_token_auth_salt_9981")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://aicte-case-monitor.vercel.app",
        "*"
    ]
    
    # SLA Days Defaults (Configurable demonstration targets)
    SLA_DAYS_HIGH: int = 3
    SLA_DAYS_MEDIUM: int = 7
    SLA_DAYS_LOW: int = 15

settings = Settings()
