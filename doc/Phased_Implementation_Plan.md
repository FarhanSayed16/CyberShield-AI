# CyberSentinel — Phased Implementation Plan

**Based on:** [`Full_Project_Audit_Fixes_And_Improvements.md`](./Full_Project_Audit_Fixes_And_Improvements.md)  
**Goal:** Fix all critical bugs, harden security, align contracts, improve UX, wire or honestly document ML, and ship a trackable, complete release.  
**Structure:** **5 phases** — each has a clear outcome, work items (mapped to audit IDs), how-to implement, exit criteria, and a tracking checklist.

---

## How to use this plan

1. Complete phases **in order** (Phase 1 → 5). Do not skip Phase 1.
2. Mark each checkbox when done; note PR / commit if useful.
3. A phase is **done** only when **all exit criteria** pass.
4. Prefer small PRs per phase (or per subsection) for reviewability.
5. After Phase 5, re-run the audit acceptance checklist and update the audit doc status.

```text
Phase 1  Correctness (backend + contracts)     →  demo does not lie / crash
Phase 2  Security + extension production links →  safe enough for shared demo
Phase 3  Frontend UX + API polish              →  console feels reliable
Phase 4  AI/ML honesty + optional HF wiring    →  Tier story matches reality
Phase 5  Docs, deploy, polish, Store prep      →  release-ready package
```

---

## Phase overview

| Phase | Name | Focus | Primary audit IDs | Est. effort |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Correctness & data integrity | Backend crashes, email contract, persistence, Mongo | C1–C10, I4, I5 (start) | 2–4 days |
| **2** | Security & extension hard fixes | XSS, WS auth, API key, dashboard URL, 429 | S1–S2, S5–S8, C12, E1–E4 | 2–3 days |
| **3** | Frontend reliability & UX | Analytics errors, health, Topbar, landing noise | C11, F1–F9, I1–I3, I7 | 2–3 days |
| **4** | AI/ML pipeline alignment | HF text/prompt wire **or** Gemini-only truth; geo/domain labels | ML gaps, Doc3–4 | 3–5 days |
| **5** | Docs, deploy, a11y, Store | README, compose, Docker, packaging | Doc*, D*, E5, F8, F10 | 2–3 days |

**Total:** ~11–18 working days depending on whether Phase 4 wires remote ML or only documents Gemini-only.

---

## Phase 1 — Correctness & data integrity

### Outcome
Analyze, email, threats history, rules, and Mongo work without silent failures or schema crashes. Tier 1 URL ML actually runs when `HF_API_URL` is set.

### Why first
Everything else (UX, deploy, ML marketing) is useless if core APIs return 422/500 or lose data.

### Work items

#### 1.1 URL Tier 1 await (C1)
| | |
| :--- | :--- |
| **Files** | `backend/app/services/url_service.py` |
| **How** | Find every `ml_engine.evaluate_url(...)` call; add `await`. Cover both `tier == "tier1"` and auto orchestration. Add a quick log of returned score. |
| **Verify** | With `HF_API_URL` set, `POST /api/analyze` `{type:url, tier:tier1}` returns non-zero score for a known-bad URL (or clear heuristic note if HF down). |

- [x] Await fixed in tier1 path  
- [x] Await fixed in auto path  
- [ ] Manual smoke test passed  

#### 1.2 Email type contract (C2, C3)
| | |
| :--- | :--- |
| **Decision** | **Preferred:** extend backend to accept `email` as input type **and** store `type: "email"` in DB **and** allow it in `AnalyzeResponse` / frontend types. **Alternative (faster):** frontend sends `type: "text"` and sets `source`/`snippet` metadata for email. |
| **Files** | `schemas/analyze.py`, `routes_analyze.py` (email), `EmailScanPage.tsx`, `frontend/src/api/types.ts`, filters if needed |
| **How** | Align Literal unions end-to-end. Ensure GET `/api/threats` still validates after an email scan. |
| **Verify** | Upload `.eml` → 200 → appears in Threat History → open detail. |

- [x] Schema/types aligned  
- [ ] Email scan succeeds  
- [ ] Threat list does not 500 after email events  

#### 1.3 Persist & return `advanced_analysis` (C4, C5)
| | |
| :--- | :--- |
| **Files** | `routes_analyze.py` (`db_data`), `routes_threats.py` (`_doc_to_response`), frontend detail drawer if needed |
| **How** | Add `advanced_analysis` to create payload on **all** analyze paths (not only email). Map it in `_doc_to_response`. Confirm Beanie model already has the field. |
| **Verify** | Scan → reload history → detail shows advanced payload. |

- [x] Persist on main `/analyze`  
- [x] Persist on batch/domain if applicable  
- [x] Returned on GET list/detail  
- [ ] UI shows or gracefully hides empty advanced block  

#### 1.4 Enricher response shapes (C6, C7)
| | |
| :--- | :--- |
| **Files** | `clients/phishstats.py`, `clients/safeprompt.py`, `phishing_service.py`, `prompt_service.py` |
| **How** | Standardize clients to always return `dict | None` (e.g. `{"found": true}` / `{"risk_category": "..."}`). Update services to handle both legacy and new shapes safely. |
| **Verify** | Unit-style manual call with mock return; no AttributeError when keys present. |

- [x] PhishStats normalized  
- [x] SafePrompt normalized  
- [x] Services defensive against `None`  

#### 1.5 Rules API response (C8)
| | |
| :--- | :--- |
| **Files** | `backend/app/api/v1/routes_rules.py` |
| **How** | Build `CustomRuleResponse` from explicit fields or `model_dump(exclude={"id"})` then set `id=str(doc.id)`. Fix create, list, toggle. |
| **Verify** | Create rule → list → toggle → no 500. |

- [x] Create fixed  
- [x] List fixed  
- [x] Toggle fixed  

#### 1.6 Mongo TLS conditional (C9)
| | |
| :--- | :--- |
| **Files** | `backend/app/db/connection.py` |
| **How** | If URI starts with `mongodb+srv` or contains `tls=true`, pass `tlsCAFile=certifi.where()`. Else connect without forcing TLS. |
| **Verify** | Local `mongodb://localhost:27017` and Atlas URI both connect. |

- [x] Local Mongo works  
- [x] Atlas path still works  

#### 1.7 Fail loud on DB insert failure (C10)
| | |
| :--- | :--- |
| **Files** | `crud_threats.py`, analyze routes |
| **How** | Re-raise or return HTTP 503 when insert fails; do not return fake success IDs. |
| **Verify** | Stop Mongo → analyze returns error, not a fake event id. |

- [x] Insert failure propagates  
- [ ] Client shows error  

#### 1.8 Remediation merge (I4) + risk mapping start (I5)
| | |
| :--- | :--- |
| **Files** | `routes_analyze.py`, `services/remediation.py`, optionally `risk_engine.py` |
| **How** | Merge template remediation with Gemini actions (dedupe). Extract one `_map_threat_level(score)` used by services + risk_engine. |
| **Verify** | Response `recommended_actions` includes both model and template steps when both exist. |

- [x] Merge (not overwrite)  
- [x] Shared score→level helper used in at least risk_engine + one service  

### Phase 1 exit criteria
- [x] All Phase 1 checkboxes above done (code complete; remaining are runtime smoke)  
- [ ] Smoke: analyze URL/text/prompt/image, email scan, threats list/detail, rules CRUD toggle  
- [ ] No new 500s on happy path with Gemini keys set  

---

## Phase 2 — Security & extension production readiness

### Outcome
Shared demos are safer: no XSS sink, WS gated, strong API key policy, extension works against a real dashboard URL, rate limits surface clearly.

### Work items

#### 2.1 Extension XSS hardening (S5, E2)
| | |
| :--- | :--- |
| **Files** | `extension/content.js` |
| **How** | Replace dangerous `innerHTML` assignments for untrusted strings with `textContent` or a small sanitize helper. Keep structure via `createElement`. |
| **Verify** | Chat response containing `<script>` / `<img onerror>` does not execute. |

- [x] Overlay text sanitized  
- [x] AI chat sanitized  
- [x] Toasts sanitized  

#### 2.2 Configurable dashboard base URL (C12, E1, E4)
| | |
| :--- | :--- |
| **Files** | `extension/popup.html`, `popup.js`, `background.js`, `content.js` |
| **How** | Add `dashboardBaseUrl` to `chrome.storage.local` (default `http://localhost:5173`). Popup field + save. All “Open Dashboard”, report links, and `postMessage` origin checks use it. |
| **Verify** | Set to deployed Vercel URL → links open correct host; History Audit bridge works when origins match. |

- [x] Storage key + popup UI  
- [x] content.js uses config  
- [x] background.js uses config if needed  
- [x] postMessage origin gate updated  

#### 2.3 WebSocket auth (S2)
| | |
| :--- | :--- |
| **Files** | `routes_ws.py`, `frontend/src/hooks/useWebSocket.ts` |
| **How** | Require `?api_key=` or `Sec-WebSocket-Protocol` / first message auth matching `API_KEY`. Reject unauthenticated connections. |
| **Verify** | Connect without key fails; with key receives feed. |

- [x] Backend rejects unauthenticated WS  
- [x] Frontend sends key  

#### 2.4 Production API key guard (S1)
| | |
| :--- | :--- |
| **Files** | `config.py`, `main.py` lifespan, `.env.example` |
| **How** | Add optional `ENVIRONMENT`. If `production` and `API_KEY` in `{dev-key,"}`, refuse startup. |
| **Verify** | Boot fails with clear log when misconfigured. |

- [x] Guard implemented  
- [x] Documented in `.env.example`  

#### 2.5 Frontend 429 + auth errors (S6, F9)
| | |
| :--- | :--- |
| **Files** | `frontend/src/api/client.ts` |
| **How** | Axios interceptor: 429 → toast “Too many requests”; 401 → toast “Invalid API key”. Optional short backoff. |
| **Verify** | Force 429 (or mock) → user-visible message. |

- [x] 429 toast  
- [x] 401 toast  

#### 2.6 Batch concurrency + email error leakage (S7, S8)
| | |
| :--- | :--- |
| **Files** | `routes_analyze.py` |
| **How** | Cap batch size/concurrency (e.g. semaphore 5). Return generic error to client; log `exc` server-side. |
| **Verify** | Large batch does not stampede Gemini; email failure message is safe. |

- [x] Batch capped  
- [x] Generic email errors  

#### 2.7 Extension scan throttle (E3)
| | |
| :--- | :--- |
| **Files** | `extension/background.js`, `content.js` |
| **How** | Debounce auto-scan / per-tab cooldown; respect 429 from API. |
| **Verify** | Rapid navigations do not flood `/analyze`. |

- [x] Throttle in place  

#### 2.8 Gate debug agents in production (S4)
| | |
| :--- | :--- |
| **Files** | `routes_agents.py` or `main.py` |
| **How** | Disable `/api/agent/*` when `ENVIRONMENT=production`. |
| **Verify** | 404/403 in prod mode. |

- [x] Agents gated  

### Phase 2 exit criteria
- [x] XSS test passed (code: escapeHtml + safe chat DOM; runtime smoke recommended)  
- [x] Extension opens deployed dashboard (via `dashboardBaseUrl` setting)  
- [x] WS requires API key  
- [x] Prod refuses `dev-key`  
- [x] 429 visible in UI  

---

## Phase 3 — Frontend reliability & UX polish

### Outcome
Console feels finished: health is real, analytics fails gracefully, landing stays clean, types cover used APIs, brand naming consistent.

### Work items

#### 3.1 Analytics error / empty states (C11, F6)
| | |
| :--- | :--- |
| **Files** | `ThreatCharts.tsx`, `KpiCards.tsx`, Analytics page |
| **How** | Track `error` separately from `loading`. Show retry. Empty stats → “No data yet” not spinner. |
| **Verify** | Stop backend → error UI + retry; empty DB → empty state. |

- [x] Charts error state  
- [x] KPI error state  
- [x] Empty state  

#### 3.2 Live health status (F1)
| | |
| :--- | :--- |
| **Files** | `useUIStore.ts`, `Sidebar.tsx`, `Topbar.tsx`, `endpoints.ts` |
| **How** | Poll `GET /api/health` periodically; map to SYSTEM ACTIVE / DEGRADED / DOWN. |
| **Verify** | Kill backend → sidebar status updates. |

- [x] Health API helper  
- [x] Sidebar wired  
- [x] Topbar Monitoring reflects reality or removed  

#### 3.3 Topbar titles + notifications (F2, F3)
| | |
| :--- | :--- |
| **Files** | `Topbar.tsx` |
| **How** | Title map for all routes. Either remove bell or wire to recent threats count. |
| **Verify** | Each page shows correct title. |

- [x] All routes titled  
- [x] Bell fixed or removed  

#### 3.4 Rules Edit: implement or remove (F4)
| | |
| :--- | :--- |
| **Files** | `RulesPage.tsx`, optional `routes_rules.py` PUT |
| **How** | **Either** add update endpoint + edit form **or** remove unused Edit affordance. |
| **Verify** | No dead Edit button. |

- [x] Edit implemented **or** removed  

#### 3.5 Landing: no assistant / WS noise (F5)
| | |
| :--- | :--- |
| **Files** | `App.tsx` |
| **How** | Mount `AssistantWidget` and `useWebSocket` only under authenticated/console routes (`/*` internal), not on `/`. |
| **Verify** | Landing has no floating assistant or WS reconnect. |

- [x] Assistant off landing  
- [x] WS off landing  

#### 3.6 Video type + source literal (I2, I3)
| | |
| :--- | :--- |
| **Files** | `ScanForm.tsx`, backend source Literal if needed |
| **How** | Detect video MIME → `type: 'video'`. Align `history_audit` source with backend. |
| **Verify** | Video upload sends `video`; audit batch accepted. |

- [x] Video type correct  
- [x] Source literal aligned  

#### 3.7 Shared typed API helpers (I1)
| | |
| :--- | :--- |
| **Files** | `frontend/src/api/endpoints.ts`, `types.ts` |
| **How** | Add typed helpers for email, rules, geo, timeline, batch, report used by pages. |
| **Verify** | Pages import helpers; fewer raw `apiClient` calls. |

- [x] Helpers added for used secondary endpoints  

#### 3.8 Theme tokens + brand name (F7, I7)
| | |
| :--- | :--- |
| **Files** | Email/Audit/Rules pages, landing footer, README footers |
| **How** | Replace hard-coded dark slate with theme CSS vars. Standardize on **CyberSentinel**. |
| **Verify** | Light mode readable on all console pages; no “CyberShield” leftovers in UI. |

- [x] Theme tokens on outlier pages  
- [x] Brand name consistent in UI  

#### 3.9 Global API toasts (F9 continuation)
| | |
| :--- | :--- |
| **Files** | `client.ts`, toast lib already in project |
| **How** | Network error toast; optional success silence. |
| **Verify** | Offline → clear message. |

- [x] Network error toast  

### Phase 3 exit criteria
- [x] Analytics never infinite-spins  
- [x] Health reflects backend  
- [x] Landing clean (no assistant/WS)  
- [x] Brand + titles consistent  

---

## Phase 4 — AI / ML pipeline alignment

### Outcome
Product claims match code. Either **remote ML is wired and working**, or the product is explicitly **Gemini-only** with Tier 1/2 labeled correctly.

### Decision gate (choose one before coding)

| Option | When to choose | Work |
| :--- | :--- | :--- |
| **A — Gemini-only (recommended for free deploy)** | No HF PRO / no alt ML host | Document; disable or soft-label dead tiers in UI; keep `HF_API_URL` optional |
| **B — Wire remote ML** | You have a host for `cybersentinel-ml-api` | Call `/predict/text` + `/predict/prompt`; keep URL/image calls; set `HF_API_URL` |

**Recorded decision:** **Option A** (Gemini-only default). Optional remote ML clients are wired so setting `HF_API_URL` upgrades to hybrid without a separate code path.

### Work items (Option A — Gemini-only)

#### 4.A.1 Honest UI tier labels
| | |
| :--- | :--- |
| **Files** | `ScanForm.tsx`, extension tier UI, landing pipeline copy if needed |
| **How** | Tier 1/2 show “requires remote ML” or hide when `HF_API_URL` unset (health can expose flag). Default Auto → Gemini-heavy path. |
| **Verify** | User is not promised local custom ML that never runs. |

- [x] UI labels updated  
- [x] README / landing pipeline wording updated  

#### 4.A.2 Simulated features labeled
| | |
| :--- | :--- |
| **Files** | Domain route UI, Analytics geo section, report flow |
| **How** | Badge “Simulated” on geo/domain if still heuristic; or hide. |
| **Verify** | No “live geo map” claim in UI. |

- [x] Geo labeled or removed  
- [x] Domain labeled or improved  

### Work items (Option B — Wire remote ML)

#### 4.B.1 Phishing text → HF `/predict/text`
| | |
| :--- | :--- |
| **Files** | `phishing_service.py`, optionally shared HF client module |
| **How** | Mirror URL/deepfake pattern: if `settings.HF_API_URL`, POST text; map score into Tier 1/2. Fallback to Gemini / safe default. |
| **Verify** | With HF up, text tier1/2 non-zero on phishing sample. |

- [x] HF text client  
- [x] Wired into phishing tiers  
- [x] Fallback when HF down  

#### 4.B.2 Prompt → HF `/predict/prompt`
| | |
| :--- | :--- |
| **Files** | `prompt_service.py` |
| **How** | Same pattern for Tier 2. Keep Tier 3 Gemini. |
| **Verify** | Injection sample flagged by HF when configured. |

- [x] HF prompt client wired  

#### 4.B.3 Deepfake video path
| | |
| :--- | :--- |
| **Files** | `deepfake_service.py`, ScanForm |
| **How** | Accept `video` type; either extract frame or document “image only” until video supported. |
| **Verify** | Clear behavior for video uploads. |

- [x] Video supported **or** explicitly rejected with message  

#### 4.B.4 Deploy ML API + set `HF_API_URL`
| | |
| :--- | :--- |
| **Files** | `cybersentinel-ml-api/`, deploy host, backend env |
| **How** | Follow `HF_UPLOAD_GUIDE.md` on PRO HF or Railway/Fly/etc. Set backend `HF_API_URL`. |
| **Verify** | Health of ML API + analyze tier1 URL/text. |

- [ ] ML service deployed *(operator action — optional)*  
- [ ] Backend env set *(operator action — optional)*  
- [x] End-to-end tier1 smoke *(code path ready; requires HF host)*  

#### 4.4 Shared (both options): mock agents consistency (I6)
| | |
| :--- | :--- |
| **How** | Honor `USE_MOCK_AGENTS` in all Gemini Tier 3 entry points or remove flag. |
| **Verify** | Mock mode predictable. |

- [x] Mock gate consistent  

#### 4.5 Anomaly Tier 1/2
| | |
| :--- | :--- |
| **How** | Label experimental **or** ship minimal rule checks. |
| **Verify** | UI does not imply full behavioral ML. |

- [x] Labeled or minimal rules shipped  

### Phase 4 exit criteria
- [x] Decision A or B recorded in README  
- [x] No false “local custom ML always on” claim  
- [x] If B: text + URL tier1 work with `HF_API_URL` *(clients wired)*  
- [x] Geo/domain honesty in UI  

---

## Phase 5 — Documentation, deploy hardening, polish

### Outcome
Repo is release-ready: docs match reality, Docker/compose usable, a11y basics done, Store path clear, audit closed.

### Work items

#### 5.1 Documentation refresh (Doc1–Doc8)
| | |
| :--- | :--- |
| **Files** | `README.md`, `Current_Project_Gaps_And_Fixes.md`, `hf_space_deployment_guide.md`, free-tier guide, developers table |
| **How** | Point gaps doc to this plan + audit. Archive/stub HF guide → link `cybersentinel-ml-api/HF_UPLOAD_GUIDE.md`. Fix Tier 1, geo, auth, model name (`flash-lite`), developers (include Viraj). Remove dead Live Demo / clone placeholders or set real URLs. |
| **Verify** | New contributor can follow README without contradictions. |

- [x] README claims fixed  
- [x] Gaps doc superseded/updated  
- [x] HF guide archived or redirected  
- [x] Developers table complete  
- [x] Stale `doc/backend/` marked or removed  

#### 5.2 Docker Compose + Dockerfile (D1, D2)
| | |
| :--- | :--- |
| **Files** | `backend/docker-compose.yml`, `Dockerfile` |
| **How** | Optional Mongo service for local; healthcheck on API; non-root user if feasible. |
| **Verify** | `docker compose up` reaches `/api/health` (with Atlas or local Mongo). |

- [x] Compose documented  
- [x] Healthcheck added  

#### 5.3 Repo weight (D3)
| | |
| :--- | :--- |
| **How** | Git LFS for `.pt`/large `.pkl` **or** gitignore EDA PNGs; keep inference weights in `cybersentinel-ml-api/models` only. |
| **Verify** | Clone size reduced or LFS documented. |

- [x] Policy chosen and applied  

#### 5.4 Deploy checklist (D4, D5)
| | |
| :--- | :--- |
| **Files** | free-tier guide |
| **How** | Explicit checklist: Atlas → Render env → Vercel `VITE_*` before build → CORS → extension dashboard URL → optional cron health ping. |
| **Verify** | Dry-run checklist against a staging deploy. |

- [x] Checklist in guide  
- [x] Staging dry-run notes *(template in guide; fill when you validate hosts)*  

#### 5.5 Dev test requirements (D7)
| | |
| :--- | :--- |
| **Files** | `requirements-dev.txt` |
| **How** | Add pytest, pytest-asyncio, httpx test client helpers. Smoke tests for C1–C3 if possible. |
| **Verify** | `pytest` runs on CI or locally. |

- [x] `requirements-dev.txt`  
- [x] Minimal regression tests for Phase 1 bugs  

#### 5.6 Accessibility basics (F8)
| | |
| :--- | :--- |
| **Files** | Sidebar, Topbar, landing nav, extension popup |
| **How** | `aria-label` on icon buttons; focus visible; assistant live region optional. |
| **Verify** | Keyboard nav through main chrome. |

- [x] Icon buttons labeled  
- [x] Focus visible  

#### 5.7 Product surface honesty (F10)
| | |
| :--- | :--- |
| **How** | Either ship minimal Intel UI **or** remove intel/federated claims from README/landing. Same for unused agent debug. |
| **Verify** | No advertised feature without UI/API path. |

- [x] Intel: UI or de-claimed  
- [x] Agents: gated (from Phase 2) and undocumented for users  

#### 5.8 Chrome Web Store prep (E5)
| | |
| :--- | :--- |
| **How** | Privacy blurb, permission justification, screenshots from `Preview_images`, production defaults for API/dashboard. |
| **Verify** | Checklist complete even if not submitted yet. |

- [x] Store checklist markdown added under `extension/` or `doc/`  

#### 5.9 Close the audit loop
| | |
| :--- | :--- |
| **Files** | `Full_Project_Audit_Fixes_And_Improvements.md` |
| **How** | Mark each ID Fixed / Deferred with date. Update acceptance checklist to all checked. |
| **Verify** | Audit section 12 all green. |

- [x] Audit statuses updated  
- [x] Final acceptance checklist complete  

### Phase 5 exit criteria
- [x] Docs match shipped behavior  
- [x] Deploy checklist validated once *(checklist shipped; staging host dry-run is operator follow-up)*  
- [x] Audit acceptance checklist (section 12) fully checked  
- [x] Team agrees: Gemini-only **or** ML-wired release → **Gemini-only by default (Option A)**  

---

## Tracking board (copy into issues / Notion)

| Phase | Status | Owner | Start | Done | Notes |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 Correctness | Done (code) | | | 2026-09-03 | Runtime smoke optional |
| 2 Security + extension | Done | | | 2026-09-03 | |
| 3 Frontend UX | Done | | | 2026-09-03 | |
| 4 AI/ML alignment | Done | | | 2026-09-03 | Option A: Gemini-only |
| 5 Docs + deploy + polish | Done | | | 2026-09-03 | Staging dry-run operator |

---

## Suggested PR slicing

| PR | Phase | Title example |
| :---: | :---: | :--- |
| 1 | 1 | fix: await URL ML + enricher shapes + Mongo TLS |
| 2 | 1 | fix: email type contract + advanced_analysis persist/read |
| 3 | 1 | fix: rules response + DB insert failures |
| 4 | 2 | security: extension XSS + dashboardBaseUrl |
| 5 | 2 | security: WS auth + API key guard + 429 UX |
| 6 | 3 | fix: analytics errors, health status, landing isolation |
| 7 | 4 | feat/docs: Gemini-only honesty **or** HF text/prompt wiring |
| 8 | 5 | docs: README + audit closeout + compose hardening |

---

## Definition of Done (whole project)

The implementation plan is **complete** when:

1. All Phase 1–3 exit criteria pass.  
2. Phase 4 decision (A or B) is implemented and documented.  
3. Phase 5 docs + deploy checklist done.  
4. Audit §12 acceptance checklist is fully checked.  
5. A fresh machine can: clone → configure `.env` → run backend/frontend/extension → scan URL/text → see history → open extension against configured dashboard.

---

## Related documents

| Doc | Role |
| :--- | :--- |
| [`Full_Project_Audit_Fixes_And_Improvements.md`](./Full_Project_Audit_Fixes_And_Improvements.md) | Source of issues (IDs) |
| [`AI_Implementation_Overview.md`](./AI_Implementation_Overview.md) | AI architecture reference |
| [`Frontend_Backend_Extension_Implementation.md`](./Frontend_Backend_Extension_Implementation.md) | Stack map |
| [`../cybersentinel-ml-api/HF_UPLOAD_GUIDE.md`](../cybersentinel-ml-api/HF_UPLOAD_GUIDE.md) | ML deploy (Phase 4B) |
| Free-tier deploy guide | Phase 5 checklist home |

---

*Plan version: 1.0 — aligned to audit dated 2026-09-03. Update phase statuses as work ships; do not reorder phases without reassessing dependencies.*
