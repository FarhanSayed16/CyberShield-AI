"""
CyberSentinel AI — Configuration Management
Centralized settings via Pydantic BaseSettings, loaded from .env

Phase 1 freeze: JWT_*, STORAGE_BACKEND, REDIS_URL, FRONTEND_URL are reserved
for Phase 2 auth/tenancy merge. See doc/Phase1_Architecture_And_Env.md.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "cybersentinel"
    # mongodb (staging/prod) | memory (temporary AIS-style smoke)
    STORAGE_BACKEND: str = "mongodb"

    # AI Agents
    GEMINI_API_KEYS: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    # Primary model; client falls back if this model is unavailable for a key
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    USE_MOCK_AGENTS: bool = False

    SAFE_BROWSING_API_KEY: str = ""
    VIRUSTOTAL_API_KEY: str = ""
    PHISHSTATS_API_URL: str = "https://phishstats.info/api"
    SAFEPROMPT_API_KEY: str = ""
    HIVE_AI_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""

    # Hugging Face ML Space (Tier 1/2 remote inference)
    HF_API_URL: str = ""

    # Auth (Phase 2+)
    JWT_SECRET: str = "change-me-in-production-min-32-chars-long-please"
    JWT_EXPIRE_HOURS: int = 24

    # Optional cache / rate-limit (fail-open if unreachable)
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    # Security
    # development | staging | production — staging/production refuse weak API_KEY / JWT_SECRET
    ENVIRONMENT: str = "development"
    API_KEY: str = "dev-key"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    # Billing placeholders (Phase 5)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    # Only allow POST /api/billing/dev-activate when true (local). Ignored: staging/prod always off.
    ALLOW_DEV_BILLING: bool = False

    # Optional OpenAI key for /proxy (Growth; flag-gated usage)
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
