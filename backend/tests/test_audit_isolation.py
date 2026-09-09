"""Isolation, quota, and billing hardening tests (audit Wave 1–2)."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_stats_are_org_scoped(client: AsyncClient, org_admin):
    # Org A analyzes
    a = await client.post(
        "/api/analyze",
        json={"type": "url", "content": "https://example.com/a-org", "source": "dashboard"},
        headers=org_admin["auth"],
    )
    assert a.status_code == 200, a.text

    # Org B
    suffix = uuid.uuid4().hex[:8]
    b_signup = await client.post(
        "/api/auth/signup",
        json={
            "name": "B Admin",
            "email": f"b_{suffix}@phase6.example.com",
            "password": "password123",
            "org_name": f"Org B {suffix}",
        },
    )
    assert b_signup.status_code == 201
    b_auth = {"Authorization": f"Bearer {b_signup.json()['access_token']}"}
    await client.post(
        "/api/analyze",
        json={"type": "url", "content": "https://example.com/b-org", "source": "dashboard"},
        headers=b_auth,
    )

    sa = await client.get("/api/stats", headers=org_admin["auth"])
    sb = await client.get("/api/stats", headers=b_auth)
    assert sa.status_code == 200 and sb.status_code == 200
    # Each org should only see its own count (at least 1 each, not sum of both)
    assert sa.json()["total_threats"] >= 1
    assert sb.json()["total_threats"] >= 1
    # Cross-check: A list must not include B's URL snippet
    la = await client.get("/api/threats?page_size=50", headers=org_admin["auth"])
    snippets = " ".join(i.get("raw_input_snippet") or "" for i in la.json()["items"])
    assert "b-org" not in snippets


@pytest.mark.asyncio
async def test_api_key_cannot_list_threats(api_client: AsyncClient):
    r = await api_client.get("/api/threats")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_analyze_quota_429(client: AsyncClient, org_admin):
    from app.db.documents_org import Organization
    from beanie import PydanticObjectId

    org = await Organization.get(PydanticObjectId(org_admin["org_id"]))
    org.plan = "free"
    org.seat_limit = 10
    await org.save()

    # free plan analyzes_per_day = 20 — burn quota with batch
    urls = [f"https://example.com/q/{i}" for i in range(25)]
    r = await client.post(
        "/api/analyze/batch",
        json={"urls": urls, "source": "dashboard"},
        headers=org_admin["auth"],
    )
    assert r.status_code == 429, r.text
    detail = r.json().get("detail") or {}
    err = detail.get("error") if isinstance(detail, dict) else {}
    assert err.get("code") == "QUOTA_ANALYZES"


@pytest.mark.asyncio
async def test_dev_activate_requires_flag(client: AsyncClient, org_admin, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ALLOW_DEV_BILLING", False)
    r = await client.post(
        "/api/billing/dev-activate",
        json={"plan": "starter"},
        headers=org_admin["auth"],
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_rules_org_scoped(client: AsyncClient, org_admin):
    create = await client.post(
        "/api/rules/",
        json={
            "name": "Block evil",
            "is_active": True,
            "condition": {"field": "domain", "operator": "contains", "value": "evil"},
            "action": {"override_level": "High Risk", "add_indicator": "custom-rule"},
        },
        headers=org_admin["auth"],
    )
    assert create.status_code == 200, create.text
    listed = await client.get("/api/rules/", headers=org_admin["auth"])
    assert listed.status_code == 200
    assert any(r["name"] == "Block evil" for r in listed.json())

    suffix = uuid.uuid4().hex[:8]
    other = await client.post(
        "/api/auth/signup",
        json={
            "name": "Other",
            "email": f"o_{suffix}@phase6.example.com",
            "password": "password123",
            "org_name": f"Other {suffix}",
        },
    )
    other_auth = {"Authorization": f"Bearer {other.json()['access_token']}"}
    other_list = await client.get("/api/rules/", headers=other_auth)
    assert other_list.status_code == 200
    assert all(r["name"] != "Block evil" for r in other_list.json())
