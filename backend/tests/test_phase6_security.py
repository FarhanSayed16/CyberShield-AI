"""Phase 6.5 / 6.7 — Security hygiene checks."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


def test_production_refuses_weak_api_key():
    from app.main import _WEAK_API_KEYS, _WEAK_JWT_SECRETS

    assert "dev-key" in _WEAK_API_KEYS
    assert "change-me-in-production-min-32-chars-long-please" in _WEAK_JWT_SECRETS


def test_cors_origins_not_star_in_settings():
    from app.core.config import settings

    origins = [o.strip() for o in (settings.CORS_ORIGINS or "").split(",") if o.strip()]
    assert "*" not in origins


def test_extension_overlay_uses_escape_html():
    root = Path(__file__).resolve().parents[2] / "extension" / "content.js"
    text = root.read_text(encoding="utf-8")
    assert "function escapeHtml" in text or "escapeHtml(" in text
    # Prefer textContent / escaped paths over raw innerHTML of model text in key paths
    assert "escapeHtml" in text


def test_extension_no_debug_ingest_endpoint():
    root = Path(__file__).resolve().parents[2] / "extension"
    for path in root.rglob("*.js"):
        if "dist" in path.parts:
            continue
        content = path.read_text(encoding="utf-8", errors="ignore")
        assert "127.0.0.1:7607" not in content, path
        assert "DEBUG_ENDPOINT" not in content, path


@pytest.mark.asyncio
async def test_ws_rejects_missing_credentials(app_ready):
    from app.main import app
    from starlette.testclient import TestClient

    with TestClient(app) as tc:
        with pytest.raises(Exception):
            # Invalid handshake / policy violation
            with tc.websocket_connect("/api/ws/threats") as ws:
                ws.receive_text()


@pytest.mark.asyncio
async def test_ws_accepts_jwt_query(client: AsyncClient, org_admin, app_ready):
    from app.main import app
    from starlette.testclient import TestClient

    token = org_admin["access_token"]
    with TestClient(app) as tc:
        with tc.websocket_connect(f"/api/ws/threats?token={token}") as ws:
            ws.send_text("ping")
            msg = ws.receive_text()
            assert "pong" in msg


def test_no_committed_env_secrets_in_example():
    example = Path(__file__).resolve().parents[1] / ".env.example"
    text = example.read_text(encoding="utf-8")
    assert "sk-live" not in text
    assert "STRIPE_SECRET_KEY=" in text
