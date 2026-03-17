from pydantic import BaseModel, Field
from beanie import Document
from datetime import datetime
from typing import Optional

class IntelIndicatorBase(BaseModel):
    indicator_hash: str = Field(..., description="SHA-256 hash of the malicious URL or domain")
    threat_type: str = Field(..., description="e.g., phishing, malware, scam")
    threat_level: str = Field(..., description="e.g., High Risk, Suspicious")
    source_identifier: str = Field(..., description="Anonymous identifier of the reporting node")

class IntelIndicatorCreate(IntelIndicatorBase):
    raw_indicator: Optional[str] = Field(None, description="Raw indicator (will be hashed automatically if provided, never stored raw)")

class IntelIndicatorResponse(IntelIndicatorBase):
    id: str
    reported_at: datetime

class IntelDocument(Document, IntelIndicatorBase):
    reported_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "threat_intel"
