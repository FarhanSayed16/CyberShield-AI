import httpx
from typing import Dict, Any, Tuple
from loguru import logger

from app.core.config import settings

class AdversarialURLEngine:
    def __init__(self):
        self.api_url = (settings.HF_API_URL or "").rstrip("/")

    async def evaluate_url(self, url: str) -> Tuple[float, Dict[str, Any]]:
        """
        Evaluate a URL returning an ML probability score (0.0 to 1.0) 
        and the extracted features map by calling the Hugging Face Space.
        """
        if not self.api_url:
            logger.warning("HF_API_URL is not set. Using URL heuristic fallback.")
            return 0.15, {"error": "HF_API_URL not configured"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(f"{self.api_url}/predict/url", json={"url": url})
                response.raise_for_status()
                data = response.json()
                
                risk_score = data.get("risk_score", 0.0) / 100.0  # Normalize to 0.0-1.0
                features = data.get("features", {})
                return float(risk_score), features
        except Exception as e:
            logger.error(f"HF Space URL Analysis Error: {e}")
            # Fallback heuristic
            return 0.15, {"error": "HF Space unreachable, fallback used"}

ml_engine = AdversarialURLEngine()
