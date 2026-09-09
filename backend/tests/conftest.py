"""
Pytest configuration for CyberSentinel Phase 6.
Env must be set before app/settings import.
"""
from __future__ import annotations

import os

os.environ["STORAGE_BACKEND"] = "memory"
os.environ["USE_MOCK_AGENTS"] = "true"
os.environ["ENVIRONMENT"] = "development"
os.environ["JWT_SECRET"] = "phase6-test-secret-min-32-characters-xx"
os.environ["API_KEY"] = "dev-key"
os.environ["ALLOW_DEV_BILLING"] = "true"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ.setdefault("GEMINI_API_KEYS", "")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def app_ready():
    from app.db.connection import init_db, close_db
    from app.core.config import settings

    settings.STORAGE_BACKEND = "memory"
    settings.USE_MOCK_AGENTS = True
    settings.ENVIRONMENT = "development"
    settings.API_KEY = "dev-key"
    settings.JWT_SECRET = "phase6-test-secret-min-32-characters-xx"
    settings.ALLOW_DEV_BILLING = True

    await init_db()
    yield
    await close_db()


@pytest_asyncio.fixture(loop_scope="session")
async def client(app_ready):
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(loop_scope="session")
async def api_client(app_ready):
    from app.main import app
    from app.core.config import settings

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers.update({"X-API-Key": settings.API_KEY})
        yield ac


# Backward-compatible alias for older tests
@pytest_asyncio.fixture(loop_scope="session")
async def async_client(api_client):
    yield api_client


@pytest_asyncio.fixture
async def org_admin(client: AsyncClient):
    import uuid

    suffix = uuid.uuid4().hex[:8]
    email = f"admin_{suffix}@phase6.example.com"
    payload = {
        "name": "Phase6 Admin",
        "email": email,
        "password": "password123",
        "org_name": f"Phase6 Org {suffix}",
    }
    r = await client.post("/api/auth/signup", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    token = data["access_token"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    me_data = me.json()
    org = await client.get("/api/org", headers={"Authorization": f"Bearer {token}"})
    assert org.status_code == 200
    org_data = org.json()
    return {
        "email": email,
        "password": "password123",
        "access_token": token,
        "auth": {"Authorization": f"Bearer {token}"},
        "org_api_key": org_data["org_api_key"],
        "user_token": me_data["user_token"],
        "org_id": org_data["id"],
        "user_id": me_data["id"],
        "org": org_data,
        "me": me_data,
    }
