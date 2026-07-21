"""
CyberSentinel AI — Threat List Schemas
"""

from typing import List

from pydantic import BaseModel

from app.schemas.analyze import AnalyzeResponse


class ThreatListResponse(BaseModel):
    """Paginated list of threat events."""
    items: List[AnalyzeResponse]
    total: int
