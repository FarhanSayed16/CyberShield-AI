"""
CyberSentinel AI — Health Check Route
GET /api/health — Backend status check for monitoring and judges.
"""

from fastapi import APIRouter

from app.db.connection import check_db_connection
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Return backend health status."""
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "connected" if db_ok else "disconnected",
        "agents": "mock" if settings.USE_MOCK_AGENTS else "live",
        "version": "1.0.0",
    }
