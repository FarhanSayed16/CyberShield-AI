# AGENTIC AI QUICK-START PROMPT

Copy-paste to Cursor / Claude Code to build AISentinel for **organizational employee AI monitoring**.

---

```
You are building AISentinel — organizations use it to monitor employee usage of ChatGPT, Claude, Gemini via a Chrome extension + admin dashboard.

## Read first:
- AGENTS.md
- Plan/17_IMPLEMENTATION_SEQUENCE.md (gated build order)
- Plan/20_ORG_EMPLOYEE_MONITORING.md (org deployment flow)
- Plan/05b_MONGODB_SCHEMA.md (NOT 05 PostgreSQL)
- Plan/08_CHROME_EXTENSION_SPEC.md (critical path)

## Stack:
FastAPI + MongoDB (Beanie) + Redis + React Vite + Chrome MV3 + Docker Compose

## Build order (gates — do not skip):

### Gate 0: Docker
Plan/13_DEPLOYMENT_DOCKER.md → docker compose up → GET /health ok

### Gate 1: Mongo + seed
Beanie models from 05b → scripts/seed.py → 2+ users in DB

### Gate 2: Auth
POST /api/auth/signup, login, GET /api/auth/me

### Gate 3: Events + DLP
services/dlp.py from 14 → POST /api/events → risk_score on API key in prompt

### Gate 4: Admin Verify (REQUIRED before UI polish)
Plan/19 → /admin/verify page + admin APIs

### Gate 5: Dashboard
Plan/07 → Dashboard, Events, Alerts, Users, Settings

### Gate 6: Chrome Extension
Plan/08 → capture on chat.openai.com, claude.ai, gemini.google.com
POST to /api/events with org_token + user_token

### Gate 7: Proxy (optional)
/proxy/openai/v1/chat/completions

## Rules:
- MongoDB not Postgres; no Alembic
- Extension must NEVER break AI sites (silent errors)
- Observe-only MVP — no blocking prompts
- API paths: /api/... (see 06_API_SPEC.md)
- ObjectIds as strings in JSON

## Env:
MONGODB_URL=mongodb://mongo:27017/aisentinel
REDIS_URL=redis://redis:6379/0
JWT_SECRET=dev-secret-change-in-prod-min-32-chars
FRONTEND_URL=http://localhost:3000

Start Gate 0. Confirm each gate before next.
```

---

## Extension-only prompt

```
Build AISentinel Chrome Extension per Plan/08_CHROME_EXTENSION_SPEC.md.
Org employees install extension; admin gets per-employee prompts on dashboard.
POST events to http://localhost:8000/api/events with X-Org-Token and user_token.
Sites: chat.openai.com, chatgpt.com, claude.ai, gemini.google.com.
MV3 vanilla JS. Silent failure on errors.
```

---

## MVP checklist

```
□ docker compose up — all healthy
□ Admin signup + invite employee
□ Employee configures extension tokens
□ ChatGPT submit → event on dashboard < 5s
□ Admin Verify page all green
□ API key in prompt → CRITICAL alert
□ Admin sees per-employee usage in Users + Events
```

When complete: pilot with one real organization (5+ employees).
