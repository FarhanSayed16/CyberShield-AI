import httpx
from typing import Dict, Any, Tuple
from loguru import logger

from app.core.config import settings
from app.services.url_heuristics import analyze_url_heuristics


class AdversarialURLEngine:
    def __init__(self):
        self.api_url = (settings.HF_API_URL or "").rstrip("/")

    async def evaluate_url(self, url: str) -> Tuple[float, Dict[str, Any]]:
        """
        Evaluate a URL returning an ML probability score (0.0 to 1.0)
        and the extracted features map.

        Prefer remote HF Space when configured; otherwise use local heuristics
        (never a constant stub score).
        """
        if self.api_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.post(
                        f"{self.api_url}/predict/url", json={"url": url}
                    )
                    response.raise_for_status()
                    data = response.json()

                    risk_score = data.get("risk_score", 0.0) / 100.0
                    features = data.get("features", {})
                    # Blend remote with local heuristics so adult/phishing hosts
                    # still surface when the remote model under-scores them.
                    local = analyze_url_heuristics(url)
                    local_p = local["risk_score"] / 100.0
                    blended = max(float(risk_score), local_p)
                    features = {
                        **features,
                        "local_heuristics": local,
                        "source": "hf+heuristics",
                    }
                    return blended, features
            except Exception as e:
                logger.error(f"HF Space URL Analysis Error: {e}")

        logger.warning("Using local URL heuristics (HF unavailable or not configured).")
        local = analyze_url_heuristics(url)
        return local["risk_score"] / 100.0, {
            "local_heuristics": local,
            "source": "heuristics",
            "indicators": local.get("indicators", []),
            "category": local.get("category"),
        }


ml_engine = AdversarialURLEngine()
