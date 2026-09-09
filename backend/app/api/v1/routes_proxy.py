import json
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.api.deps import get_org_from_header
from app.db.documents_org import Organization, User
from app.schemas.ai_guard import EventIngestRequest
from app.api.v1.routes_events import _ingest_event
from app.services.plans import assert_event_quota

router = APIRouter()

OPENAI_BASE = "https://api.openai.com/v1"


@router.post("/openai/v1/chat/completions")
async def openai_chat_completions(
    request: Request,
    org: Organization = Depends(get_org_from_header),
    x_user_token: str | None = Header(None, alias="X-User-Token"),
):
    """Org-scoped OpenAI proxy. Requires org token + employee user token. Uses server OPENAI_API_KEY only in staging/prod."""
    await assert_event_quota(org)

    if not x_user_token:
        raise HTTPException(
            status_code=400,
            detail="X-User-Token required — attribute proxy traffic to an employee",
        )
    user = await User.find_one(User.user_token == x_user_token, User.org_id == org.id)
    if not user or user.status == "suspended":
        raise HTTPException(status_code=401, detail="Invalid user token")

    body_bytes = await request.body()
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    messages = payload.get("messages", [])
    prompt_text = "\n".join(
        m.get("content", "") for m in messages if isinstance(m.get("content"), str)
    )
    if prompt_text:
        ingest = EventIngestRequest(
            user_token=user.user_token,
            platform="openai_api",
            source="proxy",
            prompt_text=prompt_text,
            prompt_length=len(prompt_text),
            captured_at=datetime.utcnow(),
        )
        await _ingest_event(org, user, ingest)

    env = (settings.ENVIRONMENT or "development").strip().lower()
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key and env == "development":
        api_key = (request.headers.get("X-Real-Provider-Key") or "").strip()
    elif request.headers.get("X-Real-Provider-Key") and env in ("staging", "production"):
        raise HTTPException(
            status_code=400,
            detail="Client-supplied provider keys are disabled in staging/production",
        )
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async def stream_proxy():
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{OPENAI_BASE}/chat/completions",
                headers=headers,
                content=body_bytes,
            ) as resp:
                async for chunk in resp.aiter_bytes():
                    yield chunk

    if payload.get("stream"):
        return StreamingResponse(stream_proxy(), media_type="text/event-stream")

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{OPENAI_BASE}/chat/completions",
            headers=headers,
            content=body_bytes,
        )
        return resp.json()
