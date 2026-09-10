# Phase 2 — Backend integration notes

**Date:** 2026-09-09  
**Branch:** `integrate/phase1-foundations` (continue) / create `integrate/phase2-backend` as needed  
**Status:** Core merge **done** — single FastAPI app hosts Threat Explainer + AI Workplace Guard

## What landed in `backend/`

| Area | Location |
| :--- | :--- |
| Org documents | `app/db/documents_org.py` |
| JWT / bcrypt / tokens | `app/utils/auth_security.py` |
| Deps (API key + JWT + org header) | `app/api/deps.py` |
| Schemas | `app/schemas/ai_guard.py` |
| DLP / hybrid / alerts / redis | `app/services/dlp.py`, `hybrid_dlp.py`, `org_alerts.py`, `redis_client.py` |
| Routes | `routes_auth`, `routes_org`, `routes_users`, `routes_policies`, `routes_events`, `routes_alerts`, `routes_enforcement`, `routes_dashboard_org`, `routes_admin`, `routes_proxy` |
| Seed | `python -m app.scripts.seed_org` |
| Threat tenancy fields | `ThreatEventDocument.org_id` / `user_id` |

## Auth matrix (now)

| Client | Auth |
| :--- | :--- |
| Dashboard (AI Guard) | `Authorization: Bearer <JWT>` |
| Extension ingest | `X-Org-Token` + `user_token` |
| Analyze / threats | JWT **or** legacy `X-API-Key` |
| Production | Weak `API_KEY` / `JWT_SECRET` refused |

## Smoke verified (memory backend)

- Login `admin@demo.com` / `password` → 200  
- Event ingest with API key in prompt → 201 flagged + alert  
- JWT analyze URL → 200  
- Routes include `/api/auth/*`, `/api/events`, `/api/analyze`, `/api/admin/*`, `/health`

## Still transitional (Phases 4–5)

- Extension still separate until Phase 4  
- `/api/stats` not fully org-filtered yet (JWT list threats is)  
- Global `API_KEY` still allowed for analyze (machine/scripts)  
- Frontend console uses JWT (Phase 3) — `VITE_API_KEY` optional/dev only  
- Stripe / quotas not wired  

## Local commands

```powershell
cd backend
.\.venv\Scripts\activate
$env:STORAGE_BACKEND="memory"
python -m app.scripts.seed_org
uvicorn app.main:app --reload --port 8000
```

Demo tokens: org `aisnl_org_demo123` · user `aisnl_usr_admin123`
