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
        if risk_score >= 70:
            summary = "High-risk signals detected (AI explanation unavailable)."
        elif risk_score >= 40:
            summary = "Suspicious signals detected (AI explanation unavailable)."
        else:
            summary = "Low risk from available signals (AI explanation unavailable)."
        return {
            "summary_text": summary,
            "key_points": indicators[:5] or ["Local / fused scoring was used without Gemini."],
        }
