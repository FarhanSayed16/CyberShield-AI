import os
import math
from typing import Dict, Any, Tuple
from loguru import logger
import httpx
from app.core.config import settings

class AdversarialURLEngine:
    def __init__(self):
        self.model = None

    def evaluate_url(self, url: str) -> Tuple[float, Dict[str, Any]]:
        """
        Evaluate a URL returning an ML probability score (0.0 to 1.0) 
        and the extracted features map. Routes to remote HF space if configured.
        """
        if settings.HF_SPACE_URL:
            try:
                # Use synchronous HTTPX to hit the HuggingFace endpoint
                with httpx.Client(timeout=15.0) as client:
                    api_url = f"{settings.HF_SPACE_URL.rstrip('/')}/predict/url"
                    res = client.post(api_url, json={"url": url})
                    res.raise_for_status()
                    data = res.json()
                    # The HF space returns a 0-100 risk score, we need 0.0-1.0 probability
                    risk_score_100 = float(data.get("risk_score", 0.0))
                    
                    return (risk_score_100 / 100.0), {"remote_hf_inference": True}
            except Exception as e:
                logger.error(f"HF Space Error in ml_url_engine: {e}")
                
        # Graceful fallback if no ML configured or HF space offline
        return 0.15, {"fallback": True}

ml_engine = AdversarialURLEngine()
