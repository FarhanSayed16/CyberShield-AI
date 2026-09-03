"""
CyberSentinel AI — Threats Routes
GET /api/threats — Paginated threat history
GET /api/threats/{id} — Single threat detail
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_auth
from app.db import crud_threats
from app.schemas.analyze import AnalyzeResponse
from app.schemas.threats import ThreatListResponse

router = APIRouter()


def _doc_to_response(doc) -> AnalyzeResponse:
    """Convert a ThreatEventDocument to AnalyzeResponse."""
    ext_flags = None
    if doc.external_flags:
        ext_flags = doc.external_flags.model_dump()

    return AnalyzeResponse(
        id=doc.event_id,
        type=doc.type,
        source=doc.source,
        raw_input_snippet=doc.raw_input_snippet,
        threat_type=doc.threat_type,
        risk_score=doc.risk_score,
        threat_level=doc.threat_level,
        confidence=doc.confidence,
        indicators=doc.indicators,
        explanation=doc.explanation,
        key_points=doc.key_points,
        recommended_actions=doc.recommended_actions,
        external_flags=ext_flags,
        severity_label=doc.severity_label,
        advanced_analysis=doc.advanced_analysis,
        created_at=doc.created_at.isoformat(),
    )


@router.get("/threats", response_model=ThreatListResponse)
async def list_threats(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by input type: url, text, prompt, image, video"),
    threat_level: Optional[str] = Query(None, description="Filter by level: Safe, Suspicious, High Risk"),
    threat_type: Optional[str] = Query(None, description="Filter by threat type: phishing, malicious_url, prompt_injection, deepfake, behavior_anomaly, benign"),
    _api_key: str = Depends(require_auth),
):
    """Get paginated threat history with optional filters."""
    items, total = await crud_threats.list_threats(
        page=page,
        page_size=page_size,
        type_filter=type,
        level_filter=threat_level,
        threat_type_filter=threat_type,
    )
    return ThreatListResponse(
        items=[_doc_to_response(doc) for doc in items],
        total=total,
    )


@router.get("/threats/{event_id}", response_model=AnalyzeResponse)
async def get_threat_detail(
    event_id: str,
    _api_key: str = Depends(require_auth),
):
    """Get a single threat event by ID."""
    doc = await crud_threats.get_threat_by_id(event_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Threat event not found")
    return _doc_to_response(doc)

@router.post("/threats/{event_id}/narrative")
async def generate_threat_narrative(
    event_id: str,
    _api_key: str = Depends(require_auth),
):
    """Generate an executive summary narrative for the given threat."""
    doc = await crud_threats.get_threat_by_id(event_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Threat event not found")
        
    from app.clients import gemini_narrative
    
    threat_data = {
        "event_id": doc.event_id,
        "type": doc.type,
        "threat_level": doc.threat_level,
        "risk_score": doc.risk_score,
        "indicators": doc.indicators,
        "explanation": doc.explanation,
        "key_points": doc.key_points,
    }
    
    result = await gemini_narrative.generate(threat_data)
    return {"narrative": result.get("narrative", "")}


@router.get("/threats/{id_1}/compare/{id_2}")
async def compare_threats(
    id_1: str,
    id_2: str,
    _api_key: str = Depends(require_auth),
):
    """Compare two threat events and return a diff."""
    doc1 = await crud_threats.get_threat_by_id(id_1)
    doc2 = await crud_threats.get_threat_by_id(id_2)

    if not doc1 or not doc2:
        raise HTTPException(status_code=404, detail="One or both threats not found")

    # Compute diffs
    score_diff = doc2.risk_score - doc1.risk_score
    level_changed = doc1.threat_level != doc2.threat_level
    
    ind1 = set(doc1.indicators)
    ind2 = set(doc2.indicators)
    added_indicators = list(ind2 - ind1)
    removed_indicators = list(ind1 - ind2)

    return {
        "base": _doc_to_response(doc1),
        "target": _doc_to_response(doc2),
        "diff": {
            "score_change": score_diff,
            "level_changed": level_changed,
            "added_indicators": added_indicators,
            "removed_indicators": removed_indicators,
            "time_elapsed_seconds": (doc2.created_at - doc1.created_at).total_seconds() if doc1.created_at and doc2.created_at else 0
        }
    }
