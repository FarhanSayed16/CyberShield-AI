"""
CyberSentinel AI — FastAPI Application
Main entry point with CORS, router registration, and DB lifecycle.
"""

from contextlib import asynccontextmanager

import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    await init_db()
    await ai_manager.initialize()
    yield
    await close_db()


app = FastAPI(
    title="CyberSentinel AI API",
    description="AI-powered cyber defense platform — threat detection, analysis, and explainability",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(analyze_router, prefix="/api", tags=["Analyze"])
app.include_router(threats_router, prefix="/api", tags=["Threats"])
app.include_router(stats_router, prefix="/api", tags=["Stats"])
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(agents_router, prefix="/api", tags=["Agents (Debug)"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(report_router, prefix="/api", tags=["Reports"])
app.include_router(ws_router, prefix="/api", tags=["WebSocket"])
app.include_router(rules_router, prefix="/api/rules", tags=["Rules"])
app.include_router(intel_router, prefix="/api/intel", tags=["Intel Sharing"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": "CyberSentinel AI",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
