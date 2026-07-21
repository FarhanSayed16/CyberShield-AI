"""
CyberSentinel AI — Stats Schemas
"""

from typing import Dict, List

from pydantic import BaseModel


class Last24hData(BaseModel):
    timestamps: List[str]
    counts: List[int]


class StatsResponse(BaseModel):
    """Aggregated analytics for dashboard charts."""
    total_threats: int
    by_type: Dict[str, int]
    by_level: Dict[str, int]
    last_24h: Last24hData
