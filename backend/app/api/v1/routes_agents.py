"""
CyberSentinel AI — Debug Agent Routes
POST /api/agent/{agent_name} — Directly call a specific agent (debug/testing).
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from app.api.deps import require_auth
from app.core.config import settings

router = APIRouter()


@router.post("/agent/{agent_name}")
async def call_agent_directly(
    agent_name: str,
    payload: dict,
    _api_key: str = Depends(require_auth),
):
    """
    Debug endpoint: call a specific AI agent directly.
    Disabled when ENVIRONMENT=production.
    """
    if (settings.ENVIRONMENT or "").strip().lower() == "production":
        raise HTTPException(status_code=404, detail="Not found")

    valid_agents = ["phishing", "url", "prompt", "deepfake", "explanation", "recommendation"]
    if agent_name not in valid_agents:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {agent_name}. Valid: {valid_agents}")

    try:
        from app.clients import gemini_base
        client = gemini_base.get_client()
        result = await client.call_agent(agent_name, payload)
        logger.info(f"🤖 Direct agent call: {agent_name} → success")
        return {"agent": agent_name, "result": result}
    except Exception as e:
        logger.error(f"🤖 Direct agent call failed: {agent_name} → {e}")
        raise HTTPException(status_code=500, detail="Agent call failed")
