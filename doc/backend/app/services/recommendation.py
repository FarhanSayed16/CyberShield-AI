"""
CyberSentinel AI — Recommendation Service
Wraps the recommendation agent results for service-level use.
"""

from app.clients import gemini_recommendation


async def get_recommendation(threat_type: str, risk_score: int, threat_level: str) -> dict:
    """Get recommendation from the Recommendation Agent."""
    return await gemini_recommendation.recommend(
        threat_type=threat_type,
        risk_score=risk_score,
        threat_level=threat_level,
    )
