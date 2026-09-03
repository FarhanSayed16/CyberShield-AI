"""
CyberSentinel AI — Remote ML (Hugging Face / cybersentinel-ml-api) client
Optional. When HF_API_URL is empty, callers should use heuristics / Gemini-only paths.
"""

from typing import Any

import httpx
from loguru import logger

from app.core.config import settings


def ml_remote_configured() -> bool:
    return bool((settings.HF_API_URL or "").strip())


def _base_url() -> str:
    return (settings.HF_API_URL or "").rstrip("/")


async def predict_text(text: str) -> dict[str, Any] | None:
    """POST /predict/text → phishing score."""
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(f"{base}/predict/text", json={"text": text})
            response.raise_for_status()
            data = response.json()
            risk = float(data.get("risk_score", 0))
            is_phish = bool(data.get("is_phishing", risk >= 50))
            return {
                "flagged": is_phish,
                "score": int(max(0, min(100, risk))),
                "label": "PHISHING" if is_phish else "SAFE",
                "hf_score": risk,
                "confidence": min(1.0, risk / 100.0),
                "source": "hf_remote",
            }
    except Exception as e:
        logger.warning(f"HF predict/text failed: {e}")
        return None


async def predict_prompt(text: str) -> dict[str, Any] | None:
    """POST /predict/prompt → injection score."""
    base = _base_url()
    if not base:
        return None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(f"{base}/predict/prompt", json={"text": text})
            response.raise_for_status()
            data = response.json()
            is_inj = bool(data.get("is_injection", False))
            score = float(data.get("score", 0))
            return {
                "flagged": is_inj,
                "score": int(max(0, min(100, score))),
                "label": "INJECTION" if is_inj else "SAFE",
                "hf_score": score if is_inj else max(0.0, 100.0 - score),
                "confidence": min(1.0, score / 100.0),
                "source": "hf_remote",
            }
    except Exception as e:
        logger.warning(f"HF predict/prompt failed: {e}")
        return None
