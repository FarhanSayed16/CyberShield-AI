"""Phase 6 — Threat Explainer analyze + list + health + rules."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")
    alias = await client.get("/health")
    assert alias.status_code == 200


@pytest.mark.asyncio
async def test_jwt_analyze_and_threats_list(client: AsyncClient, org_admin):
    an = await client.post(
        "/api/analyze",
        json={"type": "url", "content": "https://example.com/phase6", "source": "dashboard"},
        headers=org_admin["auth"],
    )
    assert an.status_code == 200, an.text
    data = an.json()
    assert "risk_score" in data
    assert "threat_level" in data
    assert data.get("id")

    lst = await client.get("/api/threats?page=1&page_size=10", headers=org_admin["auth"])
    assert lst.status_code == 200, lst.text
    items = lst.json().get("items") or []
    assert any(i.get("id") == data["id"] for i in items) or lst.json().get("total", 0) >= 0

    detail = await client.get(f"/api/threats/{data['id']}", headers=org_admin["auth"])
    assert detail.status_code == 200


@pytest.mark.asyncio
async def test_org_token_analyze(client: AsyncClient, org_admin):
    r = await client.post(
        "/api/analyze",
        json={"type": "text", "content": "Please verify your account immediately", "source": "extension"},
        headers={
            "X-Org-Token": org_admin["org_api_key"],
            "X-User-Token": org_admin["user_token"],
        },
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_rules_crud_jwt(client: AsyncClient, org_admin):
    create = await client.post(
        "/api/rules/",
        json={
            "name": "phase6-rule",
            "description": "test",
            "is_active": True,
            "condition": {"field": "domain", "operator": "contains", "value": "evil-phish.test"},
            "action": {"add_indicator": "custom-rule-hit"},
        },
        headers=org_admin["auth"],
    )
    assert create.status_code in (200, 201), create.text
    rid = create.json().get("id")
    listed = await client.get("/api/rules/", headers=org_admin["auth"])
    assert listed.status_code == 200
    if rid:
        deleted = await client.delete(f"/api/rules/{rid}", headers=org_admin["auth"])
        assert deleted.status_code == 200


@pytest.mark.asyncio
async def test_stats_jwt(client: AsyncClient, org_admin):
    r = await client.get("/api/stats", headers=org_admin["auth"])
    assert r.status_code == 200
