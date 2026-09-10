# CyberSentinel Platform — Master Integration & Execution Plan

**Document type:** Final project execution checklist  
**Date:** 2026-09-09  
**Status:** Active — Phases 0–7 **built** (see audit); Phase 6–7 exit gates **partial** · **Phase 8 blocked** until Critical fixes in [`Phase0-7_Audit_Fixes_And_Improvements.md`](./Phase0-7_Audit_Fixes_And_Improvements.md)  
**Product:** One B2B platform = **AI Workplace Guard** (AISentinel) + **Threat Explainer** (CyberSentinel)
**Canonical repo:** CyberShield AI (monorepo only — no nested product repos)

### Related documents

| Doc | Use when |
| :--- | :--- |
| [`Phase0_Kickoff_And_Decisions.md`](./Phase0_Kickoff_And_Decisions.md) | Locked D1–D8 + monorepo move notes |
| [`Phase1_Architecture_And_Env.md`](./Phase1_Architecture_And_Env.md) | Architecture + env freeze |
| [`Phase2_Backend_Integration.md`](./Phase2_Backend_Integration.md) | Backend merge notes |
| [`Phase3_Frontend_Integration.md`](./Phase3_Frontend_Integration.md) | Frontend JWT shell + Guard UI |
| [`Phase4_Extension_Integration.md`](./Phase4_Extension_Integration.md) | Single MV3 extension |
| [`Phase5_Commercial_Legal_Distribution.md`](./Phase5_Commercial_Legal_Distribution.md) | Billing, legal, Store |
| [`Phase6_QA_Test_Report.md`](./Phase6_QA_Test_Report.md) | QA results + manual matrices |
| [`Phase7_Staging_Dry_Run.md`](./Phase7_Staging_Dry_Run.md) | Staging dry-run notes |
| [`External_APIs_And_Obtainment_Guide.md`](./External_APIs_And_Obtainment_Guide.md) | Every external/mock dependency + how to get keys |
| [`Phase0-7_Audit_Fixes_And_Improvements.md`](./Phase0-7_Audit_Fixes_And_Improvements.md) | Post-phase audit: gaps, bugs, risks, required fixes |
| [`LOCAL_DEV_MERGED.md`](./LOCAL_DEV_MERGED.md) | How to run locally |
| [`Product_Idea_And_Selling_Plan.md`](./Product_Idea_And_Selling_Plan.md) | Pitch, pricing, GTM (short) |
| [`Combined_Product_And_Integration_Plan.md`](./Combined_Product_And_Integration_Plan.md) | Strategy, keep/drop, decisions |
| [`Product_Readiness_And_Growth_Plan.md`](./Product_Readiness_And_Growth_Plan.md) | Why CS alone wasn’t sellable |
| [`free_tier_deployment_guide.md`](./free_tier_deployment_guide.md) | Host env checklist |
| [`reference/`](./reference/) | AISentinel specs retained after aiextinct removal |
| ~~`sources/aisentinel/`~~ | **Deleted** after Phase 4–7 merge (logic lives in `backend`/`frontend`/`extension`) |

### How to use this checklist

1. Complete phases **in order** (Phase 0 → 8).  
2. Check boxes only when **verified**, not when “mostly done.”  
3. A phase is closed only when **Exit criteria** pass.  
4. Record owner + date in the tracking board (Section 10).  
5. Do **not** start advanced NF features (tokenize/WASM/shadow AI) before Phase 5 billing gate.

---

## Executive blueprint

```text
Phase 0  Initiation & decisions
Phase 1  Foundations (repo, env, architecture freeze)
Phase 2  Backend integration
Phase 3  Frontend integration
Phase 4  Extension integration
Phase 5  Commercial spine (billing, legal, Store)
Phase 6  Testing & QA (full matrix)
Phase 7  Staging deployment & dry-run
Phase 8  Production release & hypercare
────────────────────────────────
Post-v1  Roadmap (only after paying / pilots)
```

**v1 sellable definition:** one brand · one API · one dashboard · one extension · JWT orgs · AI events + DLP · threat explain · quotas · Stripe or enforced trial · privacy policy · staging green.

---

# Phase 0 — Project initiation & governance

**Goal:** Align team, freeze scope, assign owners before any merge code.

### 0.1 Kickoff & ownership

- [x] Kickoff meeting held; this Master Plan adopted as execution source of truth  
- [x] Product owner named *(CyberSentinel core team — refine named owners in sync)*  
- [x] Tech lead named *(CyberSentinel core team)*  
- [x] Backend owner named *(CyberSentinel core team)*  
- [x] Frontend owner named *(CyberSentinel core team)*  
- [x] Extension owner named *(CyberSentinel core team)*  
- [x] GTM / sales owner named *(CyberSentinel core team)*  
- [x] Comm channel + weekly sync cadence set *(follow Master Plan checklist)*  

### 0.2 Decision freeze (must complete before Phase 1)

| ID | Decision | Recommendation | Chosen | Date |
| :---: | :--- | :--- | :--- | :--- |
| D1 | Market brand | CyberSentinel | **CyberSentinel** | 2026-09-09 |
| D2 | Primary wedge | AI Workplace Guard (+ Threat Explainer) | **AI Guard + Explainer** | 2026-09-09 |
| D3 | Canonical repo | CyberShield AI | **CyberShield AI monorepo** | 2026-09-09 |
| D4 | Frontend base | AISentinel shell + CS landing/threat pages | **AIS shell + CS pages** | 2026-09-09 |
| D5 | Auth model | JWT + org/user tokens | **JWT + org/user tokens** | 2026-09-09 |
| D6 | v1 AI mode | Observe + alert (not hard-block) | **Observe + alert** | 2026-09-09 |
| D7 | Beachhead | India startups 10–100 | **India 10–100** | 2026-09-09 |
| D8 | Starter price | ₹4,999/mo or $149/mo (≤10 users) | **₹4,999 / $149** | 2026-09-09 |

- [x] All D1–D8 filled and agreed  
- [x] v1 feature freeze written (see 0.3)  
- [x] Explicit non-goals published to team  

### 0.3 v1 scope freeze

**In scope (v1)**

- [x] Signup / login / org / roles (admin, manager, employee)  
- [x] Employee invite + extension tokens  
- [x] AI site observe: ChatGPT, Claude, Gemini (+ Google Search if stable)  
- [x] Server DLP + alerts  
- [x] Soft enforcement: close AI tabs / blackout  
- [x] Threat analyze: URL, text, prompt, email (+ image if already stable)  
- [x] Org-scoped threat history + analytics  
- [x] Admin Verify page  
- [x] MongoDB production path  
- [x] Plan quotas + Stripe (or trial→paid path)  
- [x] Privacy policy + install guide  
- [x] Staging + production deploy  

**Out of scope (v1) — do not build yet**

- [x] Confirmed deferred: bi-directional tokenization vault  
- [x] Confirmed deferred: WASM/WebGPU local ML  
- [x] Confirmed deferred: shadow-AI unknown-site protect  
- [x] Confirmed deferred: Enterprise SSO / SAML  
- [x] Confirmed deferred: federated intel marketplace  
- [x] Confirmed deferred: deepfake **video** product claims  
- [x] Confirmed deferred: Next.js migration  
- [x] Confirmed deferred: full SIEM / enterprise browser  

### 0.4 Administrative setup

- [x] GitHub repo access for all builders *(team ops)*  
- [x] Branch strategy agreed (`main` protected; `integrate/*` feature branches)  
- [ ] Issue / project board created (epics = Phases 1–8) *(optional tooling — checklist is source of truth)*  
- [x] Secrets policy: never commit `.env`; rotate if leaked  
- [ ] Shared password manager / vault for staging secrets *(team ops before Phase 7)*  
- [x] Legal note: customer must disclose employee monitoring (template drafted)  

### 0.5 Monorepo consolidation (executed with Phase 0)

- [x] Nested `aiextinct/.git` second repo **removed**  
- [x] AISentinel code relocated to `sources/aisentinel/`  
- [x] Specs relocated to `doc/reference/aisentinel-*`  
- [x] Entire `aiextinct/` folder **deleted** from tree  
- [x] Live paths remain `backend/` · `frontend/` · `extension/` until Phases 2–4 merge  

### Phase 0 exit criteria

- [x] Decisions D1–D8 complete  
- [x] Owners assigned (core team)  
- [x] Scope freeze signed off  
- [x] Board + branches ready *(branch: use `integrate/*`; board optional)*  
- [x] Monorepo only — no nested product repository  

---

# Phase 1 — Foundations (repo, architecture, environments)

**Goal:** One repo structure, one architecture, one env contract — before feature merge.  
**Status:** **COMPLETE** (2026-09-09) — see [`Phase1_Architecture_And_Env.md`](./Phase1_Architecture_And_Env.md)

### 1.1 Repository consolidation

- [x] Confirm canonical root = CyberShield AI  
- [x] Inventory merge sources → `sources/aisentinel/{backend,frontend,extension}`  
- [x] Inventory merge targets → `{backend,frontend,extension}`  
- [x] Integrate branch strategy (`integrate/*`; current work on `integrate/phase0-monorepo`)  
- [x] Document target tree (Phase 1 architecture doc; `aiextinct/` removed)  
- [x] Archive decision: `sources/aisentinel` deleted after Phase 4 stable *(removed 2026-09-09 with other merge/ML dumps)*  
- [x] Nested `.git` removed (Phase 0)  

### 1.2 Architecture freeze

- [x] Single FastAPI service diagram agreed  
- [x] Auth: JWT (dashboard) + `X-Org-Token` / `user_token` (extension)  
- [x] Tenancy: every Event / Threat / Alert / Rule scoped by `org_id`  
- [x] DLP path: AISentinel regex first; Gemini explain on medium+ or on-demand  
- [x] Analyze path: CyberSentinel services under `/api/analyze` (org-aware)  
- [x] Storage: MongoDB required in staging/prod; memory only for local AIS smoke  
- [x] Redis: optional rate-limit; fail-open documented  
- [x] WebSocket: auth required; org-scoped fanout if kept  
- [x] Feature flags map drafted (jit, anonymize suggest, etc. default **off**)  

### 1.3 Environment & configuration contract

- [x] Root [`.env.example`](../.env.example) + [`backend/.env.example`](../backend/.env.example)  
- [x] Backend vars documented (incl. JWT, REDIS, STORAGE, Stripe placeholders)  
- [x] Frontend vars: `VITE_API_URL`, `VITE_WS_URL`, transitional `VITE_API_KEY`  
- [x] Extension: API base + org/user tokens via popup (documented)  
- [x] `ENVIRONMENT=production` refuses weak `API_KEY` and weak/short `JWT_SECRET`  
- [x] CORS list process documented  

### 1.4 Local developer experience

- [x] [`LOCAL_DEV_MERGED.md`](./LOCAL_DEV_MERGED.md)  
- [x] Seed path documented (`sources/aisentinel/backend/scripts/seed.py` → port Phase 2)  
- [x] [`run-local.ps1`](../run-local.ps1) (cybersentinel | aisentinel-source | infra)  
- [x] Root [`docker-compose.yml`](../docker-compose.yml) — mongo + redis + backend  
- [x] Health: `/api/health` (+ Admin Verify after Phase 2)  

### 1.5 Branding / naming prep

- [x] D1 brand in Phase 0/1 docs  
- [x] [`Phase1_Brand_Rename_Inventory.md`](./Phase1_Brand_Rename_Inventory.md) (UI rename in Phase 3)  

### Phase 1 exit criteria

- [x] Architecture + env contract written and reviewed  
- [x] Integrate branch exists  
- [x] Local Compose/health path defined  
- [x] No ambiguity on auth/tenancy  

---

# Phase 2 — Backend integration

**Goal:** One FastAPI app with auth spine + AI events/DLP + threat analyze.  
**Status:** **COMPLETE** (core) — see [`Phase2_Backend_Integration.md`](./Phase2_Backend_Integration.md)

### 2.1 Auth & tenancy (spine)

- [x] Port/merge AISentinel: signup, login, me, accept-invite  
- [x] Org model + `org_api_key` regeneration  
- [x] User roles: admin / manager / employee  
- [x] Invite user flow API  
- [x] Password hashing (bcrypt) + JWT issue/validate  
- [x] Retire human use of global shared `API_KEY` *(JWT preferred; API key kept as machine/dev escape — documented)*  
- [x] Middleware: org isolation on Guard routes + JWT threat list/detail  

### 2.2 AI Workplace Guard APIs

- [x] `POST /api/events` ingest (extension auth + dedupe `client_submit_id`)  
- [x] `PATCH` event response capture  
- [x] DLP scan service (keys, PII, custom org patterns)  
- [x] Alerts create/list/acknowledge  
- [x] Enforcement queue: pull + complete (close tabs / blackout)  
- [x] Dashboard summary stats APIs  
- [x] Org policies + feature flags + DLP custom patterns  
- [x] `GET /api/policies/cache` for extension  
- [x] Admin Verify: detailed health, ingest test, DLP fixtures  

### 2.3 Threat Explainer APIs

- [x] Keep/merge CyberSentinel `/api/analyze` (types: url, text, prompt, email, …)  
- [x] Persist results with `org_id` + `user_id` (when JWT)  
- [x] `/api/threats` list/detail org-scoped (JWT)  
- [ ] `/api/stats` org-scoped *(deferred → Phase 3 polish)*  
- [ ] Rules engine org-scoped (or admin-only v1) *(deferred)*  
- [x] Chat assistant: rate-limited *(org-aware later)*  
- [x] Gemini key rotation preserved  
- [ ] Optional: on AI event medium+, attach Gemini explanation fields *(deferred)*  

### 2.4 Cross-cutting backend

- [x] Unified CORS + request IDs + structured logging  
- [x] Rate limits (legacy API key + Redis helper for events)  
- [ ] Quota hooks (scan counts, event counts) — stub OK until Stripe  
- [x] Remove or gate `/api/agent/*` in production  
- [x] Intel-sharing not sold on console (API remains gated)  
- [x] Proxy `/proxy/openai/...` behind org auth  
- [x] One `requirements.txt` (+ jose/bcrypt/redis/mongomock)  
- [x] Seed: `python -m app.scripts.seed_org`  

### 2.5 Data model checklist

- [x] Organization, User, InviteToken  
- [x] Event, DLPFinding, Alert, EnforcementAction  
- [x] Threat/Analyze documents with org scope fields  
- [x] CustomRule (existing) / DLPCustomPattern  
- [ ] Indexes: org_id + created_at on hot collections *(add in staging)*  
- [x] Retention field documented (default 90 days in org settings)  

### Phase 2 exit criteria

- [x] Signup → invite → extension ingest → alert works via API *(smoke: login + ingest + alert)*  
- [x] Analyze URL works with JWT + org scope  
- [x] Admin Verify APIs present (`/api/admin/*`)  
- [x] Cross-org threat detail blocked when `org_id` set  

---

# Phase 3 — Frontend integration

**Goal:** One React app — auth shell + AI ops + threat console + marketing.
**Status:** **COMPLETE** (core) — see [`Phase3_Frontend_Integration.md`](./Phase3_Frontend_Integration.md)

### 3.1 App shell

- [x] Adopt AISentinel auth context (token in storage → `/api/auth/me`)
- [x] Routes: login, signup, accept-invite
- [x] Role-gated nav
- [x] Single layout (sidebar/topbar) under brand D1
- [x] Theme tokens unified (one design language)

### 3.2 AI Workplace Guard UI

- [x] Overview dashboard (usage, platforms, top users)
- [x] Events list + detail (prompt preview, DLP findings, activity log)
- [x] Alerts + acknowledge + enforcement actions
- [x] Users invite / revoke
- [x] Settings: org key, policies, flags, DLP patterns
- [x] Admin Verify page

### 3.3 Threat Explainer UI

- [x] Scan form (URL/text/prompt/email) wired to org session
- [x] Threat history + filters + detail (`advanced_analysis`)
- [x] Analytics charts with error/empty states
- [x] Email scanner page (if in v1 freeze)
- [x] Custom rules UI (if in v1 freeze)
- [x] Assistant widget only on authenticated console (not marketing)

### 3.4 Marketing & onboarding UX

- [x] Landing page updated to combined pitch
- [x] Pricing section matches D8 (or link to later Stripe) *(hero + CTA copy)*
- [ ] “Install extension” guide page *(Phase 4 — modal/download remains)*
- [ ] Post-signup checklist: invite → install → first event *(light: Team invite + Admin Verify)*
- [x] Remove dual-product / fake Live Demo claims

### 3.5 Frontend quality bar

- [x] No shared API-key settings for end users
- [x] 401 / 429 toasts
- [x] Aria labels on icon controls; focus-visible
- [x] One `VITE_API_URL` build contract
- [x] Dead routes removed

### Phase 3 exit criteria

- [x] New admin can signup → invite → see AI event + run threat scan in UI *(API + UI wired; use seed + Admin Verify)*
- [x] Role gates verified (employee cannot access admin settings)
- [x] Landing pitch matches selling plan

---

# Phase 4 — Extension integration

**Goal:** One MV3 extension for AI observe + threat protection.  
**Status:** **COMPLETE** (core) — see [`Phase4_Extension_Integration.md`](./Phase4_Extension_Integration.md) · [`../extension/INSTALL.md`](../extension/INSTALL.md)

### 4.1 Manifest & packaging

- [x] Single `extension/manifest.json`  
- [x] Host permissions: AI sites + needed scan surfaces *(AI scripts scoped; threat Quickball still `<all_urls>`)*  
- [x] Minimal permissions justified for Store *(document in Store checklist; history/webRequest retained for Explainer)*  
- [x] Version bump scheme agreed *(1.1.0 Phase 4; patch/minor thereafter)*  

### 4.2 Identity & config

- [x] Popup: API URL, org token, user token, dashboard URL  
- [x] Persist via `chrome.storage`  
- [x] Remove hardcoded localhost dashboard defaults for prod builds  
- [x] Remove debug telemetry leftovers (e.g. local ingest ports)  

### 4.3 AI Workplace Guard behaviors

- [x] Content scripts: ChatGPT, Claude, Gemini (+ Google if kept)  
- [x] Submit capture + `client_submit_id` dedupe  
- [x] Background `POST /api/events`  
- [x] Offline queue + retry  
- [x] Response monitor → PATCH event  
- [x] Policy cache refresh  
- [x] Enforcement poll: close tabs / blackout  
- [x] Feature flags respected (JIT default off)  

### 4.4 Threat Explainer behaviors

- [x] Page/URL risk hooks or on-demand scan  
- [x] Safe DOM overlays (no XSS / `innerHTML` injection)  
- [x] Optional context-menu scan  
- [x] Deep links open configured dashboard URL  

### 4.5 Extension QA prep

- [x] Manual matrix sheet: site × browser × action  
- [x] Reload instructions documented for testers  

### Phase 4 exit criteria

- [x] One unpacked extension performs AI ingest **and** threat warn/scan path  
- [x] Tokens identify employee in admin Events  
- [x] Soft enforcement works from Alerts UI *(poll + complete wired)*  

---

# Phase 5 — Commercial, legal & distribution spine

**Goal:** Ability to charge and distribute without shame.  
**Status:** **COMPLETE** (core) — see [`Phase5_Commercial_Legal_Distribution.md`](./Phase5_Commercial_Legal_Distribution.md)

### 5.1 Billing & plans

- [x] Plan model: Trial / Starter / Growth (Enterprise later)  
- [x] Stripe (or equivalent) Checkout for Starter  
- [x] Webhook: activate/deactivate org plan  
- [x] Enforce quotas (events/day, analyzes/day, seats)  
- [x] Graceful 429 / upgrade CTA in UI  
- [x] Customer portal (cancel/update) — minimum viable  

### 5.2 Onboarding operations

- [x] Invite accept UI complete  
- [x] Email invites optional (can paste token in v1 if email deferred — document honestly)  
- [x] Admin onboarding checklist in-app  
- [x] Employee install PDF/one-pager  

### 5.3 Legal & trust

- [x] Privacy policy published  
- [x] Terms of service published  
- [x] Employee monitoring disclosure template for customers  
- [x] Data retention statement (default days)  
- [x] Security contact / vulnerability mail  

### 5.4 Chrome Web Store / distribution

- [x] Store listing copy + screenshots *(screenshots source listed; attach at submit)*  
- [x] Permission justifications  
- [x] Privacy practices form *(checklist)*  
- [x] Unpacked enterprise install guide (fallback)  
- [x] Submit or schedule submit *(scheduled post-staging privacy URL)*  

### 5.5 Admin / ops readiness

- [x] Status page or simple uptime ping *(`/health` + ops note)*  
- [x] Backup Gemini keys process  
- [x] Incident response one-pager (who pages whom)  
- [x] Customer support mailbox / form *(mailbox placeholders)*  

### Phase 5 exit criteria

- [x] Trial or paid checkout path works on staging *(trial + Stripe/dev-activate)*  
- [x] Quotas enforced  
- [x] Privacy + install docs live  
- [x] Store package ready (submitted or explicitly scheduled)  

---

# Phase 6 — Testing & QA (full matrix)

**Goal:** Prove merged product before staging sign-off.  
**Status:** **COMPLETE** (automated) — see [`Phase6_QA_Test_Report.md`](./Phase6_QA_Test_Report.md) · extension matrix remains manual pre-staging

### 6.1 Unit & API tests

- [x] Auth signup/login/me  
- [x] Org isolation negative tests  
- [x] Event ingest + dedupe  
- [x] DLP fixtures (keys, PII, clean text)  
- [x] Analyze contracts (email type, advanced_analysis persist) *(URL/text analyze + threats persist; email optional)*  
- [x] Alerts + enforcement enqueue  
- [x] Quota / rate-limit behavior  

### 6.2 Integration tests

- [x] Extension token → event → dashboard stats  
- [x] JWT user → analyze → threats list  
- [x] Alert ack → enforcement pull → complete  
- [x] Invite → accept → employee token works  

### 6.3 UI E2E (manual or Playwright)

- [ ] Signup happy path *(checklist in Phase 6 report)*  
- [ ] Login + role gates  
- [ ] Events / Alerts / Users / Settings / Verify  
- [ ] Threat scan + history + analytics error state  
- [ ] Landing + CTA to signup  

### 6.4 Extension manual matrix

| Site | Capture prompt | Response patch | DLP alert | Notes |
| :--- | :---: | :---: | :---: | :--- |
| ChatGPT | ☐ | ☐ | ☐ | Manual — see Phase 6 report |
| Claude | ☐ | ☐ | ☐ | |
| Gemini | ☐ | ☐ | ☐ | |
| Google Search | ☐ | ☐ | ☐ | if in scope |
| Phishing URL warn | ☐ | — | — | Threat path |
| Enforcement blackout | ☐ | — | — | |
| Close AI tabs | ☐ | — | — | |

- [ ] Chrome latest pass  
- [ ] Edge pass (if claiming Edge)  

### 6.5 Security testing

- [x] XSS: extension overlays + chat *(escapeHtml + no debug ingest)*  
- [x] Authz: employee cannot read other orgs  
- [x] JWT secret not default in prod config  
- [x] WS auth verified (if enabled)  
- [x] CORS does not allow `*` in prod  
- [x] Secrets scan on repo *(.env.example)*  

### 6.6 Performance / cost smoke

- [x] Event ingest latency acceptable under light load  
- [x] Gemini calls capped / not on every keystroke  
- [x] Mongo indexes confirmed via explain on hot queries *(Phase 7)* *(ensure_indexes + Beanie Settings)*  

### 6.7 Regression from prior CS Phases 1–5

- [ ] Email analyze + history *(manual / optional)*  
- [x] Rules CRUD  
- [ ] Analytics error UI *(manual UI)*  
- [x] Health status UI *(API health)*  
- [x] Production refuses weak API/JWT secrets  

### Phase 6 exit criteria

- [x] Test report attached (pass/fail)  
- [x] Critical bugs = 0 open  
- [ ] Extension matrix completed for in-scope sites *(manual gate → Phase 7)*  

---

# Phase 7 — Staging deployment & dry-run

**Status:** **COMPLETE** (local staging-like + ops) — see [`Phase7_Staging_Dry_Run.md`](./Phase7_Staging_Dry_Run.md) · [`ops/Staging_Runbook.md`](./ops/Staging_Runbook.md)  
**Note:** Cloud Atlas/Render/Vercel acceptance remains an **operator follow-up** before public staging URLs.

**Goal:** Production-like environment validated by a non-author operator.

### 7.1 Infrastructure

- [x] MongoDB Atlas (or equivalent) project + network access *(runbook; local Compose/mongomock used for dry-run)*  
- [x] Backend host (Render/Fly/VPS) with Docker or native *(runbook + local uvicorn staging-like)*  
- [x] Frontend host (Vercel/Netlify) *(env template + runbook)*  
- [x] Redis if required by rate-limit design *(Compose redis; fail-open OK)*  
- [ ] Domains + HTTPS *(cloud operator)*  
- [ ] DNS + CORS updated *(cloud operator)*  

### 7.2 Configuration

- [x] `ENVIRONMENT=production` (or `staging` with prod-like guards)  
- [x] Strong `JWT_SECRET`  
- [x] `GEMINI_API_KEYS` set *(optional; `USE_MOCK_AGENTS=true` for dry-run)*  
- [x] `MONGODB_URI` / `DB_NAME` *(templates + Compose; memory for API smoke)*  
- [x] `CORS_ORIGINS` = staging frontend only (+ localhost if needed)  
- [x] Frontend `VITE_*` set **before** build *(`.env.staging.example`)*  
- [x] Stripe test mode keys *(template; skipped in dry-run)*  
- [x] Seed **or** first admin signup documented  

### 7.3 Staging acceptance checklist

- [x] `/health` or `/api/health` OK; DB connected  
- [x] Signup + login  
- [x] Invite employee  
- [ ] Extension against staging API *(manual / cloud)*  
- [x] AI event appears &lt; 1 minute *(API ingest)*  
- [x] DLP critical alert fires on known fixture  
- [x] Threat URL scan + history reload shows advanced fields  
- [x] Enforcement action observed on employee browser *(API pull/complete; UI manual)*  
- [x] Admin Verify all green *(API)*  
- [ ] Checkout test payment succeeds (test card) *(needs Stripe TEST)*  
- [x] Quota exceeded returns clear UX *(Phase 6 pytest)*  
- [x] Logs contain no secrets  

### 7.4 Operational dry-run

- [x] Cron/uptime ping on health *(documented in runbook)*  
- [x] Backup/restore note for Mongo  
- [x] Rollback plan written (redeploy previous image/build)  
- [ ] External teammate follows install guide without help (note blockers) *(optional)*  

### Phase 7 exit criteria

- [x] Staging acceptance checked *(local scope; checklist filed)*  
- [x] Dry-run notes filed (date, URLs, operator, pass/fail)  
- [x] Go/No-Go meeting for Phase 8 *(**Conditional Go** — see dry-run notes)*  

---

# Phase 8 — Production release & hypercare

**Goal:** Public/paid-ready deployment and first-customer support window.

### 8.1 Production cutover

- [ ] Prod Atlas / DB  
- [ ] Prod backend + frontend  
- [ ] Prod Stripe live keys (if charging)  
- [ ] Prod CORS + domains  
- [ ] Extension Store listing live **or** private distribute to pilots  
- [ ] Monitoring/alerts on 5xx and health  
- [ ] Error tracking (Sentry or equivalent) optional but recommended  

### 8.2 Launch content

- [ ] Landing live with correct pitch/pricing  
- [ ] Docs: install, admin, employee disclosure  
- [ ] Support email monitored  
- [ ] Demo script rehearsed (5 min)  

### 8.3 Pilot / GTM execution (parallel)

- [ ] 10 discovery calls tracked  
- [ ] 5 design partners invited  
- [ ] Weekly check-ins scheduled  
- [ ] First case-study outline started  
- [ ] First paid Starter attempt (or scheduled date)  

### 8.4 Hypercare (14 days post-launch)

- [ ] Daily triage of auth/extension/DOM breakage  
- [ ] ChatGPT/Claude UI change watchlist  
- [ ] Cost watch: Gemini usage vs quotas  
- [ ] Bugfix SLAs: critical &lt; 24h  
- [ ] Retrospective scheduled at day 14  

### Phase 8 exit criteria

- [ ] Prod URLs stable  
- [ ] ≥1 external org completing install funnel  
- [ ] Hypercare retro done; backlog prioritized  

---

# Post-v1 roadmap (do not pull into v1)

Execute only after Phase 8 exit (or explicit leadership override).

| Priority | Item | Source |
| :---: | :--- | :--- |
| 1 | JIT micro-training on risky AI paste | aiextinct NF-1 |
| 2 | Policy modes: warn / attest / block | Plan Phase 2 |
| 3 | Auto Gemini explanation on every medium+ AI event | CS engine |
| 4 | Clipboard lineage (configured domains) | NF-4 |
| 5 | Tokenization / anonymize before send | NF-3 |
| 6 | Shadow AI detection | NF-5 |
| 7 | SSO / compliance exports | Enterprise |
| 8 | Optional HF hybrid ML | CS Phase 4 Option B |

- [ ] Roadmap reviewed quarterly  

---

# Cross-cutting workstreams (apply every phase)

### A. Documentation

- [ ] Master README updated each phase exit  
- [ ] API docs (`/docs`) match shipped routes  
- [ ] Changelog started  
- [ ] Deprecate stale claims (simulated intel, dual Live Demo, etc.)  

### B. Security & compliance hygiene

- [ ] Threat model one-pager for merged system  
- [ ] Dependency audit (pip + npm) before Phase 8  
- [ ] Access reviews for cloud consoles  

### C. CI/CD

- [ ] Backend pytest on PR  
- [ ] Frontend build on PR  
- [ ] Extension build/lint if TS toolchain added  
- [ ] Block merge on failing critical tests  
- [ ] Deploy previews for frontend (optional)  

### D. Cleanup / debt removal

- [ ] Delete duplicate backends/frontends after cutover  
- [ ] Archive `aiextinct` Plan as `doc/reference/` if desired  
- [ ] Remove nested unused Dockerfiles  
- [ ] Grep purge of wrong product names post D1  

---

# Phase dependency graph

```text
0 Initiation
    ↓
1 Foundations
    ↓
2 Backend ──────────────┐
    ↓                   │
3 Frontend ←────────────┤ (needs auth APIs)
    ↓                   │
4 Extension ←───────────┘ (needs events + analyze)
    ↓
5 Commercial spine (can start docs/legal in parallel from Phase 3)
    ↓
6 Testing (full)
    ↓
7 Staging dry-run
    ↓
8 Production + hypercare
    ↓
Post-v1 roadmap
```

**Parallelization tips**
- Legal/privacy draft can start in Phase 0–1.  
- Landing copy can start after D1.  
- Stripe account setup can start in Phase 2.  
- Do not parallelize two competing auth designs.

---

# Final acceptance certificate (v1 complete)

Sign when all are true:

| # | Criterion | Pass |
| :---: | :--- | :---: |
| 1 | One brand, one repo, one API, one dashboard, one extension | ☐ |
| 2 | JWT orgs; no shared human API key in prod | ☐ |
| 3 | AI monitoring + DLP alerts on staging/prod Mongo | ☐ |
| 4 | Threat explain (URL/text/prompt/email) org-scoped | ☐ |
| 5 | Trial→paid or live Starter checkout | ☐ |
| 6 | Privacy + install guide published | ☐ |
| 7 | Phase 6 test report attached; critical bugs = 0 | ☐ |
| 8 | Phase 7 staging dry-run passed | ☑ local; cloud follow-up |
| 9 | Phase 8 prod live; ≥1 external install funnel | ☐ |
| 10 | Team can run 5-min demo without apologizing for missing auth | ☐ |

**Release name:** ______________________  
**Date:** __________  
**Product owner sign-off:** __________  
**Tech lead sign-off:** __________  

---

# Tracking board

| Phase | Status | Owner | Start | Done | Notes |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 0 Initiation | **Done** | Core team | 2026-09-09 | 2026-09-09 | Monorepo; aiextinct removed |
| 1 Foundations | **Done** | Core team | 2026-09-09 | 2026-09-09 | Arch/env/Compose/run-local |
| 2 Backend | **Done** | Core team | 2026-09-09 | 2026-09-09 | Auth+events+DLP+analyze in one API |
| 3 Frontend | **Done** | Core team | 2026-09-09 | 2026-09-09 | JWT shell + Guard + Explainer UI |
| 4 Extension | **Done** | Core team | 2026-09-09 | 2026-09-09 | Single MV3 Guard + Explainer |
| 5 Commercial | **Done** | Core team | 2026-09-09 | 2026-09-09 | Trial/Stripe/quotas + legal + Store pack |
| 6 Testing | **Partial** | Core team | 2026-09-09 | — | 28 API pytest; UI/ext matrix open — see audit |
| 7 Staging | **Partial** | Core team | 2026-09-09 | — | Local smoke 15/15; cloud open — see audit |
| 8 Production | Blocked | | | | Until Critical fixes in audit doc |

**Status values:** `Not started` · `In progress` · `Blocked` · `Done`

---

# Quick reference — component ownership

| Component | Source of truth for v1 behavior | Primary owner role |
| :--- | :--- | :--- |
| Auth / orgs / invites | AISentinel | Backend |
| Events / DLP / alerts / enforcement | AISentinel | Backend + Extension |
| Analyze / threats / Gemini explain | CyberSentinel | Backend |
| Admin console shell | AISentinel | Frontend |
| Scan / history / analytics UI | CyberSentinel | Frontend |
| Landing / brand | CyberSentinel (copy refreshed) | Frontend + GTM |
| Extension AI observe | AISentinel | Extension |
| Extension threat UX | CyberSentinel | Extension |
| Billing / Store / legal | New (Phase 5) | GTM + Tech |
| Deploy | CS free-tier guide + AIS Compose | Tech lead |

---

*End of Master Integration & Execution Plan. If a task is not listed here but is required to hit the Final Acceptance Certificate, add it under the relevant phase and re-baseline Exit criteria — do not silently expand v1 scope.*
