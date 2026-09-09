"""
CyberSentinel AI — FastAPI Application
Main entry point with CORS, router registration, and DB lifecycle.
"""

from contextlib import asynccontextmanager

import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging, request_id_var
from app.db.connection import init_db, close_db
from app.core.ai_models import ai_manager

from app.api.v1.routes_analyze import router as analyze_router
from app.api.v1.routes_threats import router as threats_router
from app.api.v1.routes_stats import router as stats_router
from app.api.v1.routes_health import router as health_router
from app.api.v1.routes_agents import router as agents_router
from app.api.v1.routes_chat import router as chat_router
from app.api.v1.routes_report import router as report_router
from app.api.v1.routes_ws import router as ws_router
from app.api.v1.routes_rules import router as rules_router
from app.api.v1.routes_intel import router as intel_router
from app.api.v1.routes_auth import router as auth_router
from app.api.v1.routes_org import router as org_router
from app.api.v1.routes_users import router as users_router
from app.api.v1.routes_policies import router as policies_router
from app.api.v1.routes_events import router as events_router
from app.api.v1.routes_alerts import router as alerts_router
from app.api.v1.routes_enforcement import router as enforcement_router
from app.api.v1.routes_dashboard_org import router as dashboard_org_router
from app.api.v1.routes_admin import router as admin_router
from app.api.v1.routes_proxy import router as proxy_router
from app.api.v1.routes_billing import router as billing_router

_WEAK_API_KEYS = frozenset({"", "dev-key", "changeme", "secret", "password", "api-key"})
_WEAK_JWT_SECRETS = frozenset({
    "",
    "change-me-in-production-min-32-chars-long-please",
    "dev-secret-change-in-production-min-32-chars",
    "secret",
    "changeme",
})


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    env = (settings.ENVIRONMENT or "development").strip().lower()
    hardened = env in ("production", "staging")
    if hardened and settings.API_KEY.strip().lower() in _WEAK_API_KEYS:
        logger.error(
            f"Refusing to start: API_KEY is weak/default while ENVIRONMENT={env}. "
            "Set a strong random API_KEY."
        )
        raise RuntimeError(f"Weak API_KEY not allowed when ENVIRONMENT={env}")
    jwt_secret = (settings.JWT_SECRET or "").strip()
    if hardened and (
        jwt_secret.lower() in _WEAK_JWT_SECRETS or len(jwt_secret) < 32
    ):
        logger.error(
            f"Refusing to start: JWT_SECRET is weak/short while ENVIRONMENT={env}. "
            "Set a random secret of at least 32 characters."
        )
        raise RuntimeError(f"Weak JWT_SECRET not allowed when ENVIRONMENT={env}")

    await init_db()
    await ai_manager.initialize()
    yield
    await close_db()


_docs = None
_redoc = None
if (settings.ENVIRONMENT or "development").strip().lower() not in ("production", "staging"):
    _docs = "/docs"
    _redoc = "/redoc"

app = FastAPI(
    title="CyberSentinel AI API",
    description="AI-powered cyber defense platform — threat detection, analysis, and explainability",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url="/openapi.json" if _docs else None,
)

# --- Request ID Middleware ---
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = uuid.uuid4().hex[:8]  # Short 8-char hex for trace ID
    token = request_id_var.set(req_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response
    finally:
        request_id_var.reset(token)

# --- CORS Middleware ---
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Routers ---
# Threat Explainer (CyberSentinel)
app.include_router(analyze_router, prefix="/api", tags=["Analyze"])
app.include_router(threats_router, prefix="/api", tags=["Threats"])
app.include_router(stats_router, prefix="/api", tags=["Stats"])
app.include_router(health_router, prefix="/api", tags=["Health"])
# Debug agent endpoints disabled in staging/production (S4)
if (settings.ENVIRONMENT or "development").strip().lower() not in ("production", "staging"):
    app.include_router(agents_router, prefix="/api", tags=["Agents (Debug)"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(report_router, prefix="/api", tags=["Reports"])
app.include_router(ws_router, prefix="/api", tags=["WebSocket"])
app.include_router(rules_router, prefix="/api/rules", tags=["Rules"])
app.include_router(intel_router, prefix="/api/intel", tags=["Intel Sharing"])

# AI Workplace Guard (from AISentinel)
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(org_router, prefix="/api/org", tags=["Organization"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(policies_router, prefix="/api/policies", tags=["Policies"])
app.include_router(events_router, prefix="/api/events", tags=["AI Events"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(enforcement_router, prefix="/api/enforcement", tags=["Enforcement"])
app.include_router(dashboard_org_router, prefix="/api/dashboard", tags=["Org Dashboard"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin Verify"])
app.include_router(billing_router, prefix="/api", tags=["Billing"])
app.include_router(proxy_router, prefix="/proxy", tags=["AI Proxy"])


@app.get("/health", tags=["Health"])
async def health_alias():
    """AIS-compatible health alias — prefers /api/health for full detail."""
    from app.db.connection import check_db_connection

    ok = await check_db_connection()
    return {"status": "ok" if ok else "degraded", "db": "connected" if ok else "disconnected"}


@app.get("/", tags=["Root"])
async def root():
    payload = {
        "app": "CyberSentinel AI",
        "version": "1.1.0",
        "modules": ["threat_explainer", "ai_workplace_guard"],
        "health": "/api/health",
    }
    if (settings.ENVIRONMENT or "development").strip().lower() not in ("production", "staging"):
        payload["docs"] = "/docs"
    return payload
