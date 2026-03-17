"""
CyberSentinel AI — Chat Route
POST /api/chat — Floating Quickball AI assistant endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from app.api.deps import require_auth
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import generate_chat_response

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def ask_cybersentinel(
    request: ChatRequest,
    _api_key: str = Depends(require_auth),
):
    """
    Submits a conversational question to the CyberSentinel AI.
    Used by the Quickball extension to answer user queries with page context.
    """
    logger.info(f"💬 Chat request: len={len(request.prompt)} url_context={bool(request.url_context)}")

    try:
        response_text = await generate_chat_response(
            prompt=request.prompt, 
            url_context=request.url_context
        )
        return ChatResponse(response=response_text)
    except Exception as e:
        import traceback
        logger.error(f"❌ Chat failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal chat error")
