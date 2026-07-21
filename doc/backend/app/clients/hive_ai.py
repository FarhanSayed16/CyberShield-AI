"""
CyberSentinel AI — Hive AI Deepfake Detection Client
"""

import httpx
from loguru import logger
from app.core.config import settings


async def detect(content_base64: str) -> dict | None:
    """
    Send base64-encoded image to Hive AI for deepfake detection.
    Returns: {"classification": "authentic|likely_manipulated|manipulated"} or None.
    """
    if not settings.HIVE_AI_API_KEY or settings.HIVE_AI_API_KEY == "placeholder":
        logger.debug("🐝 Hive AI: skipped (no API key)")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.thehive.ai/api/v2/task/sync",
                headers={
                    "Authorization": f"Token {settings.HIVE_AI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"image_base64": content_base64},
            )
            response.raise_for_status()
            data = response.json()

            # Parse Hive AI response — extract deepfake classification
            classes = data.get("status", [{}])[0].get("response", {}).get("output", [{}])
            classification = "unknown"
            for cls in classes:
                if cls.get("class") in ("deepfake", "manipulated"):
                    score = cls.get("score", 0)
                    if score > 0.7:
                        classification = "manipulated"
                    elif score > 0.4:
                        classification = "likely_manipulated"
                    else:
                        classification = "authentic"
                    break

            logger.info(f"🐝 Hive AI: → {classification}")
            return {"classification": classification}
    except Exception as e:
        logger.warning(f"🐝 Hive AI error: {e}")
        return None
