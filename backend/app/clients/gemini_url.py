"""
CyberSentinel AI — Gemini URL Analysis Agent Client
"""

from loguru import logger

from app.core.config import settings


async def analyze(url: str) -> dict | None:
    """
    Analyze a URL for malicious indicators.
    Returns None on failure — callers must NOT treat failure as benign.
    """
    if settings.USE_MOCK_AGENTS:
        logger.debug("🔗 [MOCK] URL agent")
        from app.clients.mock_agents import get_mock_response
        return get_mock_response("url")

    from app.clients.gemini_base import get_client
    from app.core.prompts import URL_SYSTEM_INSTRUCTION

    client = get_client()
    try:
        result = await client.call_agent(
            "url",
            {
                "type": "url",
                "url": url,
                "context": "",
            },
            system_prompt=URL_SYSTEM_INSTRUCTION,
        )
        if isinstance(result, dict) and result.get("error"):
            logger.error(f"URL agent returned error payload: {result.get('error')}")
            return None
        return result
    except Exception as e:
        logger.error(f"URL agent error: {e}")
        return None
