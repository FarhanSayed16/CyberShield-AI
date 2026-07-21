"""
CyberSentinel AI — Shared Dependencies
FastAPI dependency injection for auth &amp; DB.
"""

from fastapi import Depends

from app.core.security import verify_api_key, check_rate_limit


async def require_auth(api_key: str = Depends(verify_api_key)):
    """Dependency that enforces API key + rate limiting."""
    check_rate_limit(api_key)
    return api_key
