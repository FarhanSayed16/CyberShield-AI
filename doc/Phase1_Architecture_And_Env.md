# Phase 1 — Architecture & Environment Freeze

**Date:** 2026-09-09  
**Status:** Locked for Phases 2–4 implementation  
**Brand (D1):** CyberSentinel  
**Canonical repo:** CyberShield AI monorepo  

Companion: [`LOCAL_DEV_MERGED.md`](./LOCAL_DEV_MERGED.md) · [`Master_Integration_Execution_Plan.md`](./Master_Integration_Execution_Plan.md)

---

## 1. Target repository tree (frozen)

```text
CyberShield-AI/
├── backend/                 # ONE FastAPI (live target)
├── frontend/                # ONE React app (live target)
├── extension/               # ONE Chrome MV3 (live target)
├── doc/                     # Product + execution docs
│   └── reference/           # AISentinel specs (read-only)
├── docker-compose.yml       # Root local stack
├── .env.example             # Merged env contract
└── run-local.ps1            # Windows quick start
```

| Path | Role |
| :--- | :--- |
| `backend/` · `frontend/` · `extension/` | **Only** shippable product code |
| `doc/reference/` | Specs only — do not treat as runtime |

**No nested git repos. No second deployable product.**  
**Removed after merge:** `sources/aisentinel/`, root `models/`, `cybersentinel-ml-api/`, stale `doc/backend/` dump.

---

## 2. System architecture (frozen)

```text
┌─────────────────────────────────────────────────────────────┐
│ Employee browser                                            │
│  ONE extension: AI-site observe + threat warn/scan          │
└─────────────┬───────────────────────────────┬───────────────┘
              │ X-Org-Token + user_token      │ (same API base)
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ONE FastAPI — CyberSentinel API                             │
│                                                             │
│  Auth (JWT)     AI Guard           Threat Explainer         │
│  /api/auth/*    /api/events        /api/analyze             │
│  /api/org/*     /api/alerts        /api/threats             │
│  /api/users/*   /api/enforcement   /api/stats               │
│  /api/policies  /api/dashboard     /api/rules (org)         │
│  /api/admin/verify                 /api/chat (gated)        │
│                                                             │
│  DLP (regex) ──► Alerts                                     │
│  Gemini ────────► Explain on analyze / medium+ AI events    │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           MongoDB      Redis*      Gemini API
         (required      (optional   (required
          staging+)      rate-limit)  for explain)
```

\*Redis fail-open if down (rate limits degrade gracefully).

### Auth & tenancy (non-negotiable)

| Client | Auth | Identity |
| :--- | :--- | :--- |
| Admin dashboard | `Authorization: Bearer <JWT>` | `user_id`, `org_id`, `role` |
| Extension | `X-Org-Token` + body/header `user_token` | Employee attribution |
| Legacy machine scripts | Optional org-scoped API key (Phase 2+) | Not global `dev-key` in prod |
| Humans | **Never** shared global `API_KEY` in production | — |

**Tenancy rule:** Every `Event`, `Threat`, `Alert`, `Rule`, `EnforcementAction` document includes `org_id`. Queries always filter by org. Cross-org access = bug.

### Detection paths

| Path | Engine | When |
| :--- | :--- | :--- |
| AI prompt ingest | AISentinel **DLP regex** (+ custom org patterns) | Every AI event |
| Explainability | CyberSentinel **Gemini** analyze | `/api/analyze` and optionally medium+ AI events |
| URL / email / text threats | CyberSentinel analyze pipeline | User/extension scan |
| Soft enforcement | close_ai_tabs / blackout | After admin alert ack |

### Storage

| Environment | `STORAGE_BACKEND` / DB |
| :--- | :--- |
| Local smoke (optional) | `memory` only until Phase 2 seeds AIS paths; CS today uses Mongo URI |
| Local full / staging / prod | **MongoDB required** (`MONGODB_URI` + `DB_NAME=cybersentinel`) |

### Health endpoints (agreed)

| Endpoint | Purpose |
| :--- | :--- |
| `GET /api/health` | CyberSentinel health (DB, pipeline_mode) — keep |
| `GET /health` | Alias OK after merge (AIS compatibility) |
| Admin Verify UI + `/api/admin/*` | Pipeline smoke (ingest, DLP fixtures) — from AIS |

### WebSocket

- Keep `/api/ws/threats` only if org-scoped + authenticated.  
- Until org fanout is implemented in Phase 2/3: document as **console-only, auth required**; do not sell as multi-tenant live feed.

---

## 3. Feature flags (default OFF for advanced)

Stored on Organization settings (AIS shape). Defaults for v1:

| Flag | Default | Notes |
| :--- | :---: | :--- |
| `jit_training` | `false` | Post-v1 |
| `local_audit` | `false` | Client WASM/rules advanced |
| `anonymize` | `false` / `suggest` only if on | No hard vault in v1 |
| `shadow_ai` | `false` | Post-v1 |
| `clipboard_lineage` | `false` | Post-v1 |
| `openai_proxy` | `false` | Growth plan |

**Observe + alert** remains the default AI mode (D6).

---

## 4. Environment contract (canonical names)

Use these names everywhere after Phase 2. Prefer **`MONGODB_URI`** (CyberSentinel), not `MONGODB_URL`.

### Backend

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `ENVIRONMENT` | ✅ | `development` \| `production` |
| `MONGODB_URI` | ✅ staging+ | Atlas or Compose `mongodb://mongo:27017` |
| `DB_NAME` | — | Default `cybersentinel` |
| `STORAGE_BACKEND` | — | `mongodb` (prod) \| `memory` (AIS smoke only) |
| `JWT_SECRET` | ✅ for auth | ≥32 chars; refused if weak in production |
| `API_KEY` | transitional | Machine/dev; weak refused in production |
| `CORS_ORIGINS` | ✅ | Comma-separated frontend origins |
| `GEMINI_API_KEYS` | ✅ for explain | Comma-separated |
| `REDIS_URL` | — | Optional |
| `HF_API_URL` | — | Empty = Gemini-only |
| `FRONTEND_URL` | — | Invite links / CORS helper |
| `STRIPE_*` | Phase 5 | Not required yet |

### Frontend

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `VITE_API_URL` | ✅ | Backend origin, no trailing slash |
| `VITE_WS_URL` | — | e.g. `ws://localhost:8000/api/ws/threats` |
| `VITE_API_KEY` | transitional | Until JWT-only console (Phase 3) |
| `VITE_USE_MOCKS` | — | `false` for real API |

### Extension (chrome.storage — not baked env)

| Setting | Notes |
| :--- | :--- |
| API base URL | e.g. `http://localhost:8000` |
| Org token | `X-Org-Token` |
| User token | Employee identity |
| Dashboard URL | Deep links (no hardcoded prod localhost) |

### CORS process

1. Local: `http://localhost:5173` (Vite)  
2. Staging/prod: set exact Vercel/Netlify origins in `CORS_ORIGINS`  
3. Never use `*` in production  

### Production boot guards

When `ENVIRONMENT=production`:

- Refuse weak `API_KEY` (existing)  
- Refuse weak/short `JWT_SECRET` (Phase 1 config + Phase 2 enforce)  
- Disable debug `/api/agent/*`  

---

## 5. Local DX (Phase 1)

| Artifact | Path |
| :--- | :--- |
| Env template | [`.env.example`](../.env.example) |
| Compose | [`docker-compose.yml`](../docker-compose.yml) |
| Windows script | [`run-local.ps1`](../run-local.ps1) |
| Dev guide | [`LOCAL_DEV_MERGED.md`](./LOCAL_DEV_MERGED.md) |

**Until Phase 2 merge completes:**

- Primary runnable product = current CyberSentinel `backend` + `frontend` + `extension`  
- AISentinel reference stack = `sources/aisentinel` (documented, not dual-shipped)  
- Demo org seed for AIS lives at `sources/aisentinel/backend/scripts/seed.py` → port in Phase 2  

---

## 6. Phase 1 exit checklist

- [x] Architecture + env contract written (this doc)  
- [x] Integrate branch in use (`integrate/*`)  
- [x] Root Compose + `.env.example` + local run path  
- [x] Auth/tenancy rules unambiguous  
- [x] Feature flags defaults documented  

**Next:** Phase 2 — Backend integration (port AIS auth/events/DLP into `backend/`).
