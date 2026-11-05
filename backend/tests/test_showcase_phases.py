"""P2–P6 checks: demo seed, live push, submit policy, email, Stripe webhook idempotency."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_p2_demo_seed_login(client: AsyncClient):
    from app.scripts.seed_ai_demo import seed_ai_events
    from app.scripts.seed_org import seed

    await seed()
    created = await seed_ai_events()
    assert created >= 1
    assert await seed_ai_events() == 0
    login = await client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "password"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    events = await client.get("/api/events", headers={"Authorization": f"Bearer {token}"})
    assert events.status_code == 200
    assert len(events.json()["events"]) >= 1


@pytest.mark.asyncio
async def test_p3_ingest_broadcasts(client: AsyncClient, org_admin, monkeypatch):
    calls = []

    async def fake_broadcast(message, org_id=None):
        calls.append((message.get("type"), org_id))

    monkeypatch.setattr("app.api.v1.routes_ws.ws_manager.broadcast", fake_broadcast)
    body = {
        "user_token": org_admin["user_token"],
        "platform": "chatgpt",
        "prompt_text": "hello from the showcase test",
        "prompt_length": 28,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "client_submit_id": "p3-broadcast-1",
    }
    r = await client.post("/api/events", json=body, headers={"X-Org-Token": org_admin["org_api_key"]})
    assert r.status_code == 201, r.text
    assert ("ai_event", org_admin["org_id"]) in calls


@pytest.mark.asyncio
async def test_p4_submit_mode_and_outcome(client: AsyncClient, org_admin):
    cache = await client.get("/api/policies/cache", headers={"X-Org-Token": org_admin["org_api_key"]})
    assert cache.status_code == 200
    assert cache.json()["submit_mode"] == "observe"
    assert cache.json()["block_threshold"] == "critical"

    updated = await client.put(
        "/api/org/policies",
        json={"submit_mode": "block", "block_threshold": "high"},
        headers=org_admin["auth"],
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["submit_mode"] == "block"

    bad = await client.put("/api/org/policies", json={"submit_mode": "nope"}, headers=org_admin["auth"])
    assert bad.status_code == 400

    body = {
        "user_token": org_admin["user_token"],
        "platform": "chatgpt",
        "prompt_text": "blocked sample",
        "prompt_length": 14,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "client_submit_id": "p4-outcome-1",
        "enforcement_outcome": "blocked",
    }
    ingested = await client.post("/api/events", json=body, headers={"X-Org-Token": org_admin["org_api_key"]})
    assert ingested.status_code == 201, ingested.text
    listed = await client.get("/api/events", headers=org_admin["auth"])
    match = [e for e in listed.json()["events"] if e["id"] == ingested.json()["event_id"]]
    assert match and match[0]["enforcement_outcome"] == "blocked"


@pytest.mark.asyncio
async def test_p5_critical_email_and_digest(client: AsyncClient, org_admin, monkeypatch):
    sent = []

    async def fake_send(to, subject, text):
        sent.append({"to": to, "subject": subject, "text": text})
        return True

    monkeypatch.setattr("app.services.org_alerts.send_email", fake_send)
    monkeypatch.setattr("app.services.notifier.send_email", fake_send)

    saved = await client.put(
        "/api/org/policies",
        json={"alert_email": "alerts@example.com", "notify_on_critical": True},
        headers=org_admin["auth"],
    )
    assert saved.status_code == 200

    quiet = {
        "user_token": org_admin["user_token"],
        "platform": "chatgpt",
        "prompt_text": "write a unit test for hello world",
        "prompt_length": 34,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "client_submit_id": "p5-quiet",
    }
    q = await client.post("/api/events", json=quiet, headers={"X-Org-Token": org_admin["org_api_key"]})
    assert q.status_code == 201, q.text
    assert sent == []

    risky = {
        "user_token": org_admin["user_token"],
        "platform": "chatgpt",
        "prompt_text": "The key is AKIAIOSFODNN7EXAMPLE",
        "prompt_length": 32,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "client_submit_id": "p5-critical",
    }
    risk = await client.post("/api/events", json=risky, headers={"X-Org-Token": org_admin["org_api_key"]})
    assert risk.status_code == 201, risk.text
    assert risk.json()["risk_level"] == "critical"
    await asyncio.sleep(0.2)
    assert sent and sent[0]["to"] == "alerts@example.com"
    assert "AKIA" not in sent[0]["text"]

    digest = await client.post("/api/admin/digest/send-now", headers=org_admin["auth"])
    assert digest.status_code == 200, digest.text
    assert digest.json()["to"] == "alerts@example.com"
    assert "events" in digest.json()["preview"]


@pytest.mark.asyncio
async def test_p6_expired_plan_blocks_ingest(client: AsyncClient, org_admin):
    from datetime import timedelta

    from app.db.documents_org import Organization

    org = await Organization.get(org_admin["org_id"])
    org.plan = "trial"
    org.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
    await org.save()
    body = {
        "user_token": org_admin["user_token"],
        "platform": "chatgpt",
        "prompt_text": "hello after expiry",
        "prompt_length": 19,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "client_submit_id": "p6-expired",
    }
    r = await client.post("/api/events", json=body, headers={"X-Org-Token": org_admin["org_api_key"]})
    assert r.status_code == 402, r.text
    assert "expired" in r.text.lower()


@pytest.mark.asyncio
async def test_p6_webhook_idempotent(client: AsyncClient, org_admin):
    from app.core.config import settings

    previous_key = settings.STRIPE_SECRET_KEY
    previous_secret = settings.STRIPE_WEBHOOK_SECRET
    settings.STRIPE_SECRET_KEY = "sk_test_showcase"
    settings.STRIPE_WEBHOOK_SECRET = ""
    payload = {
        "id": "evt_showcase_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "metadata": {"org_id": org_admin["org_id"]},
                "customer": "cus_showcase",
                "subscription": "sub_showcase",
            }
        },
    }
    raw = json.dumps(payload).encode()
    try:
        first = await client.post("/api/billing/webhook", content=raw, headers={"content-type": "application/json"})
        assert first.status_code == 200, first.text
        assert first.json()["handled"] is True
        second = await client.post("/api/billing/webhook", content=raw, headers={"content-type": "application/json"})
        assert second.status_code == 200, second.text
        assert second.json().get("duplicate") is True
    finally:
        settings.STRIPE_SECRET_KEY = previous_key
        settings.STRIPE_WEBHOOK_SECRET = previous_secret
