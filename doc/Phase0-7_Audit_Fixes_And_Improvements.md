# Phases 0–7 Audit — Required Fixes & Improvements

**Date:** 2026-09-09  
**Scope:** Full audit of claimed Phase 0–7 completion against live `backend/` · `frontend/` · `extension/` · docs  
**Verdict:** Core merge is **substantially built**, but **Phases 6–7 are over-marked Done**, and several **multi-tenant / billing / employee-UX** gaps must be fixed before Phase 8 production.

| Area | Status |
| :--- | :--- |
| Phase 0–1 foundations | Mostly complete |
| Phase 2–5 feature spine | Present with important gaps |
| Phase 6 QA | API tests green; UI + extension matrix **not** done |
| Phase 7 staging | Local API smoke only; **cloud not done** |
| Ready for Phase 8 cutover? | **No-Go** until Critical + High (tenancy/security) land |

Related: [`Master_Integration_Execution_Plan.md`](./Master_Integration_Execution_Plan.md) · [`External_APIs_And_Obtainment_Guide.md`](./External_APIs_And_Obtainment_Guide.md) · [`Phase6_QA_Test_Report.md`](./Phase6_QA_Test_Report.md) · [`Phase7_Staging_Dry_Run.md`](./Phase7_Staging_Dry_Run.md)

---

## How to use this document

1. Treat **Critical** as release blockers.  
2. Check boxes only when **verified in code or ops evidence**.  
3. Prefer fixing in the **Priority order** at the bottom.  
4. Do **not** start Phase 8 prod cutover until Section A Critical is closed (or explicitly waived in writing).

---

# A. Critical — fix before any multi-tenant / paid use

## A1. Cross-org threat stats / analytics leak

| | |
| :--- | :--- |
| **Issue** | `GET /api/stats`, analytics timeline/geo aggregate **all** `threat_events` with no `org_id` filter. |
| **Evidence** | `backend/app/api/v1/routes_stats.py`, `backend/app/db/crud_threats.py` → `get_stats_summary()` |
| **Risk** | Org A sees Org B volume / risk aggregates. |
| **Fix** | Scope every aggregation by JWT/`org_id`. Global machine view only behind explicit ops admin if still needed. |
| **Verify** | Two orgs seeded; JWT from A must not see B’s counts. |

- [ ] Implement org filter on stats + timeline + geo  
- [ ] Add pytest isolation cases  

---

## A2. WebSocket broadcasts threats to all clients

| | |
| :--- | :--- |
| **Issue** | `ws_manager.broadcast` is a flat fan-out; JWT/API-key auth does not bind connection to `org_id`. |
| **Evidence** | `backend/app/api/v1/routes_ws.py`, `crud_threats.create_threat_event` broadcast |
| **Risk** | Live threat feed leaks across tenants. |
| **Fix** | Store `org_id` per connection; broadcast only to matching org room. |
| **Verify** | Two WS clients, different orgs; only matching events arrive. |

- [ ] Org-scoped WS rooms  
- [ ] Pytest or scripted WS isolation test  

---

## A3. Stripe webhook accepts unsigned payloads

| | |
| :--- | :--- |
| **Issue** | If `STRIPE_SECRET_KEY` set but `STRIPE_WEBHOOK_SECRET` empty, webhook uses `Event.construct_from` (no signature). |
| **Evidence** | `backend/app/api/v1/routes_billing.py` (~202–210) |
| **Risk** | Attacker can forge plan activation. |
| **Fix** | In `staging`/`production`, require webhook secret whenever Stripe is enabled; reject otherwise. Never skip verify outside local `development`. |

- [ ] Harden webhook verify  
- [ ] Unit test: missing secret → 400 in staging-like env  

---

## A4. `dev-activate` still usable when Stripe unset in production

| | |
| :--- | :--- |
| **Issue** | Blocked only if `ENVIRONMENT==production` **and** Stripe enabled. Prod without Stripe still allows admin plan upgrades. |
| **Evidence** | `routes_billing.py` `dev_activate` |
| **Risk** | Accidental or malicious plan elevation in “prod-like” deploys. |
| **Fix** | Disable for `staging` and `production` unless `ALLOW_DEV_BILLING=true`. |

- [ ] Gate `dev-activate`  
- [ ] Document in External APIs / Phase 5 notes  

---

## A5. Employee `/ai` overview hangs forever

| | |
| :--- | :--- |
| **Issue** | `AiOverviewPage` calls manager-only `/api/dashboard/*` with no error handling; employees get 403 → perpetual `Loading...`. |
| **Evidence** | `frontend/src/pages/AiOverviewPage.tsx`; `routes_dashboard_org.py` uses `require_manager_or_admin`; login lands on `/ai` |
| **Risk** | Primary employee UX path is broken (contradicts Phase 3). |
| **Fix** | Employee-safe overview (own activity / install CTA) **or** redirect employees to `/ai/events`; always handle errors + retry UI. |

- [ ] Employee-safe Overview  
- [ ] Error/empty states on Overview (and same Loading bug pattern on Billing/Events where applicable)  

---

# B. High — tenancy, quotas, auth UX

## B1. Threat detail / narrative / compare org checks incomplete

| | |
| :--- | :--- |
| **Evidence** | `backend/app/api/v1/routes_threats.py` — detail only checks when both sides have `org_id`; narrative/compare lack org checks |
| **Fix** | Shared helper: JWT/org principals must match doc `org_id`; 404 on mismatch or missing org. Apply to narrative + compare. |

- [ ] Harden threat read APIs  

---

## B2. Custom rules are global (no `org_id`)

| | |
| :--- | :--- |
| **Evidence** | `RuleDocument` / `crud_rules.py` / `routes_rules.py` — no org field |
| **Risk** | One org’s rules affect all tenants. |
| **Fix** | Add `org_id`; scope CRUD + `get_active_rules()`; migrate existing rules. |

- [ ] Org-scoped rules  

---

## B3. Email analyze missing org + quota

| | |
| :--- | :--- |
| **Evidence** | `routes_analyze.py` `analyze_email` persists without `org_id`/`user_id`, no `assert_analyze_quota` |
| **Fix** | Reuse `_tenancy_ids` / `_org_for_quota` from main analyze. |

- [ ] Fix email analyze tenancy + quota  

---

## B4. Batch analyze skips quota (and org persistence)

| | |
| :--- | :--- |
| **Evidence** | `analyze_batch` — no quota; no org-scoped persistence |
| **Risk** | Cost/abuse + inconsistent history. |
| **Fix** | Enforce analyze quota (per URL or batch); optionally persist with `org_id`. |

- [ ] Fix batch analyze  

---

## B5. Legacy `API_KEY` lists all orgs’ threats

| | |
| :--- | :--- |
| **Evidence** | `require_jwt_or_api_key` → `_principal_org_id` is `None` for API key → `list_threats` unfiltered |
| **Fix** | Do not ship dashboard on shared API key; restrict global key to ops, or bind machine keys to an org. |

- [ ] Constrain API-key threat access  

---

## B6. Quota tests incomplete

| | |
| :--- | :--- |
| **Evidence** | `test_phase6_billing_quota.py` covers seat 429; events/analyzes 429 and Stripe webhook not tested. Pytest collection also **errors** on `tests/test_risk_engine.py` (`score_text` import missing) — suite not fully green if run as whole. |
| **Fix** | Add event/analyze quota tests; fix or quarantine broken `test_risk_engine.py`; add webhook signature tests. |

- [ ] Quota 429 tests (events + analyzes)  
- [ ] Fix/quarantine `test_risk_engine.py`  
- [ ] Webhook signature tests  

---

## B7. Manager role not creatable in UI

| | |
| :--- | :--- |
| **Evidence** | `TeamUsersPage.tsx` hardcodes `role: 'employee'`; seed has no manager |
| **Fix** | Invite role selector; seed demo manager; document promotion. |

- [ ] Manager invite UI + seed  

---

## B8. Employees cannot copy their own `user_token`

| | |
| :--- | :--- |
| **Evidence** | Token shown only on admin Team / Admin Verify; `AuthContext` has token but never shows it; Install guide needs it |
| **Fix** | Employee “My extension setup” panel (user token + org instructions). |

- [ ] Employee token surface  

---

## B9. Overview checklist / Topbar alerts ignore role

| | |
| :--- | :--- |
| **Evidence** | Overview links to admin routes for all roles; Topbar bell → `/ai/alerts` (manager-only) |
| **Fix** | Role-gate checklist and Topbar actions. |

- [ ] Role-aware Overview + Topbar  

---

## B10. Phase status honesty (docs)

| | |
| :--- | :--- |
| **Issue** | Master Plan marks Phases 6–7 **Done** while extension matrix, UI E2E, cloud staging, Stripe checkout remain open. |
| **Fix** | Downgrade to “API/local complete; manual/cloud open”; uncheck unverified §7.1 cloud boxes. |

- [ ] Correct Master Plan + tracking board status  
- [ ] Fill or attach evidence for `ops/Phase7_Acceptance_Checklist.md` when cloud runs  

---

# C. Medium — correctness, security hygiene, product honesty

## C1. `/api/report` claims vaulted persistence

| | |
| :--- | :--- |
| **Evidence** | `routes_report.py` — mock success messaging |
| **Fix** | Persist org-scoped report **or** return explicit `accepted_unpersisted` and stop “vaulted” language. |

- [ ] Honest report API  

---

## C2. Domain reputation route is simulated

| | |
| :--- | :--- |
| **Evidence** | `GET /api/analyze/domain` sets `simulated=True` (separate from real Safe Browsing/VT in URL service) |
| **Fix** | Wire real clients when keys present, or keep simulated but exclude from live-intel claims. |

- [ ] Align domain intel with keys / docs  

---

## C3. OpenAPI `/docs` open in staging/prod

| | |
| :--- | :--- |
| **Evidence** | `main.py` always exposes docs |
| **Fix** | Disable `docs_url`/`redoc_url` when `ENVIRONMENT in (staging, production)`. |

- [ ] Gate docs  

---

## C4. Login email not unique globally

| | |
| :--- | :--- |
| **Evidence** | `User.find_one(email=...)`; compound `(org_id, email)` index not unique |
| **Fix** | Unique email globally **or** org-slug login + unique `(org_id, email)`. |

- [ ] Unique email / login model  

---

## C5. OpenAI proxy attribution & client provider keys

| | |
| :--- | :--- |
| **Evidence** | `routes_proxy.py` — traffic attributed to first admin; `X-Real-Provider-Key` allowed |
| **Fix** | Require employee token; disallow client provider keys in prod; apply event quota. |

- [ ] Harden proxy  

---

## C6. Prompt text returned in full to managers

| | |
| :--- | :--- |
| **Evidence** | `serializers_org.py` event list includes full `prompt_text` |
| **Fix** | Role-based redaction / reveal; align with Privacy Policy. |

- [ ] Prompt visibility policy in API  

---

## C7. Index alignment

| | |
| :--- | :--- |
| **Evidence** | Some collections only in `ensure_indexes.py`; events lack unique sparse `(org_id, user_id, client_submit_id)` |
| **Fix** | Align Beanie Settings with script; unique dedupe index. |

- [ ] Index parity + dedupe  

---

## C8. Frontend Loading / error UX

| | |
| :--- | :--- |
| **Evidence** | Billing treats null status as infinite Loading; Events load lacks catch |
| **Fix** | Explicit error + retry on Guard pages. |

- [ ] Guard page error states  

---

## C9. Dead / stale documentation links

| | |
| :--- | :--- |
| **Issue** | Docs still point at deleted `sources/aisentinel/`, `cybersentinel-ml-api/`, root `models/`. |
| **Evidence** | e.g. `hf_space_deployment_guide.md`, `LOCAL_DEV_MERGED.md` Mode B, `Phase0`/`Phase1` seed paths, `run-local.ps1` `-Mode aisentinel-source` |
| **Fix** | Retarget or delete modes; mark reference docs historical. |

- [ ] Sweep broken paths  
- [ ] Remove or stub `aisentinel-source` run-local mode  

---

## C10. README still API-key-centric

| | |
| :--- | :--- |
| **Issue** | README emphasizes shared `X-API-Key` / Explainer-only console; underplays JWT Guard `/ai/*` and extension tokens. |
| **Fix** | Rewrite Quick Start for signup → JWT → `/ai` → extension tokens; Gemini-only note; remove dead `models/` tree. |

- [ ] README rewrite for merged product  

---

## C11. Legal / Store placeholders

| | |
| :--- | :--- |
| **Issue** | `@cybersentinel.example` emails; Store screenshots/smoke unchecked; Privacy URL not public HTTPS until frontend hosted. |
| **Fix** | Real support/security mailboxes; complete Store checklist before submit. |

- [ ] Replace placeholder emails  
- [ ] Store screenshots + functional smoke  

---

## C12. Invites = manual only (no SMTP)

| | |
| :--- | :--- |
| **Status** | Documented intentional gap |
| **Enhancement** | Add Resend/SendGrid later (see External APIs guide). |

- [ ] (Enhancement) Wire transactional email  

---

## C13. Shadow AI script loaded but unused

| | |
| :--- | :--- |
| **Evidence** | `extension/engine/shadow-ai.js` in manifest; never called (post-v1) |
| **Fix** | Remove from content_scripts until feature ships (reduces Store review risk). |

- [ ] Drop unused shadow-AI injection  

---

## C14. `VITE_USE_MOCKS` / demo login prefill

| | |
| :--- | :--- |
| **Risk** | Split-brain UI (mock Explainer + real Guard); Login prefills `admin@demo.com` always |
| **Fix** | Banner when mocks on; prefill only in `import.meta.env.DEV`. |

- [ ] Mocks banner + DEV-only prefill  

---

## C15. Retention purge not implemented

| | |
| :--- | :--- |
| **Evidence** | `doc/legal/Data_Retention.md` says purge should be scheduled; no job found |
| **Fix** | Cron/script for 90-day purge aligned with Privacy Policy, or soften legal claim. |

- [ ] Retention job or legal wording sync  

---

# D. Low — polish & enhancements

- [ ] **D1** Topbar search is decorative (no handler) — implement or remove  
- [ ] **D2** Empty 429 upgrade soft-nudge block in `client.ts` — finish or remove  
- [ ] **D3** Reduce `// @ts-nocheck` on Guard pages; type API responses  
- [ ] **D4** Public `GET /api/billing/plans` — confirm intentional catalog  
- [ ] **D5** Redis fail-open — document in Admin Verify / ops (already fail-open by design)  
- [ ] **D6** Narrow extension `<all_urls>` before Chrome Web Store submit  
- [ ] **D7** Geo analytics fake hash regions — label UI as demo or replace with real GeoIP later  
- [ ] **D8** Add `OPENAI_API_KEY=` commented to `.env.example` files  
- [ ] **D9** Cross-cutting Master Plan: changelog, threat-model one-pager, dependency audit, CI on PR  
- [ ] **D10** Shared secrets vault / project board (Phase 0 optional ops)  
- [ ] **D11** Optional Gemini auto-explain on medium+ AI events (Master §2.3 still open — enhancement)  
- [ ] **D12** Soften `ScanForm` copy that still names deleted `cybersentinel-ml-api`  

---

# E. Open verification gates (not “code bugs,” but incomplete phases)

These block honest “Phases 6–7 complete” and Phase 8 Go:

### E1. Phase 6 — UI E2E (manual)

- [ ] Signup → Admin Verify → invite → accept  
- [ ] AI event appears in dashboard  
- [ ] Alert ack → enforcement action  
- [ ] Threat scan + history advanced fields  
- [ ] Billing status / upgrade UX  
- [ ] Analytics error UI  

### E2. Phase 6 — Extension matrix (manual)

- [ ] ChatGPT prompt ingest  
- [ ] Claude prompt ingest  
- [ ] Gemini prompt ingest  
- [ ] Google Search path (if in scope)  
- [ ] Phishing URL warn (Quickball)  
- [ ] Blackout enforcement  
- [ ] Close AI tabs enforcement  
- [ ] Chrome latest + Edge smoke  

### E3. Phase 7 — Cloud staging

- [ ] Atlas + `ensure_indexes`  
- [ ] Render (or equiv) API HTTPS  
- [ ] Vercel frontend + CORS  
- [ ] `staging_smoke` against HTTPS  
- [ ] Extension against staging API  
- [ ] Stripe TEST checkout **or** documented skip  
- [ ] Filled acceptance checklist + URLs in dry-run addendum  

---

# F. What is already in good shape

Do **not** rebuild these; they passed audit as present:

- JWT signup/login/me/accept-invite; org + user tokens  
- Events ingest + server DLP + alerts + enforcement pull/complete  
- Main `/api/analyze` org scoping + analyze quota (non-email)  
- Plans/quotas service + seat enforcement + trial on signup  
- Staging secret hardening (`ENVIRONMENT=staging|production`)  
- Agents debug router gated off in staging/prod  
- Legal routes `/privacy` `/terms` + install guide page  
- Extension empty popup defaults; org/user token auth path  
- Phase 6 **28** targeted pytest files (when broken `test_risk_engine` excluded)  
- Local staging smoke script 15/15  
- Ops runbooks: Staging, Mongo backup, Incident Response, External APIs guide  

---

# G. Recommended fix order (execution)

| Wave | IDs | Goal |
| :---: | :--- | :--- |
| **1** | A1, A2, B1, B2, B3, B4, B5 | Stop cross-tenant leaks |
| **2** | A3, A4, C3 | Billing + docs hardening |
| **3** | A5, B7, B8, B9, C8 | Employee/admin UX usable |
| **4** | B6, B10, C9, C10 | Tests + honest docs/README |
| **5** | C1, C2, C4–C7, C11–C15, D* | Medium/low hygiene |
| **6** | E1–E3 | Manual matrices + cloud staging |
| **7** | — | Phase 8 only after Wave 1–2 + E gates |

---

# H. Go / No-Go for Phase 8

| Decision | Condition |
| :--- | :--- |
| **No-Go** production cutover now | Critical A1–A5 open; no cloud staging; extension matrix open |
| **Conditional Go** for Phase 8 *prep* only | Start cutover checklist / prod env templates while Wave 1–2 fixes land |
| **Go** Phase 8 cutover | Wave 1–2 closed + E2/E3 evidence filed + real support emails + Stripe path decided |

---

## Change log

| Date | Note |
| :--- | :--- |
| 2026-09-09 | Initial audit after Phases 0–7 claim; evidence from code + docs + pytest collect |
| 2026-09-09 | **Wave 1–5 fixes landed** — see “Remediation progress” below |

---

## Remediation progress (2026-09-09)

### Fixed in code

- [x] **A1** Stats/timeline/geo org-scoped  
- [x] **A2** WebSocket org rooms (no cross-tenant broadcast)  
- [x] **A3** Stripe webhook requires secret outside development  
- [x] **A4** `dev-activate` gated by `ALLOW_DEV_BILLING` (off in staging/prod)  
- [x] **A5** Employee `/ai` overview + error/retry; token panel  
- [x] **B1** Threat detail/narrative/compare org checks  
- [x] **B2** Custom rules org-scoped  
- [x] **B3/B4** Email + batch analyze tenancy/quota  
- [x] **B5** Bare API key cannot list threats/stats  
- [x] **B6** Isolation + analyze quota tests; legacy risk_engine tests quarantined (`tests/_legacy/`) — **43 pytest passed**  
- [x] **B7–B9** Manager invite role UI; employee token; Topbar role gate  
- [x] **C1** Report API honest `accepted_unpersisted`  
- [x] **C3** `/docs` disabled in staging/production  
- [x] **C4** Signup rejects duplicate email  
- [x] **C5** Proxy requires user token; no client provider key in staging/prod  
- [x] **C6** Prompt full text only for managers (list); owners on detail  
- [x] **C8** Billing/Events error states  
- [x] **C9** `run-local` aisentinel mode removed; HF guide retargeted  
- [x] **C13** Unused shadow-ai.js dropped from extension manifest  
- [x] **C14** Login demo prefill DEV-only  

### Still open (ops / manual / enhancement)

- [ ] **B10 / E1–E3** Cloud staging + extension matrix + UI E2E (manual)  
- [ ] **C10** Full README rewrite for JWT-first onboarding  
- [ ] **C11** Real support@ emails + Store screenshots  
- [ ] **C12** SMTP invites  
- [ ] **C15** Retention purge job  
- [ ] **D*** Remaining polish items  
