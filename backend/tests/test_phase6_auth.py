"""Phase 6.1 / 6.2 — Auth, invite, org isolation."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_login_me(client: AsyncClient):
    import uuid

    email = f"u_{uuid.uuid4().hex[:8]}@example.com"
    r = await client.post(
        "/api/auth/signup",
        json={
            "name": "User",
            "email": email,
            "password": "password123",
            "org_name": f"Org {email}",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"]
    assert body["org"]["plan"] == "trial"

    login = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json().get("user_token")


@pytest.mark.asyncio
async def test_login_bad_password(client: AsyncClient, org_admin):
    r = await client.post(
        "/api/auth/login",
        json={"email": org_admin["email"], "password": "wrong-password"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_invite_accept_employee_token(client: AsyncClient, org_admin):
    inv = await client.post(
        "/api/users/invite",
        json={"email": "emp@phase6.example.com", "role": "employee"},
        headers=org_admin["auth"],
    )
    assert inv.status_code == 201, inv.text
    token = inv.json()["invite_token"]
    assert "accept-invite?token=" in inv.json()["accept_url"]
    assert inv.json().get("email_delivery") == "manual"

    acc = await client.post(
        "/api/auth/accept-invite",
        json={
            "token": token,
            "name": "Employee",
            "password": "password123",
        },
    )
    assert acc.status_code == 200, acc.text
    emp_jwt = acc.json()["access_token"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert me.status_code == 200
    assert me.json()["role"] == "employee"
    assert me.json()["user_token"]
    assert not me.json()["user_token"].startswith("pending_")


@pytest.mark.asyncio
async def test_org_isolation_threat_detail(client: AsyncClient, org_admin):
    # Org A analyzes
    an = await client.post(
        "/api/analyze",
        json={"type": "url", "content": "https://example.com", "source": "dashboard"},
        headers=org_admin["auth"],
    )
    assert an.status_code == 200, an.text
    threat_id = an.json()["id"]

    # Org B signup
    import uuid

    email = f"other_{uuid.uuid4().hex[:6]}@example.com"
    r = await client.post(
        "/api/auth/signup",
        json={
            "name": "Other",
            "email": email,
            "password": "password123",
            "org_name": f"Other {email}",
        },
    )
    other_tok = r.json()["access_token"]

    # Org B cannot read Org A threat when org_id set
    detail = await client.get(
        f"/api/threats/{threat_id}",
        headers={"Authorization": f"Bearer {other_tok}"},
    )
    assert detail.status_code == 404


@pytest.mark.asyncio
async def test_employee_cannot_list_users(client: AsyncClient, org_admin):
    inv = await client.post(
        "/api/users/invite",
        json={"email": f"noadmin@phase6.example.com", "role": "employee"},
        headers=org_admin["auth"],
    )
    token = inv.json()["invite_token"]
    acc = await client.post(
        "/api/auth/accept-invite",
        json={"token": token, "name": "Emp", "password": "password123"},
    )
    emp_auth = {"Authorization": f"Bearer {acc.json()['access_token']}"}
    users = await client.get("/api/users", headers=emp_auth)
    assert users.status_code == 403
