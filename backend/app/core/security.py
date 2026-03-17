"""
CyberSentinel AI — Security Utilities
API key validation, rate limiting, input sanitization.
"""

import re
import time
from collections import defaultdict

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.core.config import settings

# --- API Key Authentication ---

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """Validate the API key from the X-API-Key header."""
    if not api_key or api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return api_key


# --- Simple In-Memory Rate Limiting ---

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 100  # requests
RATE_LIMIT_WINDOW = 60  # seconds


def check_rate_limit(api_key: str):
    """Simple sliding-window rate limiter. Raises 429 if exceeded."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW

    # Clean old entries
    _rate_limit_store[api_key] = [
        t for t in _rate_limit_store[api_key] if t > window_start
    ]

    if len(_rate_limit_store[api_key]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s.",
        )

    _rate_limit_store[api_key].append(now)


# --- Input Sanitization ---

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def sanitize_input(content: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    cleaned = _HTML_TAG_RE.sub("", content)
    cleaned = cleaned.strip()
    return cleaned


def validate_url_format(url: str) -> bool:
    """Basic URL format validation."""
    url_pattern = re.compile(
        r"^https?://"
        r"[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?"
        r"(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*"
        r"(:\d+)?"
        r"(/.*)?$"
    )
    return bool(url_pattern.match(url))
