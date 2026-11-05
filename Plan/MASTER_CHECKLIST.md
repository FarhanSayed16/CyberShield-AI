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

- [x] P0.1 Stop running API + Vite. Verify: `Get-NetTCPConnection -LocalPort 8000,5173` → empty.
- [x] P0.2 `git add Plan v1_plan_docs; git commit -m "docs: planning docs"`; `git tag baseline-2026-10-27`. (commit `5ab2339`)
- [x] P0.3 Run backend tests → 48 passed, 0 failed (see `Plan/BASELINE.md`).
- [x] P0.4 `npm run build` pass; `npm run lint` 14 errors / 3 warnings pre-existing (listed in `Plan/BASELINE.md`, fix in P8.2).
- [~] P0.5 API smoke done (health, signup, login, ingest, dedupe, alert, policy cache). Browser checks pending human: Events page · extension Config · 1 ChatGPT prompt → 1 event.
- [x] **Gate P0** baseline recorded.

## P1 — Truth + docs

- [x] P1.1 Fix `aisentinel/` paths in `v1_plan_docs/*.md`. Verify: no `aisentinel/` hits.
- [x] P1.2 `MONGODB_URL` → `MONGODB_URI` in `v1_plan_docs/BACKEND.md`.
- [x] P1.3 Create `Plan/FEATURE_STATUS.md`. Billing = Built.
- [x] **Gate P1** docs match repo.

## P2 — Demo-ready boot

- [x] P2.1 `SEED_DEMO` seeds in memory+development. Login `admin@demo.com` / `password` → 200. Org token `aisnl_org_demo123`. Second seed is a no-op (`test_p2_demo_seed_login`).
- [x] P2.2 `scripts/seed_ai_demo.py` inserted 25 events on a fresh API. `GET /api/events` returned 25.
- [x] P2.3 `run-local.ps1` uses the venv python, installs frontend deps if missing, prints demo creds.
- [x] P2.4 Popup **Use local demo** fills localhost + `aisnl_org_demo123` + `aisnl_usr_emp456`. Chrome click still needs a human reload.
- [x] P2.5 Tests: 54 passed.
- [x] **Gate P2**

## P3 — Real-time sync

- [x] P3.1 Broadcast `ai_event`, `ai_event_update`, `ai_alert`. Test asserts ingest calls `broadcast` with the org id.
- [x] P3.2 `useLiveStore` + JWT `token` query. Browser frame check is still a human step.
- [x] P3.3 Events page merges live rows. Poll 30s when the socket is open, else 8s.
- [x] P3.4 Alerts prepend + toast. Sidebar shows "Live" when the socket is open.
- [x] P3.5 Enforcement alarm is 0.5 min, plus a focus poll debounced to 5s. Tab-close timing needs Chrome.
- [ ] P3.6 Stopwatch on a real ChatGPT send. Not run here.
- [x] P3.7 Tests green.
- [x] **Gate P3** code. Live stopwatch is P3.6.

## P4 — Hard block / warn

- [x] P4.1 Policy cache default `submit_mode=observe`, `block_threshold=critical`. Invalid mode returns 400.
- [x] P4.2 Org Settings radios save `submit_mode` and `block_threshold`.
- [x] P4.3 `enforcement_outcome` stored and listed.
- [x] P4.4 Capture-phase gate in `ai-content.js` (mousedown + Enter) with `bypassOnce`. Client audit matches AWS keys and `password=`.
- [x] P4.5 Blocked / warned badges and "Prompts blocked (7d)".
- [ ] P4.6 Live matrix still needs Chrome (test string `AKIAIOSFODNN7EXAMPLE`):

| Platform | observe: sends + 1 event | warn cancel: not sent | warn send-anyway: sent once | block: not sent + event blocked |
| :--- | :---: | :---: | :---: | :---: |
| ChatGPT Enter | [ ] | [ ] | [ ] | [ ] |
| ChatGPT click | [ ] | [ ] | [ ] | [ ] |
| Claude Enter | [ ] | [ ] | [ ] | [ ] |
| Claude click | [ ] | [ ] | [ ] | [ ] |
| Gemini Enter | [ ] | [ ] | [ ] | [ ] |
| Gemini click | [ ] | [ ] | [ ] | [ ] |

- [x] P4.7 Gate returns early when client risk is below the threshold, so a normal prompt is not stopped.
- [x] P4.8 Tests green.
- [x] **Gate P4** code. P4.6 is the remaining live check.

## P5 — Email alerts + digest

- [x] P5.1 Email settings default to console, digest off.
- [x] P5.2 `services/notifier.py`.
- [x] P5.3 Critical ingest emails the alert address and does not include the secret. A normal prompt does not email.
- [x] P5.4 `POST /api/admin/digest/send-now` returns a preview.
- [x] P5.5 Digest loop runs only when `DIGEST_ENABLED=true` and records `last_digest_at`.
- [x] P5.6 Org Settings: alert email, toggles, Send test email.
- [ ] P5.7 Real SMTP inbox. Not run. Console backend is the verified path.
- [x] **Gate P5** code. P5.7 needs a mailbox.

## P6 — Billing verification

- [x] P6.1 `stripe` is in `backend/requirements.txt`.
- [x] P6.2 Dev activate and seat checks already existed. Banner added for dev mode.
- [x] P6.3 Duplicate Stripe `event.id` returns `duplicate: true`. Webhook now reads Stripe objects via `to_dict()`.
- [x] P6.4 Dev-mode banner on the Billing page.
- [x] P6.5 Expired trial ingest returns 402 with "plan has expired". Popup shows `cs_last_error` and does not queue 402/429.
- [ ] P6.6 Live Stripe checkout. Needs keys.
- [x] **Gate P6**

## P7 — Showcase polish

- [x] P7.1 Video upload is refused in the scanner and the extension. README says image checks only.
- [x] P7.2 `Plan/DEMO_SCRIPT.md`.
- [x] P7.3 Existing empty states kept. Live toasts on high alerts.
- [x] P7.4 Overview chip when `gemini_configured` is false. Smoke saw `gemini=False`.
- [x] P7.5 Popup shows API time. Manifest `1.3.0`.
- [ ] P7.6 Two live dry-runs. Not run.
- [x] **Gate P7** code. P7.6 is the live demo.

## P8 — Tests + CI

- [x] P8.1 Coverage lives in `backend/tests/test_showcase_phases.py` (seed, broadcast, submit mode, email, webhook, expired plan).
- [x] P8.2 Baseline lint errors fixed. `npm run lint` exits 0.
- [x] P8.3 `npm run build` exits 0.
- [x] P8.4 `.github/workflows/ci.yml`.
- [ ] P8.5 Push and watch CI. Not pushed.
- [x] **Gate P8** local. P8.5 needs a push.

## P9 — Release + sales kit

- [x] P9.1 `dist/cybersentinel-extension-1.3.0.zip` (gitignored).
- [ ] P9.2 Docker. `docker` is not installed on this machine.
- [x] P9.3 `doc/sales/ONE_PAGER.md`, `SECURITY_FAQ.md`, `PILOT_CHECKLIST.md`.
- [x] P9.4 `CHANGELOG.md`. Tag after the release commit.
- [x] **Gate P9** except Docker.

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
