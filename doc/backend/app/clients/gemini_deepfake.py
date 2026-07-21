"""
CyberSentinel AI — Gemini Deepfake Agent Client
Uses Gemini Vision model for image/video analysis.
"""

from loguru import logger
from app.core.config import settings


async def analyze(content_base64: str, media_type: str) -> dict:
    """Analyze image/video for deepfake manipulation."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("🎭 [MOCK] Deepfake agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("deepfake")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("deepfake", {
            "type": media_type,
            "content": content_base64,
            "filename": f"upload.{media_type}",
        })
        return result
    except Exception as e:
        logger.error(f"Deepfake agent error: {e}")
        return {"threat_type": "benign", "risk_score": 0, "confidence": 0.0, "indicators": [], "error": str(e)}
