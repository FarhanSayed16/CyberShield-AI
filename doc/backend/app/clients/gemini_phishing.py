"""
CyberSentinel AI — Gemini Phishing Agent Client
"""

from loguru import logger
from app.core.config import settings


async def analyze(content: str) -> dict:
    """Analyze text/email content for phishing indicators."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("📧 [MOCK] Phishing agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("phishing")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("phishing", {
            "type": "email",
            "content": content,
            "language": "en",
        })
        return result
    except Exception as e:
        logger.error(f"Phishing agent error: {e}")
        return {"threat_type": "benign", "risk_score": 0, "confidence": 0.0, "indicators": [], "error": str(e)}
