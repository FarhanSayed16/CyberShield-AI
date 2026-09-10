# Phase 6 — Testing & QA report

**Date:** 2026-09-09  
**Branch:** `integrate/phase6-qa`  
**Environment:** `STORAGE_BACKEND=memory`, `USE_MOCK_AGENTS=true`

## Automated API / unit results

```text
pytest tests/test_dlp_unit.py tests/test_phase6_*.py -q
28 passed in ~16s
```

| Area | Module | Result |
| :--- | :--- | :--- |
| DLP fixtures | `test_dlp_unit.py` | PASS |
| Auth signup/login/me/invite | `test_phase6_auth.py` | PASS |
| Org isolation + employee 403 | `test_phase6_auth.py` | PASS |
| Event ingest + dedupe | `test_phase6_guard.py` | PASS |
| DLP alert + enforcement pull/complete | `test_phase6_guard.py` | PASS |
| Dashboard after ingest | `test_phase6_guard.py` | PASS |
| Analyze JWT / org-token + threats + rules | `test_phase6_threats.py` | PASS |
| Billing status + seat quota 429 | `test_phase6_billing_quota.py` | PASS |
| Prod weak-secret guards, CORS, XSS helpers, no debug ingest, WS JWT | `test_phase6_security.py` | PASS |

**Critical bugs open:** 0 (from this suite)

### How to re-run

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dlp_unit.py tests/test_phase6_auth.py tests/test_phase6_guard.py tests/test_phase6_threats.py tests/test_phase6_billing_quota.py tests/test_phase6_security.py -q
```

---

## 6.3 UI E2E checklist (manual)

| Case | Pass |
| :--- | :---: |
| Signup happy path → `/ai` | ☐ |
| Login + employee blocked from `/ai/settings` | ☐ |
| Events / Alerts / Users / Settings / Verify / Billing | ☐ |
| Live Scan + Threat History + Analytics empty/error | ☐ |
| Landing CTAs → `/signup` / `/login` / `/privacy` | ☐ |

---

## 6.4 Extension manual matrix

| Site / path | Capture | Response patch | DLP alert | Notes |
| :--- | :---: | :---: | :---: | :--- |
| ChatGPT | ☐ | ☐ | ☐ | Reload extension after code change |
| Claude | ☐ | ☐ | ☐ | |
| Gemini | ☐ | ☐ | ☐ | |
| Google Search | ☐ | — | ☐ | Reduced script set |
| Phishing URL warn (Quickball / context menu) | ☐ | — | — | Threat path |
| Enforcement blackout | ☐ | — | — | From Alerts UI |
| Close AI tabs | ☐ | — | — | |
| Chrome latest | ☐ | | | |
| Edge (optional claim) | ☐ | | | Not claimed for v1 |

See `extension/INSTALL.md` for reload steps.

---

## 6.5 / 6.6 / 6.7 notes

| Check | Status |
| :--- | :--- |
| XSS: `escapeHtml` present; no debug ingest | Automated PASS |
| Authz cross-org | Automated PASS |
| Weak API/JWT refused in production code paths | Automated PASS (constants + lifespan) |
| WS requires token or api_key | Automated PASS |
| CORS not `*` in default settings | Automated PASS |
| Secrets in `.env.example` | Automated PASS (no live keys) |
| Ingest latency under light load | Smoke via suite (<1s typical) |
| Gemini not on every keystroke | Client dedupe 8s + server ingest only on submit |
| Mongo indexes | Deferred to Phase 7 staging (`explain` on hot queries) |
| Email analyze / history / health | Health automated; email analyze optional with mock agents |

---

## Exit criteria

- [x] Test report attached (this document)  
- [x] Critical bugs = 0 open (automated suite)  
- [ ] Extension matrix completed for in-scope sites *(manual — testers use table above)*  

**Honest note:** Extension browser matrix remains a **manual gate** before Phase 7 sign-off. API/auth/DLP/quota spine is green.
