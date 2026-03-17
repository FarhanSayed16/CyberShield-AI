"""
CyberSentinel AI — Risk Scoring & Fusion Engine
Combines AI agent scores with external API signals into a final risk assessment.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RiskResult:
    risk_score: int
    threat_level: str
    severity_label: str


def _map_threat_level(score: int) -> str:
    """Map a 0-100 score to a threat level."""
    if score <= 30:
        return "Safe"
    elif score <= 60:
        return "Suspicious"
    else:
        return "High Risk"


def _map_severity(threat_level: str) -> str:
    """Map threat level to severity label."""
    mapping = {
        "Safe": "Informational",
        "Suspicious": "Warning",
        "High Risk": "Critical",
    }
    return mapping.get(threat_level, "Informational")


def score_url(
    gemini_result: Optional[dict],
    safe_browsing: Optional[str],
    virustotal_positives: Optional[int] = None,
    virustotal_total_engines: Optional[int] = None,
) -> RiskResult:
    """
    Weighted fusion for URL analysis.

    Weights:
      - LLM agent risk_score: 50%
      - Safe Browsing evidence: 25%
      - VirusTotal evidence: 15%
      - Heuristics: 10%
    """
    llm_score = gemini_result.get("risk_score", 50) if gemini_result else 50

    # Safe Browsing boost
    sb_boost = 0
    if safe_browsing and safe_browsing in ("PHISHING", "MALWARE", "SOCIAL_ENGINEERING"):
        sb_boost = 100

    # VirusTotal boost
    vt_boost = 0
    if virustotal_positives is not None and virustotal_total_engines:
        vt_ratio = virustotal_positives / max(virustotal_total_engines, 1)
        vt_boost = min(100, int(vt_ratio * 200))  # Scale to 0-100

    # Simple heuristic (placeholder)
    heuristic = 0

    final = int(0.50 * llm_score + 0.25 * sb_boost + 0.15 * vt_boost + 0.10 * heuristic)
    final = max(0, min(100, final))

    threat_level = _map_threat_level(final)
    return RiskResult(
        risk_score=final,
        threat_level=threat_level,
        severity_label=_map_severity(threat_level),
    )



