"""
CyberSentinel AI — SafePrompt API Client
"""

import httpx
from loguru import logger
from app.core.config import settings


async def check(prompt_text: str) -> dict | None:
    """
    Validate prompt against SafePrompt API.
    Returns {"risk_category": str} or None on error/skip.
    """
    if not settings.SAFEPROMPT_API_KEY or settings.SAFEPROMPT_API_KEY == "placeholder":
        logger.debug("🛡️ SafePrompt: skipped (no API key)")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.safeprompt.ai/v1/check",
                headers={
                    "Authorization": f"Bearer {settings.SAFEPROMPT_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"prompt": prompt_text},
            )
            response.raise_for_status()
            data = response.json()
            risk = data.get("risk", "unknown")
            logger.info(f"🛡️ SafePrompt: risk={risk}")
            return {"risk_category": risk}
    except Exception as e:
        logger.warning(f"🛡️ SafePrompt error: {e}")
        return None
