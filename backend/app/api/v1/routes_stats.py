"""
CyberSentinel AI — Stats & Analytics Routes
GET /api/stats — Aggregated analytics for dashboard charts.
GET /api/analytics/timeline — Hourly time-series threat count
GET /api/analytics/geo — Geographic threat distribution (simulated)
"""

from datetime import datetime, timedelta, timezone
from collections import Counter
import hashlib

from fastapi import APIRouter, Depends

from app.api.deps import require_auth
from app.db import crud_threats
from app.schemas.stats import StatsResponse
from app.db.models import ThreatEventDocument

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    _api_key: str = Depends(require_auth),
):
    """Get aggregated threat statistics."""
    data = await crud_threats.get_stats_summary()
    return StatsResponse(**data)


@router.get("/analytics/timeline")
async def get_timeline(
    hours: int = 24,
    _api_key: str = Depends(require_auth),
):
    """Get hourly threat counts for the last N hours."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=hours)

    all_docs = await ThreatEventDocument.find(
        ThreatEventDocument.created_at >= cutoff
    ).to_list()

    # Bucket by hour
    hourly = Counter()
    hourly_by_level = {}  # { hour_key: { Safe: n, Suspicious: n, High Risk: n } }

    for doc in all_docs:
        if doc.created_at:
            dt = doc.created_at if doc.created_at.tzinfo else doc.created_at.replace(tzinfo=timezone.utc)
            hour_key = dt.strftime("%Y-%m-%dT%H:00:00Z")
            hourly[hour_key] += 1
            if hour_key not in hourly_by_level:
                hourly_by_level[hour_key] = {"Safe": 0, "Suspicious": 0, "High Risk": 0}
            level = doc.threat_level or "Safe"
            if level in hourly_by_level[hour_key]:
                hourly_by_level[hour_key][level] += 1

    # Build sorted arrays
    timestamps = sorted(hourly.keys())
    return {
        "timestamps": timestamps,
        "counts": [hourly[t] for t in timestamps],
        "by_level": [hourly_by_level.get(t, {"Safe": 0, "Suspicious": 0, "High Risk": 0}) for t in timestamps],
    }


# Simulated geo regions based on threat input hashing
GEO_REGIONS = [
    {"name": "North America", "lat": 39.8, "lng": -98.5},
    {"name": "Europe", "lat": 50.1, "lng": 14.4},
    {"name": "Asia", "lat": 34.0, "lng": 100.6},
    {"name": "South America", "lat": -15.7, "lng": -47.9},
    {"name": "Africa", "lat": 9.1, "lng": 7.5},
    {"name": "Oceania", "lat": -33.8, "lng": 151.2},
    {"name": "Middle East", "lat": 25.2, "lng": 55.3},
    {"name": "Southeast Asia", "lat": 13.7, "lng": 100.5},
]


@router.get("/analytics/geo")
async def get_geo_distribution(
    _api_key: str = Depends(require_auth),
):
    """
    Get geographic distribution of threats.
    Uses deterministic hashing of threat snippets to assign regions consistently.
    """
    all_docs = await ThreatEventDocument.find().to_list()

    region_counts = Counter()
    region_risk = {}  # { region: { total_risk: n, count: n } }

    for doc in all_docs:
        snippet = doc.raw_input_snippet or doc.event_id or ""
        region_idx = int(hashlib.md5(snippet.encode()).hexdigest(), 16) % len(GEO_REGIONS)
        region = GEO_REGIONS[region_idx]
        region_name = region["name"]
        region_counts[region_name] += 1
        if region_name not in region_risk:
            region_risk[region_name] = {"total_risk": 0, "count": 0}
        region_risk[region_name]["total_risk"] += (doc.risk_score or 0)
        region_risk[region_name]["count"] += 1

    # Build response
    regions = []
    for geo in GEO_REGIONS:
        name = geo["name"]
        count = region_counts.get(name, 0)
        avg_risk = 0
        if name in region_risk and region_risk[name]["count"] > 0:
            avg_risk = round(region_risk[name]["total_risk"] / region_risk[name]["count"])
        regions.append({
            "name": name,
            "lat": geo["lat"],
            "lng": geo["lng"],
            "count": count,
            "avg_risk": avg_risk,
        })

    return {"regions": regions, "total": sum(region_counts.values())}

