# Local development (monorepo)

**Status:** Phases 0–4 done — one FastAPI + one React app + one MV3 extension (AI Guard + Threat Explainer).

## Prerequisites

- Python 3.11+  
- Node.js 18+  
- Docker Desktop (optional — for Mongo/Redis)  
- Windows: PowerShell 5+  

## Quick paths

### A) Merged CyberSentinel (recommended)

```powershell
# From repo root
.\run-local.ps1
# or: .\run-local.ps1 -Mode cybersentinel
```

| Service | URL |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/api/health |

Copy `backend/.env.example` → `backend/.env`. Set `GEMINI_API_KEYS` for live explain.  
Optional: `STORAGE_BACKEND=memory` for mongomock (no Docker).

**Console auth (Phase 3):** open http://localhost:5173 → **Sign in** / **Sign up** (JWT).  
Do not rely on `VITE_API_KEY` for the dashboard.

Seed demo org (Mongo only — same DB as the API process):

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.scripts.seed_org
# admin@demo.com / password
```

With `STORAGE_BACKEND=memory`, prefer **Sign up** in the UI (seed in a separate process does not share mongomock memory).

Extension: load unpacked [`extension/`](../extension/) — see [`extension/INSTALL.md`](../extension/INSTALL.md).  
Popup Config: API origin + **org token** + **user token** + dashboard URL (from Org Settings / Team after login).

### B) AISentinel source (removed)

`sources/aisentinel/` was deleted after merge. Use root `backend` / `frontend` / `extension` only. Seed demo users:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.scripts.seed_org
```

Demo: `admin@demo.com` / `password` (also `manager@demo.com`, `emp@demo.com`).

### C) Infra only (Mongo + Redis)

```powershell
docker compose up -d mongo redis
```

Then point `backend/.env` → `MONGODB_URI=mongodb://127.0.0.1:27017` and `DB_NAME=cybersentinel`.

## Env files

| File | Purpose |
| :--- | :--- |
| [`.env.example`](../.env.example) | **Canonical merged contract** (copy values into service `.env` files) |
| `backend/.env` | Runtime for FastAPI |
| `frontend/.env` | Vite `VITE_*` |

See [`Phase1_Architecture_And_Env.md`](./Phase1_Architecture_And_Env.md) for variable names.

## Health checks

```powershell
curl http://127.0.0.1:8000/api/health
```

After Phase 2: also Admin Verify in the dashboard and `/health` alias.

## Ports (avoid clashes)

| Port | Use |
| :---: | :--- |
| 8000 | API (only one process) |
| 5173 | CyberSentinel frontend |
| 5174 | AIS source frontend (dev only) |
| 27017 | MongoDB |
| 6379 | Redis |
