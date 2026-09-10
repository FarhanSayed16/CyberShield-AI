# 12 — Local Showcase Checklist

Use this after **every** implementation phase. Full specs: [07_INTEGRATION_MASTER_PLAN.md](./07_INTEGRATION_MASTER_PLAN.md).

## Prerequisites

| Item | Value |
|------|--------|
| API | http://localhost:8000 |
| Dashboard | http://localhost:5173 |
| Login | admin@demo.com / password |
| Extension API | http://localhost:8000 |
| Org token | aisnl_org_demo123 |
| User token | aisnl_usr_admin123 |

No OpenAI key, MongoDB, or Redis required for local demo.

## Regression (every phase)

- [ ] `.\run-local.ps1` or API + frontend running
- [ ] Dashboard login works
- [ ] Extension popup: **Active — monitoring enabled**
- [ ] ChatGPT: send prompt → row in **Events** within ~10s
- [ ] **Verify Setup** → Send test prompt → 201
- [ ] **Verify Setup** → DLP Run → all pass

## Phase RM-0 — DLP intent rules

- [ ] Screenshot-like prompt flags medium+ (not Normal)
- [ ] "What is the weather?" stays Normal
- [ ] `py -m pytest tests/test_dlp.py` passes

## Phase RM-1 — Policies UI

- [ ] Settings → Save policies → success message
- [ ] Settings → Add custom DLP rule → appears in table
- [ ] Settings → Delete rule → removed
- [ ] Alerts → filter Open works

## Phase NF-0 — Extension TS build

- [ ] `npm run build` in extension/
- [ ] Load unpacked from `extension/` (dist scripts)
- [ ] ChatGPT ingest still works

## Phase NF-1 — JIT

- [ ] JIT off: no overlay, events ingest
- [ ] JIT on: risky prompt shows overlay; Continue → event with jit_decision
- [ ] Cancel: no event

## Phase NF-2 — Client audit

- [ ] local_audit off: server score only
- [ ] local_audit on: client_risk visible on event

## Phase NF-3 — Anonymization suggest

- [ ] suggest off: raw prompt to API
- [ ] suggest on: banner; confirm → was_anonymized on event

## Phase NF-4 — Lineage

- [ ] Add demo domain in Settings
- [ ] Copy on tagged page + paste in ChatGPT → lineage on event

## Phase NF-5 — Shadow AI

- [ ] Discovery logged for unknown AI-like page
- [ ] Allowlist suppresses repeat alert

## Phase NF-6 — Hardening

- [ ] Offline queue retries after API back
- [ ] Full pytest pass
