"""
CyberSentinel AI — Shared Gemini HTTP Client
Reusable async client for all Gemini agent calls with mock support.
"""

import json
import time

import httpx
from loguru import logger

from app.core.config import settings

_client_instance = None


class GeminiClient:
    """Async HTTP client for Google Gemini API."""

    def __init__(self):
        self.base_url = settings.GEMINI_BASE_URL
        # GEMINI_API_KEYS is a comma-separated list; pick the first available key
        keys = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
        self.api_key = keys[0] if keys else ""
        self.client = httpx.AsyncClient(timeout=30.0)

    async def call_agent(self, agent_name: str, input_data: dict, system_prompt: str = "") -> dict:
        """
        Send JSON to a Gemini agent and return parsed response.
        Uses the generateContent API with system instruction.
        """
        start = time.time()

        # Build the envelope
        envelope = json.dumps({
            "agent": agent_name,
            "input": input_data,
        })

        # Build request payload
        payload = {
            "contents": [{"parts": [{"text": envelope}]}],
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        try:
            response = await self.client.post(
                f"{self.base_url}/models/gemini-2.5-flash-lite:generateContent",
                params={"key": self.api_key},
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            result = self._parse_response(response.json())
            latency = time.time() - start
            logger.info(f"🤖 Gemini [{agent_name}] → {latency:.2f}s ✓")
            return result

        except httpx.HTTPStatusError as e:
            latency = time.time() - start
            logger.error(f"🤖 Gemini [{agent_name}] HTTP error {e.response.status_code} → {latency:.2f}s")
            # Retry once on 5xx
            if e.response.status_code >= 500:
                logger.info(f"🔄 Retrying [{agent_name}]...")
                response = await self.client.post(
                    f"{self.base_url}/models/gemini-2.5-flash-lite:generateContent",
                    params={"key": self.api_key},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                return self._parse_response(response.json())
            raise
        except Exception as e:
            latency = time.time() - start
            logger.error(f"🤖 Gemini [{agent_name}] failed → {latency:.2f}s: {e}")
            raise

    def _parse_response(self, raw: dict) -> dict:
        """Extract JSON from Gemini text response."""
        text = raw["candidates"][0]["content"]["parts"][0]["text"]
        # Strip markdown code fences if present
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
