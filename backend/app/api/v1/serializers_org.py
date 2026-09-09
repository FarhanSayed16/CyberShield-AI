from app.db.documents_org import Alert, Event, User

PLATFORM_LABELS = {
    "chatgpt": "ChatGPT",
    "claude": "Claude",
    "gemini": "Google Gemini",
    "copilot": "Microsoft Copilot",
    "openai_api": "OpenAI API",
}


def user_public(u: User) -> dict:
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "org_id": str(u.org_id),
        "user_token": u.user_token,
        "status": u.status,
    }


def org_public(o) -> dict:
    return {
        "id": str(o.id),
        "name": o.name,
        "slug": o.slug,
        "org_api_key": o.org_api_key,
        "plan": o.plan,
        "trial_ends_at": o.trial_ends_at.isoformat() if getattr(o, "trial_ends_at", None) else None,
        "stripe_customer_id": getattr(o, "stripe_customer_id", None),
        "settings": o.settings,
    }


def _monitoring_label(e: Event) -> str:
    platform = PLATFORM_LABELS.get(e.platform, e.platform)
    title = e.page_title or "AI chat session"
    return f"{platform} — {title}"


def event_list_item(e: Event, user: User | None, *, reveal_prompt: bool = False) -> dict:
    preview_len = 280
    preview = e.prompt_text[:preview_len] + ("..." if len(e.prompt_text) > preview_len else "")
    item = {
        "id": str(e.id),
        "user": {"id": str(user.id), "name": user.name, "email": user.email} if user else None,
        "platform": e.platform,
        "platform_label": PLATFORM_LABELS.get(e.platform, e.platform),
        "source": e.source,
        "event_type": e.event_type,
        "monitoring_label": _monitoring_label(e),
        "page_url": e.page_url,
        "page_title": e.page_title,
        "prompt_preview": preview,
        "prompt_length": e.prompt_length,
        "risk_score": e.risk_score,
        "risk_level": e.risk_level,
        "risk_reasons": e.risk_reasons or [],
        "dlp_categories": e.dlp_categories,
        "has_critical": e.has_critical,
        "status": e.status,
        "activity_log": e.activity_log or [],
        "activity_count": len(e.activity_log or []),
        "captured_at": e.captured_at.isoformat(),
        "was_anonymized": e.was_anonymized,
        "client_risk_score": e.client_risk_score,
        "client_risk_level": e.client_risk_level,
        "shadow_ai_confidence": e.shadow_ai_confidence,
        "clipboard_lineage": e.clipboard_lineage,
        "jit_decision": e.jit_decision,
        "has_jit_decision": bool(e.jit_decision and e.jit_decision.get("triggered")),
        "response_risk_level": e.response_risk_level,
        "response_risk_reasons": e.response_risk_reasons or [],
        "response_scanned_at": e.response_scanned_at.isoformat() if e.response_scanned_at else None,
    }
    if reveal_prompt:
        item["prompt_text"] = e.prompt_text
        item["response_text"] = e.response_text
    else:
        item["prompt_text"] = None
        item["response_text"] = None
    return item


def alert_public(a: Alert, user: User | None = None) -> dict:
    return {
        "id": str(a.id),
        "alert_type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "description": a.description,
        "user": {"id": str(user.id), "name": user.name} if user else None,
        "event_id": str(a.event_id) if a.event_id else None,
        "status": a.status,
        "created_at": a.created_at.isoformat(),
    }
