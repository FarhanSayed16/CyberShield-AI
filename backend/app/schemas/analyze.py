"""
CyberSentinel AI — Analyze Schemas
Request/Response Pydantic models for the /api/analyze endpoint.
"""

from typing import List, Literal, Optional, Any

from pydantic import BaseModel, Field


# --- Type Aliases ---
ThreatInputType = Literal["url", "text", "prompt", "image", "video", "anomaly", "email"]
ThreatType = Literal["phishing", "malicious_url", "prompt_injection", "deepfake", "behavior_anomaly", "benign"]
ThreatLevel = Literal["Safe", "Suspicious", "High Risk"]
SeverityLabel = Literal["Informational", "Warning", "Critical"]


# --- Request ---

class AnalyzeRequest(BaseModel):
    """Input from frontend or extension to trigger threat analysis."""
    source: Literal["extension", "dashboard", "history_audit"] = "dashboard"
    type: ThreatInputType
    tier: Literal["tier1", "tier2", "tier3", "auto"] = "auto"
    content: str = Field(..., min_length=1, max_length=10_485_760, description="Raw content to analyze (base64 for image/video)")


# --- Response Sub-models ---

class ExternalFlags(BaseModel):
    """External API enrichment data."""
    safe_browsing: Optional[str] = None
    virustotal_positives: Optional[int] = None
    virustotal_total_engines: Optional[int] = None
    domain_age: Optional[str] = None
    phishstats_flagged: Optional[bool] = None
    safeprompt_risk: Optional[str] = None
    hive_ai_result: Optional[str] = None


# --- Response ---

class AnalyzeResponse(BaseModel):
    """Full threat analysis result returned to the frontend."""
    id: str
    type: ThreatInputType
    source: str
    raw_input_snippet: str
    threat_type: ThreatType
    risk_score: int = Field(..., ge=0, le=100)
    threat_level: ThreatLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    indicators: List[str]
    explanation: str
    key_points: List[str]
    recommended_actions: List[str]
    external_flags: Optional[ExternalFlags] = None
    severity_label: SeverityLabel
    advanced_analysis: Optional[dict] = None
    created_at: str

class DomainReputationResponse(BaseModel):
    """Result of domain intelligence checks (WHOIS, VirusTotal)."""
    domain: str
    age: str
    risk: Literal["Low", "Medium", "High"]
    vt_score: str
    is_suspicious_tld: bool
    ssl_valid: bool
    # Free-tier path uses heuristics only (not live WHOIS/VT)
    simulated: bool = True
    note: str = "Heuristic demo signal — not live WHOIS/VirusTotal"
