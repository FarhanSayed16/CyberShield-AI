from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_manager_or_admin
from app.db.documents_org import Alert, EnforcementAction, User
from app.schemas.ai_guard import AlertStatusUpdate
from app.api.v1.serializers_org import alert_public

router = APIRouter()


@router.get("")
async def list_alerts(
    status: str | None = None,
    severity: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current: User = Depends(require_manager_or_admin),
):
    query = Alert.find(Alert.org_id == current.org_id)
    if status:
        query = query.find(Alert.status == status)
    if severity:
        query = query.find(Alert.severity == severity)

    total = await query.count()
    alerts = await query.sort(-Alert.created_at).skip((page - 1) * per_page).limit(per_page).to_list()

    items = []
    for a in alerts:
        u = await User.get(a.user_id) if a.user_id else None
        items.append(alert_public(a, u))

    open_count = await Alert.find(Alert.org_id == current.org_id, Alert.status == "open").count()
    critical_open = await Alert.find(
        Alert.org_id == current.org_id,
        Alert.status == "open",
        Alert.severity == "CRITICAL",
    ).count()

    return {
        "alerts": items,
        "counts": {"open": open_count, "critical_open": critical_open},
        "pagination": {"page": page, "per_page": per_page, "total": total},
    }


@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str,
    body: AlertStatusUpdate,
    current: User = Depends(require_manager_or_admin),
):
    try:
        a = await Alert.get(PydanticObjectId(alert_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Alert not found"}})
    if not a or a.org_id != current.org_id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Alert not found"}})
    a.status = body.status
    if body.status == "acknowledged":
        a.acknowledged_by = current.id
        a.acknowledged_at = datetime.utcnow()
        if body.enforcement_action and body.enforcement_action in ("close_ai_tabs", "blackout_screen") and a.user_id:
            await EnforcementAction(
                org_id=current.org_id,
                user_id=a.user_id,
                alert_id=a.id,
                action=body.enforcement_action,
                created_by=current.id,
            ).insert()
    await a.save()
    u = await User.get(a.user_id) if a.user_id else None
    return alert_public(a, u)
