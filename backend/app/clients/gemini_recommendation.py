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
        if risk_score >= 70:
            actions = [
                "Do not enter credentials or payment details on this page.",
                "Close the tab if this visit was unexpected.",
                "Report the URL to your security team.",
            ]
            severity = "Critical"
        elif risk_score >= 40:
            actions = [
                "Verify the domain carefully before continuing.",
                "Avoid sharing sensitive information.",
            ]
            severity = "Warning"
        else:
            actions = ["Monitor as usual."]
            severity = "Informational"
        return {"severity_label": severity, "actions": actions}
