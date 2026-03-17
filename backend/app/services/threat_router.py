"""
CyberSentinel AI — Threat Router
Central dispatcher: routes AnalyzeRequest to the correct service based on input type.
"""

from dataclasses import dataclass, field
from typing import Optional, Any

from loguru import logger


@dataclass
class ThreatDecision:
    """Internal result from any threat analysis service."""
    threat_type: str = "benign"
    risk_score: int = 0
    threat_level: str = "Safe"
    confidence: float = 0.5
    indicators: list = field(default_factory=list)
    explanation: str = ""
    key_points: list = field(default_factory=list)
    recommended_actions: list = field(default_factory=list)
    external_flags: Optional[dict] = None
    severity_label: str = "Informational"
    advanced_analysis: Optional[dict] = None


async def route_request(input_type: str, content: str, source: str, tier: str = "auto") -> ThreatDecision:
    """
    Route the request to the correct threat analysis service.
    Each service calls its AI agent + external APIs and returns a ThreatDecision.
    """
    from app.services import url_service, phishing_service, prompt_service, deepfake_service, anomaly_service

    logger.info(f"🔀 Routing request: type={input_type} tier={tier}")

    if input_type == "url":
        return await url_service.analyze_url(content, tier)
    elif input_type == "text":
        return await phishing_service.analyze_text(content, tier)
    elif input_type == "prompt":
        return await prompt_service.analyze_prompt(content, tier)
    elif input_type in ("image", "video"):
        return await deepfake_service.analyze_media(content, input_type, tier)
    elif input_type == "anomaly":
        return await anomaly_service.analyze_anomaly(content, tier)
    else:
        raise ValueError(f"Unknown input type: {input_type}")
