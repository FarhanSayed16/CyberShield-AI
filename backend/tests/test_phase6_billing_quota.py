"""Phase 6 — Quotas and billing smoke."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_billing_status_and_dev_activate(client: AsyncClient, org_admin):
    st = await client.get("/api/billing/status", headers=org_admin["auth"])
    assert st.status_code == 200, st.text
    body = st.json()
    assert body["plan"] in ("trial", "starter", "expired", "free")
    assert "limits" in body
    assert body["limits"]["seats"] >= 1

    act = await client.post(
        "/api/billing/dev-activate",
        json={"plan": "starter"},
        headers=org_admin["auth"],
    )
    assert act.status_code == 200
    assert act.json()["plan"] == "starter"


@pytest.mark.asyncio
async def test_seat_quota_blocks_invite(client: AsyncClient, org_admin):
    # Shrink org to 1 seat via free plan
    await client.post(
        "/api/billing/dev-activate",
        json={"plan": "free"},
        headers=org_admin["auth"],
    )
    # Admin already occupies 1 seat — invite should 429
    r = await client.post(
        "/api/users/invite",
        json={"email": "overflow@phase6.example.com", "role": "employee"},
        headers=org_admin["auth"],
    )
    assert r.status_code == 429, r.text
    detail = r.json().get("detail") or {}
    err = detail.get("error") if isinstance(detail, dict) else {}
    assert err.get("code") == "QUOTA_SEATS" or "Seat" in str(r.json())
