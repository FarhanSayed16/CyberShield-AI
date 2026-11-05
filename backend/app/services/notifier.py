"""Email alerts. console logs; smtp uses the stdlib client. Never raises to callers."""

from __future__ import annotations

import asyncio
import smtplib
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from loguru import logger

from app.core.config import settings

_last_sent: dict[str, float] = {}


def allow_send(org_id: str, alert_type: str, window_s: float = 60) -> bool:
    key = f"{org_id}:{alert_type}"
    now = time.time()
    if now - _last_sent.get(key, 0) < window_s:
        return False
    _last_sent[key] = now
    return True


def _send_sync(to: str, subject: str, text: str) -> None:
    backend = (settings.EMAIL_BACKEND or "console").strip().lower()
    if backend != "smtp":
        logger.info(f"[email:console] to={to} subject={subject}\n{text}")
        return
    host = (settings.SMTP_HOST or "").strip()
    if not host:
        logger.warning("[email:smtp] SMTP_HOST empty — message not sent")
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = (settings.SMTP_FROM or settings.SMTP_USER or "cybersentinel@localhost").strip()
    msg["To"] = to
    msg.set_content(text)
    with smtplib.SMTP(host, int(settings.SMTP_PORT or 587), timeout=20) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
        smtp.send_message(msg)


async def send_email(to: str, subject: str, text: str) -> bool:
    if not to:
        return False
    try:
        await asyncio.to_thread(_send_sync, to, subject, text)
        return True
    except Exception as exc:
        logger.warning(f"email send failed: {exc}")
        return False


async def build_digest(org) -> dict:
    from beanie import PydanticObjectId

    from app.db.documents_org import Alert, Event, User

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    events = await Event.find(Event.org_id == org.id, Event.captured_at >= since).to_list()
    by_risk: dict[str, int] = {}
    by_user: dict[str, int] = {}
    for e in events:
        by_risk[e.risk_level or "none"] = by_risk.get(e.risk_level or "none", 0) + 1
        if e.user_id:
            by_user[str(e.user_id)] = by_user.get(str(e.user_id), 0) + 1
    open_alerts = await Alert.find(Alert.org_id == org.id, Alert.status == "open").count()
    top = sorted(by_user.items(), key=lambda x: -x[1])[:5]
    names = []
    for uid, count in top:
        try:
            user = await User.get(PydanticObjectId(uid))
        except Exception:
            user = None
        names.append({"name": user.name if user else uid, "events": count})
    return {
        "org": org.name,
        "window_hours": 24,
        "events": len(events),
        "by_risk": by_risk,
        "open_alerts": open_alerts,
        "top_users": names,
    }


def digest_text(preview: dict) -> str:
    lines = [
        f"CyberSentinel daily digest — {preview.get('org')}",
        f"Events in the last {preview.get('window_hours')}h: {preview.get('events')}",
        f"Open alerts: {preview.get('open_alerts')}",
        f"By risk: {preview.get('by_risk')}",
    ]
    for row in preview.get("top_users") or []:
        lines.append(f"- {row['name']}: {row['events']} events")
    base = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    lines.append(f"Dashboard: {base}/ai")
    return "\n".join(lines)


async def digest_loop() -> None:
    from app.db.documents_org import Organization

    while True:
        await asyncio.sleep(3600)
        if not settings.DIGEST_ENABLED:
            continue
        if datetime.now(timezone.utc).hour != int(settings.DIGEST_HOUR_UTC):
            continue
        today = datetime.now(timezone.utc).date().isoformat()
        orgs = await Organization.find_all().to_list()
        for org in orgs:
            s = org.settings or {}
            if not s.get("daily_digest") or not s.get("alert_email"):
                continue
            if s.get("last_digest_at") == today:
                continue
            preview = await build_digest(org)
            ok = await send_email(s["alert_email"], f"CyberSentinel digest — {org.name}", digest_text(preview))
            if ok:
                org.settings = {**s, "last_digest_at": today}
                await org.save()
