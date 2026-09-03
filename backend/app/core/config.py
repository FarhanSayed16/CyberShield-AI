"""
CyberSentinel AI — Configuration Management
Centralized settings via Pydantic BaseSettings, loaded from .env
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "cybersentinel"

    # AI Agents
    GEMINI_API_KEYS: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    USE_MOCK_AGENTS: bool = False

    SAFE_BROWSING_API_KEY: str = ""
    VIRUSTOTAL_API_KEY: str = ""
    PHISHSTATS_API_URL: str = "https://phishstats.info/api"
    SAFEPROMPT_API_KEY: str = ""
    HIVE_AI_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""

    # Hugging Face ML Space (Tier 1/2 remote inference)
    HF_API_URL: str = ""

    # Security
    # development | production — production refuses weak API_KEY and disables debug agents
    ENVIRONMENT: str = "development"
    API_KEY: str = "dev-key"
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
