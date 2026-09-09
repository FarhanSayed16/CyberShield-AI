"""
CyberSentinel AI — CRUD Operations for Threat Events
Reusable DB access functions for routes.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel

from loguru import logger
from fastapi import HTTPException
from pymongo.errors import PyMongoError

from app.db.models import ThreatEventDocument, ExternalFlagsEmbed
from collections import Counter

from app.api.v1.routes_ws import ws_manager

def _normalize_external_flags(flags) -> Optional[dict]:
    """Accept dict or Pydantic model; return plain dict for ExternalFlagsEmbed."""
    if flags is None:
        return None
    if hasattr(flags, "model_dump"):
        return flags.model_dump()
    if isinstance(flags, dict):
        return flags
    return None


async def create_threat_event(data: dict) -> ThreatEventDocument:
    """Create and save a new threat event document."""
    # Build external flags embed if present
    ext_flags = None
    raw_flags = _normalize_external_flags(data.get("external_flags"))
    if raw_flags:
        ext_flags = ExternalFlagsEmbed(**raw_flags)

    doc = ThreatEventDocument(
        type=data["type"],
        source=data["source"],
        raw_input_snippet=data.get("raw_input_snippet", ""),
        threat_type=data["threat_type"],
        risk_score=data["risk_score"],
        threat_level=data["threat_level"],
        confidence=data["confidence"],
        indicators=data.get("indicators", []),
        explanation=data.get("explanation", ""),
        key_points=data.get("key_points", []),
        recommended_actions=data.get("recommended_actions", []),
        external_flags=ext_flags,
        severity_label=data.get("severity_label", "Informational"),
        advanced_analysis=data.get("advanced_analysis", None),
        org_id=data.get("org_id"),
        user_id=data.get("user_id"),
    )
    try:
        await doc.insert()
        logger.info(f"Threat event created: {doc.event_id} | type={doc.threat_type} score={doc.risk_score}")
        
        # Broadcast only to the owning org's WebSocket room
        try:
            await ws_manager.broadcast(
                {
                    "type": "new_threat",
                    "payload": {
                        "event_id": doc.event_id,
                        "org_id": doc.org_id,
                        "threat_type": doc.threat_type,
                        "threat_level": doc.threat_level,
                        "risk_score": doc.risk_score,
                        "explanation": doc.explanation,
                        "created_at": str(doc.created_at),
                    },
                },
                org_id=doc.org_id,
            )
        except Exception as ws_err:
            logger.warning(f"WebSocket broadcast failed (non-critical): {ws_err}")
        
    except PyMongoError as e:
        logger.error(f"Failed to persist threat event to DB: {e}")
        raise HTTPException(status_code=503, detail="Database currently unavailable") from e
        
    return doc


async def list_threats(
    page: int = 1,
    page_size: int = 20,
    type_filter: Optional[str] = None,
    level_filter: Optional[str] = None,
    threat_type_filter: Optional[str] = None,
    org_id: Optional[str] = None,
) -> tuple[list[ThreatEventDocument], int]:
    """List threat events with pagination and optional filters."""
    query = {}
    if type_filter:
        query["type"] = type_filter
    if level_filter:
        query["threat_level"] = level_filter
    if threat_type_filter:
        query["threat_type"] = threat_type_filter
    if org_id:
        query["org_id"] = org_id

    try:
        total = await ThreatEventDocument.find(query).count()
        skip = (page - 1) * page_size
        items = (
            await ThreatEventDocument.find(query)
            .sort(-ThreatEventDocument.created_at)
            .skip(skip)
            .limit(page_size)
            .to_list()
        )
        return items, total
    except PyMongoError as e:
        logger.error(f"MongoDB error in list_threats: {e}")
        raise HTTPException(status_code=503, detail="Database currently unavailable")


async def get_threat_by_id(event_id: str) -> Optional[ThreatEventDocument]:
    """Get a single threat event by its event_id."""
    try:
        return await ThreatEventDocument.find_one(
            ThreatEventDocument.event_id == event_id
        )
    except PyMongoError as e:
        logger.error(f"MongoDB error in get_threat_by_id: {e}")
        raise HTTPException(status_code=503, detail="Database currently unavailable")


class ThreatProjection(BaseModel):
    type: str
    threat_level: str
    created_at: datetime

async def get_stats_summary(org_id: Optional[str] = None) -> dict:
    """Aggregate stats for the dashboard (org-scoped when org_id set)."""
    try:
        query: dict = {}
        if org_id:
            query["org_id"] = org_id

        # Fetch only required fields for python-side aggregation
        # Bypasses Beanie 2.0 .aggregate() LatentCommandCursor unawaitable bug
        all_docs = await ThreatEventDocument.find(query).project(ThreatProjection).to_list()
        total = len(all_docs)

        by_type_counter = Counter(doc.type for doc in all_docs if doc.type)
        by_level_counter = Counter(doc.threat_level for doc in all_docs if doc.threat_level)

        by_type = dict(by_type_counter)
        by_level = {
            "Safe": by_level_counter.get("Safe", 0),
            "Suspicious": by_level_counter.get("Suspicious", 0),
            "High Risk": by_level_counter.get("High Risk", 0),
        }

        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)

        hourly_counts = Counter()
        for doc in all_docs:
            if doc.created_at:
                doc_dt = doc.created_at if doc.created_at.tzinfo else doc.created_at.replace(tzinfo=timezone.utc)
                if doc_dt >= last_24h:
                    hour_key = doc_dt.strftime("%Y-%m-%dT%H:00:00Z")
                    hourly_counts[hour_key] += 1

        timestamps = sorted(hourly_counts.keys())
        counts = [hourly_counts[t] for t in timestamps]

        return {
            "total_threats": total,
            "by_type": by_type,
            "by_level": by_level,
            "last_24h": {"timestamps": timestamps, "counts": counts},
        }
    except PyMongoError as e:
        logger.error(f"MongoDB error in get_stats_summary: {e}")
        raise HTTPException(status_code=503, detail="Database currently unavailable")
