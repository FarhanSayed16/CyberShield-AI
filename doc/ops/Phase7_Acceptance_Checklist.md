# Phase 7 — Staging acceptance checklist

Use with [`Staging_Runbook.md`](./Staging_Runbook.md). Mark each item during dry-run. File results in [`../Phase7_Staging_Dry_Run.md`](../Phase7_Staging_Dry_Run.md).

**Environment under test:** ☐ Cloud staging · ☐ Local staging-like (Compose) · ☐ Local API-only smoke  
**Operator:** _______________ **Date:** _______________  
**API base URL:** _______________ **Frontend URL:** _______________

---

## 7.1 / 7.2 Infrastructure & config

| # | Check | Pass |
| :---: | :--- | :---: |
| I1 | Mongo reachable (`STORAGE_BACKEND=mongodb` or documented memory exception for API-only) | ☐ |
| I2 | Backend HTTPS or local `:8000` healthy | ☐ |
| I3 | Frontend served (Vercel or `npm run dev`) | ☐ |
| I4 | `ENVIRONMENT=staging` (or production with same guards) | ☐ |
| I5 | Strong `JWT_SECRET` (≥32) and non-default `API_KEY` | ☐ |
| I6 | `CORS_ORIGINS` matches frontend origin(s) only | ☐ |
| I7 | Frontend `VITE_API_URL` / `VITE_WS_URL` set before build | ☐ |
| I8 | Indexes applied (`python -m app.scripts.ensure_indexes`) when using Mongo | ☐ |
| I9 | Stripe TEST keys configured **or** documented skipped (dev-activate path) | ☐ |
| I10 | First admin via signup documented (preferred) or seed tokens recorded | ☐ |

---

## 7.3 Product acceptance

| # | Check | Pass | Notes |
| :---: | :--- | :---: | :--- |
| A1 | `GET /health` and `/api/health` OK | ☐ | |
| A2 | Signup + login (JWT) | ☐ | |
| A3 | Invite employee + accept-invite URL | ☐ | |
| A4 | Extension Config points at staging API + tokens | ☐ | Manual |
| A5 | AI event appears in dashboard &lt; 1 min | ☐ | Manual / smoke |
| A6 | DLP critical on known fixture (`sk-…` key style) | ☐ | `staging_smoke` |
| A7 | Threat URL analyze + history shows result | ☐ | |
| A8 | Enforcement pull after alert ack (blackout) | ☐ | Smoke; browser optional |
| A9 | Admin Verify / `/api/admin/health/detailed` | ☐ | |
| A10 | Checkout test payment **or** `dev-activate` | ☐ | Skip if no Stripe |
| A11 | Quota exceeded returns 429 + upgrade hint | ☐ | Optional stress |
| A12 | Sample logs reviewed — no secrets/JWT printed | ☐ | |

**Automated:** from `backend/` with venv:

```powershell
$env:BASE_URL='https://YOUR-API'   # or http://127.0.0.1:8000
.\.venv\Scripts\python.exe -m app.scripts.staging_smoke
```

Attach smoke stdout to dry-run notes.

---

## 7.4 Ops dry-run

| # | Check | Pass |
| :---: | :--- | :---: |
| O1 | Uptime ping target documented (`/health`) | ☐ |
| O2 | Mongo backup/restore note followed once (or Atlas snapshot noted) | ☐ |
| O3 | Rollback plan understood (previous Render/Vercel deploy) | ☐ |
| O4 | External teammate install blockers listed (or N/A solo) | ☐ |

---

## Exit / Go-No-Go

| Criterion | Pass |
| :--- | :---: |
| Acceptance rows above complete for chosen env scope | ☐ |
| Dry-run notes filed with date, URLs, operator, pass/fail | ☐ |
| **Go** for Phase 8 · **No-Go** (blockers listed) | ☐ |

**Decision:** Go / No-Go  
**Blockers (if No-Go):** _______________________________________________
