import os
from openai import AsyncOpenAI
from loguru import logger
from app.core.config import settings

# NVIDIA NIM uses the standard OpenAI API specification
nvidia_client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.NVIDIA_API_KEY
)

async def check_prompt_with_llama_guard(prompt: str) -> dict:
    """
    Sends the user prompt to NVIDIA NIM's Llama Guard 4 (12b or newest available).
    Returns a structured dictionary indicating whether the content is safe or a violation.
    """
    if not settings.NVIDIA_API_KEY:
        logger.warning("NVIDIA_API_KEY is not set. Returning 'safe' fallback.")
        return {"is_safe": True, "category": "none"}
        
    try:
        response = await nvidia_client.chat.completions.create(
            model="nvidia/llama-3.1-nemoguard-8b-content-safety",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,
            max_tokens=100
        )
        
        reply = response.choices[0].message.content.strip().lower()
        
        is_safe = True
        category = "none"
        
        if reply.startswith("unsafe"):
            is_safe = False
            # Llama guard typically replies: "unsafe\nO1"
            parts = reply.split("\n")
            if len(parts) > 1:
                category = parts[1].strip().upper()
        
        return {
            "is_safe": is_safe,
            "category": category,
            "raw_response": reply
        }
        
    except Exception as e:
        logger.error(f"NVIDIA NIM API Error: {e}")
        return {"is_safe": True, "category": "error_fallback"}
