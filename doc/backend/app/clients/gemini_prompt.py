"""
CyberSentinel AI — Gemini Prompt Injection Agent Client
"""

from loguru import logger
from app.core.config import settings


async def analyze(content: str) -> dict:
    """Analyze a prompt for injection attacks."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("🤖 [MOCK] Prompt agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("prompt")

    from app.clients.gemini_base import get_client
    client = get_client()
    try:
        result = await client.call_agent("prompt", {
            "type": "prompt",
            "content": content,
            "target_system": "chatbot",
        })
        return result
    except Exception as e:
        logger.error(f"Prompt agent error: {e}")
        return {"threat_type": "benign", "risk_score": 0, "confidence": 0.0, "indicators": [], "error": str(e)}
