"""
CyberSentinel AI — PhishStats API Client
"""

import httpx
from loguru import logger
from app.core.config import settings


async def check(domain: str) -> dict | None:
    """
    Check if a domain is in the PhishStats phishing database.
    Returns: {"found": bool} or None on error/skip.
    """
    if not settings.PHISHSTATS_API_URL:
        logger.debug("🎣 PhishStats: skipped (no URL)")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.PHISHSTATS_API_URL}/phishing",
                params={"_where": f"(url,like,~{domain}~)"},
            )
            response.raise_for_status()
            data = response.json()

            flagged = len(data) > 0 if isinstance(data, list) else False
            logger.info(f"🎣 PhishStats: {domain} → {'FLAGGED' if flagged else 'clean'}")
            return {"found": flagged}
    except Exception as e:
        logger.warning(f"🎣 PhishStats error: {e}")
        return None
