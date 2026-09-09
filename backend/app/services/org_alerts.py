from app.db.documents_org import Alert, Event, User


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
    alert = Alert(
        org_id=event.org_id,
        event_id=event.id,
        user_id=event.user_id,
        alert_type=alert_type,
        severity=severity,
        title=f"Risky content sent to {event.platform}",
        description=f"{user_name}: {reasons}",
        status="open",
    )
    await alert.insert()
    return alert
