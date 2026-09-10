# Phase 7 — Staging dry-run notes

**Date:** 2026-09-09  
**Operator:** Core team (local)  
**Scope:** Local **staging-like API** dry-run (`ENVIRONMENT=staging`, strong secrets, `STORAGE_BACKEND=memory`). Cloud Atlas / Render / Vercel **not** exercised in this session (Docker Desktop daemon unavailable).

**Related:** [`ops/Staging_Runbook.md`](./ops/Staging_Runbook.md) · [`ops/Phase7_Acceptance_Checklist.md`](./ops/Phase7_Acceptance_Checklist.md)

---

## URLs under test

| Piece | URL |
| :--- | :--- |
| API | `http://127.0.0.1:8000` |
| Frontend | Not required for API smoke (host `npm run dev` / Vercel deferred) |
| Extension | Manual matrix deferred (same as Phase 6) |

---

## Automated smoke

```text
python -m app.scripts.staging_smoke
BASE_URL=http://127.0.0.1:8000
15/15 passed
```

Covered: health, signup (trial), me, org token, invite, analyze, threats list, DLP critical event + alert, enforcement ack/pull/complete, billing status, admin detailed health.

---

## Deliverables completed this phase

| Item | Location |
| :--- | :--- |
| Staging env templates | `backend/.env.staging.example`, `frontend/.env.staging.example` |
| Compose overlay | `docker-compose.staging.yml` |
| Secret hardening for staging | `backend/app/main.py` (`ENVIRONMENT=staging\|production`) |
| Compound indexes + ensure script | Beanie Settings + `app.scripts.ensure_indexes` |
| API smoke script | `app.scripts.staging_smoke` |
| Ops runbooks | `doc/ops/Staging_Runbook.md`, `Mongo_Backup_Restore.md`, checklist |
| `.env.staging` gitignored | `.gitignore` |

---

## Acceptance vs Master Plan 7.3

| Item | Result |
| :--- | :--- |
| Health OK | **Pass** (smoke) |
| Signup + login path | **Pass** (signup/JWT in smoke) |
| Invite employee | **Pass** (smoke; accept-invite UI manual) |
| Extension against staging | **Deferred** — needs operator + live DOM sites |
| AI event &lt; 1 min | **Pass** (API ingest; UI timing deferred) |
| DLP critical fixture | **Pass** |
| Threat URL scan + history | **Pass** |
| Enforcement on employee browser | **Partial** — API pull/complete **Pass**; browser blackout manual |
| Admin Verify | **Pass** (API) |
| Checkout test payment | **Skipped** — no Stripe keys; billing status + trial OK |
| Quota UX | **Deferred** — covered in Phase 6 pytest |
| Logs no secrets | **Pass** (spot-check; fix Unicode console noise separately) |

---

## Cloud staging (operator follow-up)

When Docker Desktop / cloud accounts are available:

1. Follow [`ops/Staging_Runbook.md`](./ops/Staging_Runbook.md) §A (Atlas + Render + Vercel).  
2. `ensure_indexes` against Atlas.  
3. Re-run `staging_smoke` with `BASE_URL=https://…`.  
4. Check remaining manual rows on the acceptance checklist.  
5. Record cloud URLs in an addendum below.

**Cloud URLs:** _pending operator deploy_

---

## Go / No-Go for Phase 8

**Decision: Conditional Go**

- **Go** for starting Phase 8 prep (prod env templates, cutover checklist) once cloud staging smoke is green **or** leadership accepts local staging-like + runbooks as Phase 7 exit for solo/dev.
- **No-Go** for claiming public staging URLs or Store pilot against unverified cloud hosts until §A is completed.

**Blockers for full cloud exit:** Docker daemon / Atlas / Render / Vercel credentials; extension site matrix; Stripe TEST checkout if charging in staging.
