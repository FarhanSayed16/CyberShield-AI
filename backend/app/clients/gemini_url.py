"""
CyberSentinel AI — Gemini URL Analysis Agent Client
"""

from loguru import logger
from app.core.config import settings


async def analyze(url: str) -> dict:
    """Analyze a URL for malicious indicators."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("🔗 [MOCK] URL agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("url")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("url", {
            "type": "url",
            "url": url,
            "context": "",
        })
        return result
    except Exception as e:
        logger.error(f"URL agent error: {e}")
        return {"threat_type": "benign", "risk_score": 0, "confidence": 0.0, "indicators": [], "error": str(e)}
