"""
CyberSentinel AI — Beanie Document Models
MongoDB document schemas for threat event persistence.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class ExternalFlagsEmbed(BaseModel):
    """Embedded model for external API enrichment data."""

    safe_browsing: Optional[str] = None
    virustotal_positives: Optional[int] = None
    virustotal_total_engines: Optional[int] = None
    domain_age: Optional[str] = None
    phishstats_flagged: Optional[bool] = None
    safeprompt_risk: Optional[str] = None
    hive_ai_result: Optional[str] = None


class ThreatEventDocument(Document):
    """MongoDB document representing a single threat analysis event."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # url | text | prompt | image | video | email | anomaly
    source: str  # extension | dashboard
    raw_input_snippet: str
    threat_type: str  # phishing | malicious_url | prompt_injection | deepfake | benign
    risk_score: int  # 0–100
    threat_level: str  # Safe | Suspicious | High Risk
    confidence: float  # 0.0–1.0
    indicators: List[str] = Field(default_factory=list)
    explanation: str = ""
    key_points: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    external_flags: Optional[ExternalFlagsEmbed] = None
    severity_label: str = "Informational"  # Informational | Warning | Critical
    advanced_analysis: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "threat_events"
