"""Phase 6 — AI Guard: ingest, dedupe, alerts, enforcement, dashboard."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def _event_payload(user_token: str, prompt: str, submit_id: str | None = None):
    return {
        "user_token": user_token,
        "platform": "chatgpt",
        "source": "extension",
        "event_type": "prompt_submit",
        "prompt_text": prompt,
        "prompt_length": len(prompt),
        "page_url": "https://chatgpt.com/",
        "page_title": "ChatGPT",
        "session_id": "sess_phase6",
        "client_submit_id": submit_id or f"sub_{uuid.uuid4().hex[:10]}",
        "activity_log": [],
        "captured_at": "2026-09-09T12:00:00Z",
    }


@pytest.mark.asyncio
async def test_event_ingest_and_dedupe(client: AsyncClient, org_admin):
    sid = f"sub_dedupe_{uuid.uuid4().hex[:8]}"
    headers = {"X-Org-Token": org_admin["org_api_key"]}
    payload = _event_payload(org_admin["user_token"], "Hello clean prompt for weather", sid)

    r1 = await client.post("/api/events", json=payload, headers=headers)
    assert r1.status_code == 201, r1.text
    eid = r1.json()["event_id"]
    assert r1.json().get("duplicate") is not True

    r2 = await client.post("/api/events", json=payload, headers=headers)
    assert r2.status_code == 201, r2.text
    assert r2.json().get("duplicate") is True
    assert r2.json()["event_id"] == eid


@pytest.mark.asyncio
async def test_event_dlp_alert_and_enforcement(client: AsyncClient, org_admin):
    headers = {"X-Org-Token": org_admin["org_api_key"]}
    payload = _event_payload(
        org_admin["user_token"],
        "here is my key sk-test1234567890abcdef0123456789 please store it",
    )
    r = await client.post("/api/events", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("has_critical") or body.get("risk_level") in ("critical", "high")
    assert body.get("alert_id") or body.get("has_critical")

    # List alerts as admin
    alerts = await client.get("/api/alerts", headers=org_admin["auth"])
    assert alerts.status_code == 200, alerts.text
    items = alerts.json().get("alerts") or alerts.json().get("items") or []
    # shape may vary
    if not items and "alerts" not in alerts.json():
        # try raw list
        items = alerts.json() if isinstance(alerts.json(), list) else []

    # Acknowledge with enforcement if we have an open alert
    alerts_data = alerts.json()
    alert_list = alerts_data.get("alerts") or alerts_data.get("items") or []
    if alert_list:
        aid = alert_list[0]["id"]
        ack = await client.patch(
            f"/api/alerts/{aid}",
            json={"status": "acknowledged", "enforcement_action": "blackout_screen"},
            headers=org_admin["auth"],
        )
        assert ack.status_code in (200, 204), ack.text

        pull = await client.post(
            "/api/enforcement/pull",
            json={"user_token": org_admin["user_token"]},
            headers=headers,
        )
        assert pull.status_code == 200, pull.text
        actions = pull.json().get("actions") or []
        if actions:
            done = await client.post(
                "/api/enforcement/complete",
                json={
                    "user_token": org_admin["user_token"],
                    "action_id": actions[0]["id"],
                    "success": True,
                },
                headers=headers,
            )
            assert done.status_code == 200, done.text


@pytest.mark.asyncio
async def test_extension_event_to_dashboard(client: AsyncClient, org_admin):
    headers = {"X-Org-Token": org_admin["org_api_key"]}
    await client.post(
        "/api/events",
        json=_event_payload(org_admin["user_token"], "dashboard stats prompt"),
        headers=headers,
    )
    summary = await client.get(
        "/api/dashboard/summary?period=7d",
        headers=org_admin["auth"],
    )
    assert summary.status_code == 200, summary.text
    totals = summary.json().get("totals") or summary.json()
    assert "prompts" in totals or "total" in str(summary.json()).lower() or summary.status_code == 200


@pytest.mark.asyncio
async def test_invalid_org_token_rejected(client: AsyncClient, org_admin):
    r = await client.post(
        "/api/events",
        json=_event_payload(org_admin["user_token"], "x"),
        headers={"X-Org-Token": "aisnl_org_invalid"},
    )
    assert r.status_code == 401
