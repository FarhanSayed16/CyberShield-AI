# CyberSentinel — Executable Checklist

Plan: [`MASTER_PLAN.md`](MASTER_PLAN.md). Tick `[x]` only after the verify step passes.
Shell: PowerShell, repo root `C:\Users\Manas\Desktop\AI_safe_Extension`.

## How to use (agent + human)

1. Work top-down. Never start phase N+1 before gate N is ticked.
2. Per subphase: **Read** listed files → **Change** → **Verify** command → tick.
3. If verify fails twice: stop, revert subphase (`git checkout -- <files>`), note in `Plan/BASELINE.md`.
4. Agent prompt template for Auto mode:

```text
Execute Plan/MASTER_CHECKLIST.md phase <N> only. Read Plan/MASTER_PLAN.md section for P<N>.
Rules: additive changes, defaults keep current behavior, touch only listed files, run every Verify step, tick boxes. Terse output.
```

## Standard commands

```powershell
# API (memory DB)
cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
# Frontend
cd frontend; npm run dev
# Backend tests
cd backend; $env:STORAGE_BACKEND="memory"; .\.venv\Scripts\python.exe -m pytest -q tests
# Frontend checks
cd frontend; npm run lint; npm run build
# Health
Invoke-RestMethod http://127.0.0.1:8000/api/health
# Free ports
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue | % { Stop-Process -Id $_.OwningProcess -Force }
```

---

## P0 — Safety baseline

- [ ] P0.1 Stop running API + Vite. Verify: `Get-NetTCPConnection -LocalPort 8000,5173` → empty.
- [ ] P0.2 `git add Plan v1_plan_docs; git commit -m "docs: planning docs"`; `git tag baseline-2026-10-27`.
- [ ] P0.3 Run backend tests → write pass/fail counts + failing test names to `Plan/BASELINE.md`.
- [ ] P0.4 `npm run lint` + `npm run build` → record result in `Plan/BASELINE.md`.
- [ ] P0.5 Manual smoke recorded: health ok · signup ok · login ok · Events page loads · extension Config saves · 1 ChatGPT prompt → 1 event.
- [ ] **Gate P0** baseline recorded.

## P1 — Truth + docs

- [ ] P1.1 Fix `aisentinel/` paths in `v1_plan_docs/*.md` (map in MASTER_PLAN 5.P1.1). Verify: `rg "aisentinel/" v1_plan_docs` → 0.
- [ ] P1.2 `MONGODB_URL` → `MONGODB_URI` in `v1_plan_docs/BACKEND.md`.
- [ ] P1.3 Create `Plan/FEATURE_STATUS.md` (built / partial / deferred). Billing = Built.
- [ ] **Gate P1** docs match repo.

## P2 — Demo-ready boot

- [ ] P2.1 Read `backend/app/main.py`, `core/config.py`, `scripts/seed_org.py`. Add `SEED_DEMO=True`; call `seed()` in lifespan when memory+development; try/except.
  - Verify: restart API → `POST /api/auth/login` admin@demo.com/password → 200; org token `aisnl_org_demo123`.
  - Verify: restart twice → no duplicate-key error in log.
- [ ] P2.2 Read `db/documents_org.py` (Event fields), `services/dlp.py`. Create `scripts/seed_ai_demo.py` (~25 events, real DLP scan, alerts). Hook after P2.1 when 0 events.
  - Verify: `/ai/events` shows rows; `/ai/alerts` shows ≥1 HIGH and ≥1 CRITICAL.
- [ ] P2.3 `run-local.ps1`: venv python path; auto `npm install` if no `node_modules`; print demo creds.
  - Verify: `.\run-local.ps1` from clean terminals → both URLs up.
- [ ] P2.4 `extension/popup.js` + `popup.html`: "Use local demo" button fills localhost + demo tokens.
  - Verify: reload extension → click → Save → "Monitoring active".
- [ ] P2.5 Tests still at baseline. Commit `feat(p2): demo-ready boot`.
- [ ] **Gate P2**

## P3 — Real-time sync

- [ ] P3.1 Read `routes_events.py`, `routes_ws.py`, `services/org_alerts.py`, `serializers_org.py`. Broadcast `ai_event` (new ingest only), `ai_event_update` (response patch), `ai_alert`. Lazy import + try/except.
  - Verify: `python -c "import app.main"` ok; ingest via Admin Verify still 200.
- [ ] P3.2 Read `frontend/src/hooks/useWebSocket.ts` + `frontend/src/stores/*`. Add handlers + JWT `token` query auth.
  - Verify: browser devtools WS frame shows `ai_event` after Admin Verify synthetic ingest.
- [ ] P3.3 `AiEventsPage.tsx` live merge; poll 30 s when WS open, 8 s when closed.
- [ ] P3.4 `AiAlertsPage.tsx` live prepend + toast HIGH/CRITICAL. Sidebar live dot.
- [ ] P3.5 `extension/background.js`: `enforcementPoll` 0.5 min; poll on AI tab activate/focus (debounce 5 s).
  - Verify: ack alert with "Close all AI tabs" → employee ChatGPT tab closes ≤ 30 s (focused tab ≤ 5 s).
- [ ] P3.6 Stopwatch: ChatGPT send → dashboard row ≤ 2 s, no refresh. Record time.
- [ ] P3.7 Tests at baseline. Commit `feat(p3): realtime sync`.
- [ ] **Gate P3**

## P4 — Hard block / warn

- [ ] P4.1 Read `routes_policies.py`, `routes_org.py`. Add `submit_mode` (default observe) + `block_threshold` (default critical) to policy cache + settings validation.
  - Verify: `GET /api/policies/cache` (X-Org-Token) contains `submit_mode: "observe"`.
- [ ] P4.2 Settings page (`/ai/settings`) control for mode + threshold. Verify save → cache reflects.
- [ ] P4.3 `schemas/ai_guard.py`, `db/documents_org.py`, `serializers_org.py`: optional `enforcement_outcome`.
- [ ] P4.4 Read `extension/ai-content.js`, `utils/helpers.js`, `engine/audit-rules.js`, `ui/jit-overlay.js`. Add capture-phase keydown/click gate with `bypassOnce`.
- [ ] P4.5 Events table badges + Overview "Prompts blocked (7d)" KPI.
- [ ] P4.6 Matrix (test string: `AKIAIOSFODNN7EXAMPLE` + `password=Hunter2!`):

| Platform | observe: sends + 1 event | warn cancel: not sent | warn send-anyway: sent once | block: not sent + event blocked |
| :--- | :---: | :---: | :---: | :---: |
| ChatGPT Enter | [ ] | [ ] | [ ] | [ ] |
| ChatGPT click | [ ] | [ ] | [ ] | [ ] |
| Claude Enter | [ ] | [ ] | [ ] | [ ] |
| Claude click | [ ] | [ ] | [ ] | [ ] |
| Gemini Enter | [ ] | [ ] | [ ] | [ ] |
| Gemini click | [ ] | [ ] | [ ] | [ ] |

- [ ] P4.7 Safe prompt ("hello") in block mode → sends normally, risk none.
- [ ] P4.8 Tests at baseline. Commit `feat(p4): submit gate`.
- [ ] **Gate P4**

## P5 — Email alerts + digest

- [ ] P5.1 `core/config.py` + `backend/.env.example`: EMAIL_*/SMTP_*/DIGEST_* (defaults console / off).
- [ ] P5.2 Create `services/notifier.py` (console + smtp via `asyncio.to_thread`, never raises).
- [ ] P5.3 `services/org_alerts.py`: fire-and-forget email on HIGH/CRITICAL when `notify_on_critical` + `alert_email`; 60 s rate limit; no prompt text in body.
  - Verify: Admin Verify CRITICAL test → API log shows `[email:console] to=... subject=...`.
- [ ] P5.4 `POST /api/admin/digest/send-now` (admin) returns preview + sends.
- [ ] P5.5 Optional loop when `DIGEST_ENABLED=true`; `last_digest_at` dedupe.
- [ ] P5.6 Org Settings: alert email + toggles + "Send test email" (add only missing pieces after reading `OrgSettingsPage.tsx`).
- [ ] P5.7 Real SMTP check (Mailtrap or Gmail app password) → email received. Record.
- [ ] P5.8 Commit `feat(p5): email alerts + digest`.
- [ ] **Gate P5**

## P6 — Billing verification

- [ ] P6.1 `rg -i "^stripe" backend/requirements.txt` → present (else add).
- [ ] P6.2 Dev flow: Billing page → activate starter → status updates; invite beyond seat limit → clear error.
- [ ] P6.3 Webhook idempotency on Stripe `event.id`.
- [ ] P6.4 "Dev mode" banner on Billing page when `billing_mode=="dev"`.
- [ ] P6.5 Expired plan → ingest returns clear error; extension popup shows it.
- [ ] P6.6 (optional, needs keys) Stripe test checkout + `stripe listen` webhook → plan starter.
- [ ] **Gate P6**

## P7 — Showcase polish

- [ ] P7.1 Claims audit: `rg -i "video|okta|saml|sso|wasm|webgpu|siem|marketplace|federated" frontend/src extension README.md` → each hit fixed or justified.
- [ ] P7.2 Write `Plan/DEMO_SCRIPT.md` (9 steps from MASTER_PLAN 11.P7.2).
- [ ] P7.3 Empty states, skeletons, toasts on Events/Alerts/Users/Settings.
- [ ] P7.4 Gemini placeholder → "demo mode" chip, no raw errors.
- [ ] P7.5 Popup: last sync time + API reachability. Overlay branding. Manifest `1.3.0`.
- [ ] P7.6 Full demo dry-run #1 · [ ] dry-run #2 (no manual fixes).
- [ ] **Gate P7**

## P8 — Tests + CI

- [ ] P8.1 Add `tests/test_p2_seed.py`, `test_p3_ws_push.py`, `test_p4_enforcement_outcome.py`, `test_p5_notifier.py`, `test_p6_webhook_idempotent.py`.
- [ ] P8.2 Fix baseline failures from P0.3.
- [ ] P8.3 `npm run lint` + `npm run build` clean.
- [ ] P8.4 `.github/workflows/ci.yml` (backend / frontend / extension jobs).
- [ ] P8.5 Push branch → CI green.
- [ ] **Gate P8**

## P9 — Release + sales kit

- [ ] P9.1 `scripts/pack-extension.ps1` → `dist/cybersentinel-extension-1.3.0.zip`.
- [ ] P9.2 `docker compose up -d mongo redis` + `docker compose up --build backend` → health ok with `STORAGE_BACKEND=mongodb`; seed via `python -m app.scripts.seed_org`.
- [ ] P9.3 `doc/sales/ONE_PAGER.md`, `SECURITY_FAQ.md`, `PILOT_CHECKLIST.md`.
- [ ] P9.4 CHANGELOG + tag `v1.3.0`.
- [ ] **Gate P9** — ship.

---

## Final acceptance (all must be true)

- [ ] Fresh clone → `.\run-local.ps1` → demo login works with seeded data.
- [ ] Extension "Use local demo" → monitoring active in ≤ 3 clicks.
- [ ] Prompt → dashboard ≤ 2 s; manager action → extension ≤ 30 s.
- [ ] Block mode stops risky prompt on ChatGPT, Claude, Gemini.
- [ ] CRITICAL alert produces email (console in dev, SMTP when configured).
- [ ] Billing dev flow + seat limit work.
- [ ] CI green; no claim in README/landing without a row in MASTER_PLAN Section 14.
- [ ] Observe mode behaves exactly like baseline.

## Deferred (do not start)

Tokenization vault · WASM/WebGPU ML · Shadow-AI unknown sites · SSO/SAML · Intel marketplace · Deepfake video · Next.js · SIEM / enterprise browser.
