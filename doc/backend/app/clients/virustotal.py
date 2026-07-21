"""
CyberSentinel AI — VirusTotal API Client
"""

import hashlib
import base64

import httpx
from loguru import logger
from app.core.config import settings


async def scan(url: str) -> dict | None:
    """
    Submit a URL to VirusTotal and return scan results.
    Returns: {"positives": int, "total": int} or None on error/skip.
    """
    if not settings.VIRUSTOTAL_API_KEY or settings.VIRUSTOTAL_API_KEY == "placeholder":
        logger.debug("🦠 VirusTotal: skipped (no API key)")
        return None

    headers = {"x-apikey": settings.VIRUSTOTAL_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Encode URL for VT API v3
            url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")

            response = await client.get(
                f"https://www.virustotal.com/api/v3/urls/{url_id}",
                headers=headers,
            )

            if response.status_code == 404:
                # URL not yet scanned — submit it
                submit_resp = await client.post(
                    "https://www.virustotal.com/api/v3/urls",
                    headers=headers,
                    data={"url": url},
                )
                logger.info(f"🦠 VirusTotal: submitted {url[:50]} for scan")
                return {"positives": 0, "total": 0}  # Results not yet available

            response.raise_for_status()
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            positives = stats.get("malicious", 0) + stats.get("suspicious", 0)
            total = sum(stats.values()) if stats else 0

            logger.info(f"🦠 VirusTotal: {url[:50]} → {positives}/{total}")
            return {"positives": positives, "total": total}

    except Exception as e:
        logger.warning(f"🦠 VirusTotal error: {e}")
        return None
