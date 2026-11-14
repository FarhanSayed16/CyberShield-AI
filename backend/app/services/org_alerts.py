import asyncio

from loguru import logger

from app.core.config import settings
from app.db.documents_org import Alert, Event, Organization, User
from app.services.notifier import allow_send, send_email


async def create_alert_for_event(event: Event, user: User | None) -> Alert | None:
    # Only alert on meaningful risk — not normal prompts
    if event.risk_level not in ("medium", "high", "critical") and not event.has_critical:
        return None
    if event.risk_level == "low":
        return None

    severity = "CRITICAL" if event.has_critical or event.risk_level == "critical" else (
        "HIGH" if event.risk_level == "high" else "MEDIUM"
    )
    user_name = user.name if user else "Unknown user"
    alert_type = "DLP_CRITICAL" if event.has_critical else "DLP_SENSITIVE"

    reasons = "; ".join((event.risk_reasons or [])[:3]) or "Sensitive content detected"
    title = f"Risky content sent to {event.platform}"
    if event.enforcement_outcome == "blocked":
        title = f"Blocked: {title}"
    alert = Alert(
        org_id=event.org_id,
        event_id=event.id,
        user_id=event.user_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=f"{user_name}: {reasons}",
        status="open",
    )
    await alert.insert()
    try:
        from app.api.v1.routes_ws import ws_manager
        from app.api.v1.serializers_org import alert_public

        await ws_manager.broadcast(
            {"type": "ai_alert", "data": alert_public(alert, user)},
            org_id=str(event.org_id),
        )
    except Exception as exc:
        logger.warning(f"alert push skipped: {exc}")
    if severity in ("HIGH", "CRITICAL"):
        asyncio.create_task(_maybe_email(alert, user_name, reasons))
    return alert


async def _maybe_email(alert: Alert, user_name: str, reasons: str) -> None:
    try:
        org = await Organization.get(alert.org_id)
        if not org:
            return
        s = org.settings or {}
        if not s.get("notify_on_critical", True):
            return
        to = (s.get("alert_email") or "").strip()
        if not to or not allow_send(str(org.id), alert.alert_type):
            return
        base = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
        text = (
            f"{alert.title}\n"
            f"Employee: {user_name}\n"
            f"Severity: {alert.severity}\n"
            f"Reasons: {reasons}\n"
            f"Open alerts: {base}/ai/alerts\n"
        )
        await send_email(to, f"CyberSentinel {alert.severity}: {alert.title}", text)
    except Exception as exc:
        logger.warning(f"alert email skipped: {exc}")
