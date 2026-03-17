from loguru import logger
from app.core.config import settings

async def generate(threat_data: dict) -> dict:
    """Generate an executive summary narrative for a given threat."""
    if settings.USE_MOCK_AGENTS:
        logger.debug("📝 [MOCK] Narrative agent")
        return {
            "narrative": "This is a mock executive summary report. The AI detected suspicious patterns in the URL, noting high entropy and anomalous subdomains that suggest phishing activity. Immediate user caution is advised."
        }

    from app.clients.gemini_base import get_client
    client = get_client()

    prompt = (
        "You are an expert cybersecurity analyst. Given the following threat intelligence data, "
        "write a professional, 2-3 paragraph executive summary explaining the incident, why it was flagged, "
        "and the potential impact. Output ONLY valid JSON in this exact format: {\"narrative\": \"<your summary>\"}."
    )

    try:
        result = await client.call_agent("narrative", threat_data, system_prompt=prompt)
        return {"narrative": result.get("narrative", "Could not generate narrative.")}
    except Exception as e:
        logger.error(f"Narrative agent error: {e}")
        return {"narrative": f"Error generating report: {str(e)}"}
