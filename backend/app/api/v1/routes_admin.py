import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.api.deps import require_admin
from app.db.documents_org import Organization, User
from app.schemas.ai_guard import EventIngestRequest
from app.api.v1.routes_events import _ingest_event
from app.services.dlp import DLP_FIXTURES, scan_prompt
from app.db.connection import get_motor_client
from app.services.redis_client import get_redis

router = APIRouter()


@router.get("/health/detailed")
async def health_detailed(_: User = Depends(require_admin)):
    api_start = time.perf_counter()
    api_ms = round((time.perf_counter() - api_start) * 1000, 2)

    mongo_ok = False
    mongo_ms = 0
    mongo_error = None
    mongo_client = get_motor_client()
    try:
        t0 = time.perf_counter()
        if (settings.STORAGE_BACKEND or "").strip().lower() == "memory":
            mongo_ok = mongo_client is not None
        elif mongo_client:
            await mongo_client.admin.command("ping")
            mongo_ok = True
        else:
            mongo_error = "DB client not initialized — check MONGODB_URI"
        mongo_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as exc:
        mongo_ok = False
        mongo_error = str(exc)

    redis_ok = False
    redis_ms = 0
    redis_optional = True
    try:
        t0 = time.perf_counter()
        r = await get_redis()
        redis_ok = bool(await r.ping())
        redis_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception:
        # Redis is optional (rate-limit fail-open)
        redis_ok = False

    # Mongo required for mongodb mode. Redis is informational only.
    storage = (settings.STORAGE_BACKEND or "mongodb").strip().lower()
    all_ok = mongo_ok if storage != "memory" else True
    body = {
        "api": {"ok": True, "latency_ms": api_ms},
        "mongo": {
            "ok": mongo_ok,
            "latency_ms": mongo_ms,
            "mode": settings.STORAGE_BACKEND,
            "error": mongo_error,
        },
        "redis": {
            "ok": redis_ok,
            "latency_ms": redis_ms,
            "optional": redis_optional,
            "note": "Optional — app fail-opens if Redis is down",
        },
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "ok": all_ok,
    }
    if not all_ok:
        raise HTTPException(status_code=503, detail=body)
    return body


@router.post("/verify/ingest-test", status_code=201)
async def verify_ingest_test(admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    test_prompt = "Test ingest with key sk-test1234567890abcdef0123456789 for verification"
    body = EventIngestRequest(
        user_token=admin.user_token,
        platform="chatgpt",
        source="api",
        prompt_text=test_prompt,
        prompt_length=len(test_prompt),
        captured_at=datetime.utcnow(),
    )
    return await _ingest_event(org, admin, body)


@router.get("/verify/dlp-fixtures")
async def dlp_fixtures(_: User = Depends(require_admin)):
    return {"fixtures": DLP_FIXTURES}


@router.post("/verify/dlp-run")
async def dlp_run(_: User = Depends(require_admin)):
    results = []
    for fx in DLP_FIXTURES:
        scan = scan_prompt(fx["prompt"])
        actual_level = scan.risk_level.upper() if scan.risk_level != "none" else "NONE"
        expected = fx["expected_severity"]
        results.append({
            "id": fx["id"],
            "expected_severity": expected,
            "actual_severity": actual_level,
            "pass": (expected == "NONE" and scan.risk_level == "none") or (
                expected != "NONE" and scan.risk_level == expected.lower()
            ),
            "risk_score": scan.risk_score,
            "risk_reasons": scan.risk_reasons,
        })
    return {"results": results}
