"""
CyberSentinel AI — Gemini Recommendation Agent Client
"""

from loguru import logger
from app.core.config import settings
from typing import List


async def recommend(
    threat_type: str,
    risk_score: int,
    indicators: List[str],
    raw_input_snippet: str,
) -> dict:
    """Get actionable recommendations."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("💡 [MOCK] Recommendation agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("recommendation")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("recommendation", {
            "threat_type": threat_type,
            "risk_score": risk_score,
            "indicators": indicators,
            "raw_input_snippet": raw_input_snippet,
        })
        return result
    except Exception as e:
        logger.error(f"Recommendation agent error: {e}")
        return {"severity_label": "Informational", "actions": ["No action required. Content appears safe."]}
