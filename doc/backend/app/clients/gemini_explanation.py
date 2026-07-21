"""
CyberSentinel AI — Gemini Explanation Agent Client
"""

from loguru import logger
from app.core.config import settings
from typing import List


async def explain(
    threat_type: str,
    risk_score: int,
    indicators: List[str],
    raw_input_snippet: str,
) -> dict:
    """Get a human-readable explanation with key points."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("📝 [MOCK] Explanation agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("explanation")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("explanation", {
            "threat_type": threat_type,
            "risk_score": risk_score,
            "indicators": indicators,
            "raw_input_snippet": raw_input_snippet,
        })
        return result
    except Exception as e:
        logger.error(f"Explanation agent error: {e}")
        return {"summary_text": "Analysis completed.", "key_points": ["AI engine processed the input."]}
