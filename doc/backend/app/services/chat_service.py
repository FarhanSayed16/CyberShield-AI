"""
CyberSentinel AI — Chat Service
Integrates with Google Gemini API using multiple keys for load balancing/fallback.
"""

import asyncio
import google.generativeai as genai
from google.generativeai.types import generation_types
from loguru import logger
from app.core.config import settings
from fastapi import HTTPException

# Parse the comma-separated keys from the environment
_API_KEYS = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
_CURRENT_KEY_INDEX = 0

if not _API_KEYS:
    logger.warning("⚠️ No Gemini API keys found in environment. Chat service will mock or fail if called.")

def _get_next_api_key() -> str:
    """Round-robin through the available API keys."""
    global _CURRENT_KEY_INDEX
    if not _API_KEYS:
         raise ValueError("No Gemini API keys configured.")
    key = _API_KEYS[_CURRENT_KEY_INDEX]
    _CURRENT_KEY_INDEX = (_CURRENT_KEY_INDEX + 1) % len(_API_KEYS)
    return key


SYSTEM_PROMPT = """You are CyberSentinel AI, an elite cybersecurity assistant integrated directly into the user's browser via a floating quickball.
Your goal is to protect the user from phishing, scams, and malicious intent on the websites they visit.

Guidelines:
1. ALWAYS be concise. You are living inside a tiny glassmorphic extension bubble. Responses longer than 3-4 sentences will break the UI or overwhelm the user.
2. Be direct and authoritative but helpful.
3. If giving advice, use markdown bolding (e.g. **Do not click**) to emphasize critical safety instructions.
4. You will be provided with the user's prompt, and optionally the context of the page they are viewing. Use the context to inform your answer.
"""

async def generate_chat_response(prompt: str, url_context: str = None) -> str:
    """
    Calls the Gemini API using one of the configured keys.
    If the key hits a rate limit or error, it retries with the next key.
    """
    if not _API_KEYS:
         return "⚠️ Error: CyberSentinel AI engines are currently offline (No API key configured)."

    if settings.USE_MOCK_AGENTS:
         await asyncio.sleep(1.0)
         return "**[MOCK MODE]** Based on my analysis, this page is attempting to harvest credentials. Do not proceed."

    # Construct the final prompt with context
    full_prompt = prompt
    if url_context:
         full_prompt = f"[User Current Page Context: {url_context}]\n\nUser Question: {prompt}"

    # Try all keys before giving up
    for attempt in range(len(_API_KEYS)):
        current_key = _get_next_api_key()
        try:
             # Configure SDK for this request
             genai.configure(api_key=current_key)
             
             # Initialize model
             model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                system_instruction=SYSTEM_PROMPT
             )
             
             response = await asyncio.to_thread(
                  model.generate_content,
                  full_prompt,
                  generation_config={"temperature": 0.2, "max_output_tokens": 150}
             )
             
             if response.text:
                  return response.text
             else:
                  logger.error(f"Generate Content returned empty response using key ending in ...{current_key[-4:]}")
                  
        except Exception as e:
             error_str = str(e).lower()
             logger.error(f"Gemini API Error with key (...{current_key[-4:]}): {e}")
             
             # If it's a quota or permission issue, let the loop try the next key
             if "429" in error_str or "quota" in error_str or "exhausted" in error_str:
                 logger.warning(f"Key (...{current_key[-4:]}) exhausted or rate limited. Trying next key...")
                 continue # Try next key
             else:
                 # Standard error, e.g. bad request or safety block
                 return f"CyberSentinel blocked this request due to a safety filtering issue: {e}"
                 
    # If we exit the loop, all keys failed
    logger.error("🚨 All configured Gemini API keys failed or hit rate limits.")
    return "⚠️ CyberSentinel AI engines are currently overloaded. Please try again in a few moments."
