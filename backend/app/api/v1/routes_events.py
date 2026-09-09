from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user, get_org_from_header
from app.db.documents_org import DLPFinding, DLPCustomPattern, Event, Organization, User
from app.schemas.ai_guard import EventIngestRequest, EventResponseUpdate, EventStatusUpdate
from app.api.v1.serializers_org import event_list_item
from app.services.org_alerts import create_alert_for_event
from app.services.dlp import scan_prompt
from app.services.hybrid_dlp import merge_hybrid_scan
from app.services.redis_client import check_rate_limit
from app.services.plans import assert_event_quota

router = APIRouter()


async def _ingest_event(org: Organization, user: User, body: EventIngestRequest) -> dict:
    await assert_event_quota(org)

    if body.client_submit_id:
        existing = await Event.find_one(
            Event.org_id == org.id,
            Event.user_id == user.id,
            Event.client_submit_id == body.client_submit_id,
        )
        if existing:
            return {
                "event_id": str(existing.id),
                "duplicate": True,
                "status": existing.status,
                "risk_score": existing.risk_score,
                "risk_level": existing.risk_level,
                "risk_reasons": existing.risk_reasons or [],
                "findings_count": 0,
                "has_critical": existing.has_critical,
                "alert_id": None,
            }

    custom = await DLPCustomPattern.find(
        DLPCustomPattern.org_id == org.id,
        DLPCustomPattern.is_active == True,
    ).to_list()
    custom_rules = [(p.name, p.pattern, p.severity) for p in custom]
    scan = scan_prompt(body.prompt_text, custom_rules)
    lineage_label = None
    if body.clipboard_lineage and body.clipboard_lineage.status == "resolved":
        lineage_label = body.clipboard_lineage.sensitivity_label
    scan = merge_hybrid_scan(
        scan,
        client_score=body.client_risk_score,
        client_level=body.client_risk_level,
        lineage_label=lineage_label,
    )

    status = "flagged" if scan.risk_level in ("medium", "high", "critical") else "clean"
    jit_dict = body.jit_decision.model_dump() if body.jit_decision else None
    lineage_dict = body.clipboard_lineage.model_dump() if body.clipboard_lineage else None

    event = Event(
        org_id=org.id,
        user_id=user.id,
        source=body.source,
        platform=body.platform_detected or body.platform,
        page_url=body.page_url,
        page_title=body.page_title,
        prompt_text=body.prompt_text,
        prompt_length=body.prompt_length,
        session_id=body.session_id,
        event_type=body.event_type or "prompt_submit",
        activity_log=body.activity_log or [],
        risk_score=scan.risk_score,
        risk_level=scan.risk_level,
        risk_reasons=scan.risk_reasons,
        dlp_categories=scan.categories,
        has_critical=scan.has_critical,
        status=status,
        was_anonymized=body.was_anonymized,
        token_map_id=body.token_map_id,
        client_risk_score=body.client_risk_score,
        client_risk_level=body.client_risk_level,
        client_model_version=body.client_model_version,
        client_timing_ms=body.client_timing_ms,
        platform_detected=body.platform_detected,
        shadow_ai_confidence=body.shadow_ai_confidence,
        clipboard_lineage=lineage_dict,
        jit_decision=jit_dict,
        client_submit_id=body.client_submit_id,
        captured_at=body.captured_at,
    )
    await event.insert()

    for f in scan.findings:
        await DLPFinding(
            event_id=event.id,
            org_id=org.id,
            finding_type=f.type,
            severity=f.severity,
            offset_start=f.offset_start,
            matched_length=f.matched_length,
            redacted_value=f.redacted_value,
        ).insert()

    alert = await create_alert_for_event(event, user)
    return {
        "event_id": str(event.id),
        "status": event.status,
        "risk_score": event.risk_score,
        "risk_level": scan.risk_level,
        "risk_reasons": scan.risk_reasons,
        "findings_count": len(scan.findings),
        "has_critical": event.has_critical,
        "alert_id": str(alert.id) if alert else None,
    }


@router.post("", status_code=201)
async def ingest_event(
    body: EventIngestRequest,
    org: Organization = Depends(get_org_from_header),
):
    if not await check_rate_limit(f"ratelimit:events:{org.id}", 600):
        raise HTTPException(status_code=429, detail={"error": {"code": "RATE_LIMITED", "message": "Too many events"}})

    user = await User.find_one(User.user_token == body.user_token, User.org_id == org.id)
    if not user:
        raise HTTPException(status_code=401, detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid user token"}})

    user.last_active_at = datetime.utcnow()
    await user.save()
    return await _ingest_event(org, user, body)


@router.get("")
async def list_events(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    min_risk: Optional[int] = None,
    has_critical: Optional[bool] = None,
    current: User = Depends(get_current_user),
):
    query = Event.find(Event.org_id == current.org_id)
    if current.role == "employee":
        query = query.find(Event.user_id == current.id)
    elif user_id:
        query = query.find(Event.user_id == PydanticObjectId(user_id))
    if platform:
        query = query.find(Event.platform == platform)
    if status:
        query = query.find(Event.status == status)
    if min_risk is not None:
        query = query.find(Event.risk_score >= min_risk)
    if has_critical is not None:
        query = query.find(Event.has_critical == has_critical)

    total = await query.count()
    events = await query.sort(-Event.captured_at).skip((page - 1) * per_page).limit(per_page).to_list()

    items = []
    reveal = current.role in ("admin", "manager")
    for e in events:
        u = await User.get(e.user_id) if e.user_id else None
        items.append(event_list_item(e, u, reveal_prompt=reveal))

    pages = max(1, (total + per_page - 1) // per_page)
    return {"events": items, "pagination": {"page": page, "per_page": per_page, "total": total, "pages": pages}}


@router.get("/{event_id}")
async def get_event(event_id: str, current: User = Depends(get_current_user)):
    try:
        e = await Event.get(PydanticObjectId(event_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})
    if not e or e.org_id != current.org_id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})
    if current.role == "employee" and e.user_id != current.id:
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}})

    u = await User.get(e.user_id) if e.user_id else None
    findings = await DLPFinding.find(DLPFinding.event_id == e.id).to_list()
    reveal = current.role in ("admin", "manager") or (
        current.role == "employee" and e.user_id == current.id
    )
    return {
        **event_list_item(e, u, reveal_prompt=reveal),
        "findings": [
            {
                "finding_type": f.finding_type,
                "severity": f.severity,
                "offset_start": f.offset_start,
                "matched_length": f.matched_length,
                "redacted_value": f.redacted_value,
            }
            for f in findings
        ],
    }


@router.patch("/{event_id}/response")
async def update_event_response(
    event_id: str,
    body: EventResponseUpdate,
    org: Organization = Depends(get_org_from_header),
):
    user = await User.find_one(User.user_token == body.user_token, User.org_id == org.id)
    if not user:
        raise HTTPException(status_code=401, detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid user token"}})
    try:
        e = await Event.get(PydanticObjectId(event_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})
    if not e or e.org_id != org.id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})

    custom = await DLPCustomPattern.find(
        DLPCustomPattern.org_id == org.id,
        DLPCustomPattern.is_active == True,
    ).to_list()
    custom_rules = [(p.name, p.pattern, p.severity) for p in custom]
    scan = scan_prompt(body.response_text, custom_rules)

    e.response_text = body.response_text[:50000]
    e.response_risk_level = scan.risk_level
    e.response_risk_reasons = scan.risk_reasons
    e.response_scanned_at = datetime.utcnow()
    log = list(e.activity_log or [])
    log.append(
        {
            "action": "ai_response",
            "detail": f"AI response scanned — risk {scan.risk_level}",
            "at": datetime.utcnow().isoformat(),
        }
    )
    e.activity_log = log[-30:]

    level_rank = {"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    if level_rank.get(scan.risk_level, 0) > level_rank.get(e.risk_level, 0):
        e.risk_level = scan.risk_level
        e.risk_score = max(e.risk_score, scan.risk_score)
        e.risk_reasons = list(
            dict.fromkeys((e.risk_reasons or []) + [f"AI response: {r}" for r in scan.risk_reasons])
        )[:10]
        if scan.risk_level in ("medium", "high", "critical"):
            e.status = "flagged"

    await e.save()
    return {
        "event_id": str(e.id),
        "response_risk_level": scan.risk_level,
        "response_risk_reasons": scan.risk_reasons,
        "event_risk_level": e.risk_level,
    }


@router.patch("/{event_id}/status")
async def update_event_status(
    event_id: str,
    body: EventStatusUpdate,
    current: User = Depends(get_current_user),
):
    if current.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}})
    try:
        e = await Event.get(PydanticObjectId(event_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})
    if not e or e.org_id != current.org_id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Event not found"}})
    e.status = body.status
    await e.save()
    u = await User.get(e.user_id) if e.user_id else None
    return event_list_item(e, u)
