# Staging runbook — CyberSentinel Phase 7

**Goal:** Production-like environment (cloud or local staging-like) validated before Phase 8.

Related: [`../free_tier_deployment_guide.md`](../free_tier_deployment_guide.md) · [`Phase7_Acceptance_Checklist.md`](./Phase7_Acceptance_Checklist.md) · [`Mongo_Backup_Restore.md`](./Mongo_Backup_Restore.md)

---

## Recommended hosts (free / low-cost)

| Piece | Host | Notes |
| :--- | :--- | :--- |
| API | Render Web Service (`backend/`) | Use `backend/Dockerfile` or native Python |
| DB | MongoDB Atlas M0 | `MONGODB_URI` + `DB_NAME=cybersentinel_staging` |
| Dashboard | Vercel | Set `VITE_*` **before** build |
| Redis | Render Redis / Upstash / skip | App fail-opens if unreachable |
| Extension | Unpacked against staging API | See `extension/INSTALL.md` |

---

## A) Cloud staging (operator with accounts)

1. **Atlas** — create cluster + DB user + network access; copy URI.
2. **Render** — new Web Service, root `backend`, Docker or `uvicorn app.main:app`.
   Env: copy from `backend/.env.staging.example` with real secrets.
   `ENVIRONMENT=staging`, strong `JWT_SECRET` + `API_KEY`, `CORS_ORIGINS` = Vercel URL.
3. **Indexes** — from a machine that can reach Atlas:
   `python -m app.scripts.ensure_indexes`
4. **Vercel** — import `frontend/`, env from `frontend/.env.staging.example`. Redeploy after env change.
5. **Stripe TEST** — webhook → `https://<api>/api/billing/webhook`.
6. **Smoke** — `BASE_URL=https://<api> python -m app.scripts.staging_smoke`
7. Fill [`Phase7_Acceptance_Checklist.md`](./Phase7_Acceptance_Checklist.md) + dry-run notes.

### Rollback

- **Render:** redeploy previous successful deploy from dashboard.
- **Vercel:** promote previous deployment / redeploy prior git SHA.
- **DB:** restore from Atlas snapshot (see Mongo backup note).
- Do **not** hot-edit production secrets during rollback; swap env then redeploy.

### Uptime ping

Point UptimeRobot / cron at `GET https://<api>/health` every 5 minutes. Alert on-call on non-200.

---

## B) Local staging-like dry-run (no cloud)

```powershell
# Repo root
copy backend\.env.staging.example backend\.env.staging
# Edit backend\.env.staging:
#   JWT_SECRET / API_KEY = long random strings
#   MONGODB_URI=mongodb://mongo:27017
#   DB_NAME=cybersentinel_staging
#   CORS_ORIGINS=http://localhost:5173
#   FRONTEND_URL=http://localhost:5173
#   USE_MOCK_AGENTS=true   # optional if no Gemini

docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file backend/.env.staging up --build -d

# Wait for healthy, then from backend/ with host Mongo URI:
#   $env:MONGODB_URI='mongodb://127.0.0.1:27017'
#   $env:DB_NAME='cybersentinel_staging'
#   $env:STORAGE_BACKEND='mongodb'
#   .\.venv\Scripts\python.exe -m app.scripts.ensure_indexes
#   $env:BASE_URL='http://127.0.0.1:8000'
#   .\.venv\Scripts\python.exe -m app.scripts.staging_smoke

cd frontend
copy .env.staging.example .env.local
# VITE_API_URL=http://localhost:8000
npm run dev
```

Weak `dev-key` / short JWT **will refuse to start** when `ENVIRONMENT=staging`.

---

## Seed vs signup

Prefer **first admin signup** on staging (creates trial org).
Optional: `python -m app.scripts.seed_org` only when using a fresh DB and documented demo tokens.

---

## Extension against staging

Popup Config:

- API URL = staging API origin (no `/api` suffix)
- Org + user tokens from staging Org Settings / Team
- Dashboard URL = staging Vercel URL
