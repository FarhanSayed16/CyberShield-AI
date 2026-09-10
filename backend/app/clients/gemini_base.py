"""
CyberSentinel AI — Shared Gemini HTTP Client
Reusable async client for all Gemini agent calls with mock support.
Rotates API keys and model fallbacks on auth / model errors.
"""

import json
import time
from typing import List, Optional

import httpx
from loguru import logger

from app.core.config import settings

_client_instance = None

# Prefer flash-lite (widely available); fall back if a project blocks a model.
_DEFAULT_MODEL_CANDIDATES = (
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
)


class GeminiClient:
    """Async HTTP client for Google Gemini API with key + model failover."""

    def __init__(self):
        self.base_url = settings.GEMINI_BASE_URL.rstrip("/")
        self.api_keys: List[str] = [
            k.strip() for k in (settings.GEMINI_API_KEYS or "").split(",") if k.strip()
        ]
        configured = (getattr(settings, "GEMINI_MODEL", "") or "").strip()
        if configured:
            self.models = [configured] + [m for m in _DEFAULT_MODEL_CANDIDATES if m != configured]
        else:
            self.models = list(_DEFAULT_MODEL_CANDIDATES)
        self._key_index = 0
        self._model_index = 0
        self.client = httpx.AsyncClient(timeout=30.0)

    @property
    def api_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self._key_index % len(self.api_keys)]

    @property
    def model(self) -> str:
        return self.models[self._model_index % len(self.models)]

    def _advance_key(self) -> bool:
        if len(self.api_keys) <= 1:
            return False
        prev = self._key_index
        self._key_index = (self._key_index + 1) % len(self.api_keys)
        logger.warning(
            f"🔄 Gemini rotating API key {prev + 1}/{len(self.api_keys)} → {self._key_index + 1}/{len(self.api_keys)}"
        )
        return self._key_index != 0 or len(self.api_keys) > 1

    def _advance_model(self) -> bool:
        if len(self.models) <= 1:
            return False
        if self._model_index >= len(self.models) - 1:
            return False
        self._model_index += 1
        logger.warning(f"🔄 Gemini falling back to model {self.model}")
        return True

    async def call_agent(self, agent_name: str, input_data: dict, system_prompt: str = "") -> dict:
        """
        Send JSON to a Gemini agent and return parsed response.
        Tries alternate keys on 400/401/403 and alternate models on 404.
        """
        if not self.api_keys:
            raise RuntimeError("GEMINI_API_KEYS is not configured")

        start = time.time()
        envelope = json.dumps({"agent": agent_name, "input": input_data})
        payload = {
            "contents": [{"parts": [{"text": envelope}]}],
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        keys_tried = 0
        models_tried = 0
        last_error: Optional[Exception] = None

        while keys_tried < len(self.api_keys) and models_tried < len(self.models):
            model = self.model
            key = self.api_key
            try:
                response = await self.client.post(
                    f"{self.base_url}/models/{model}:generateContent",
                    params={"key": key},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                if response.status_code in (400, 401, 403):
                    body = (response.text or "")[:300]
                    logger.error(
                        f"🤖 Gemini [{agent_name}] HTTP {response.status_code} model={model}: {body}"
                    )
                    last_error = httpx.HTTPStatusError(
                        f"Gemini HTTP {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                    keys_tried += 1
                    if not self._advance_key():
                        break
                    continue

                if response.status_code == 404:
                    body = (response.text or "")[:300]
                    logger.error(
                        f"🤖 Gemini [{agent_name}] model unavailable {model}: {body}"
                    )
                    last_error = httpx.HTTPStatusError(
                        f"Gemini model 404: {model}",
                        request=response.request,
                        response=response,
                    )
                    models_tried += 1
                    if not self._advance_model():
                        break
                    continue

                if response.status_code >= 500:
                    logger.info(f"🔄 Retrying [{agent_name}] after {response.status_code}...")
                    response = await self.client.post(
                        f"{self.base_url}/models/{model}:generateContent",
                        params={"key": key},
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )

                response.raise_for_status()
                result = self._parse_response(response.json())
                latency = time.time() - start
                logger.info(f"🤖 Gemini [{agent_name}] model={model} → {latency:.2f}s ✓")
                return result

            except httpx.HTTPStatusError as e:
                last_error = e
                status = e.response.status_code if e.response is not None else 0
                if status in (400, 401, 403):
                    keys_tried += 1
                    if self._advance_key():
                        continue
                if status == 404:
                    models_tried += 1
                    if self._advance_model():
                        continue
                break
            except Exception as e:
                last_error = e
                latency = time.time() - start
                logger.error(f"🤖 Gemini [{agent_name}] failed → {latency:.2f}s: {e}")
                raise

        latency = time.time() - start
        logger.error(f"🤖 Gemini [{agent_name}] exhausted failover → {latency:.2f}s")
        if last_error:
            raise last_error
        raise RuntimeError(f"Gemini [{agent_name}] failed with no usable key/model")

    def _parse_response(self, raw: dict) -> dict:
        """Extract JSON from Gemini text response."""
        text = raw["candidates"][0]["content"]["parts"][0]["text"]
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean.removeprefix("```json").strip()
        if clean.startswith("```"):
            clean = clean.removeprefix("```").strip()
        if clean.endswith("```"):
            clean = clean.removesuffix("```").strip()
        return json.loads(clean)

    async def close(self):
        await self.client.aclose()


def get_client() -> GeminiClient:
    """Get or create the singleton Gemini client."""
    global _client_instance
    if _client_instance is None:
        _client_instance = GeminiClient()
    return _client_instance


def reset_client() -> None:
    """Drop singleton (tests / config reload)."""
    global _client_instance
    _client_instance = None
