"""
CyberSentinel AI — Google Safe Browsing API Client
"""

import httpx
from loguru import logger
from app.core.config import settings


async def check(url: str) -> str | None:
    """
    Check URL against Google Safe Browsing.
    Returns: 'PHISHING', 'MALWARE', 'UNWANTED_SOFTWARE', 'SAFE', or None on error.
    """
    if not settings.SAFE_BROWSING_API_KEY or settings.SAFE_BROWSING_API_KEY == "placeholder":
        logger.debug("🔍 Safe Browsing: skipped (no API key)")
        return None

    payload = {
        "client": {"clientId": "cybersentinel", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find",
                params={"key": settings.SAFE_BROWSING_API_KEY},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            if data.get("matches"):
                threat = data["matches"][0]["threatType"]
                logger.info(f"🔍 Safe Browsing: {url[:50]} → {threat}")
                return threat
            else:
                logger.debug(f"🔍 Safe Browsing: {url[:50]} → SAFE")
                return "SAFE"
    except Exception as e:
        logger.warning(f"🔍 Safe Browsing error: {e}")
        return None
