# 12 — Testing Strategy

## Executive summary

Test pyramid: **unit** (DLP, auth helpers) → **integration** (API + Mongo) → **E2E** (Playwright dashboard) → **manual** (Chrome extension per AI site). Each implementation gate in `17` has verify commands; automate where possible.

---

## Unit tests (pytest)

| Module | Cases |
|--------|-------|
| `services/dlp.py` | email, sk-key, clean text, custom pattern |
| `services/alerts.py` | critical → alert created |
| `api/auth.py` | signup, duplicate email, weak password |

Run: `docker compose exec api pytest tests/unit -v`

---

## Integration tests

- Motor + test MongoDB (or `mongomock` for CI)
- `POST /api/events` → document in `events` + `dlp_findings`
- `GET /api/dashboard/summary` after seed data

Run: `pytest tests/integration -v`

---

## E2E (Playwright)

Flow:
1. Signup admin
2. Open `/admin/verify` → all green
3. Synthetic ingest → event in table
4. Login employee view → cannot access `/admin/verify`

Run: `cd frontend && npx playwright test`

---

## Extension manual matrix

| Site | Action | Expected |
|------|--------|----------|
| chat.openai.com | Submit prompt | Event in dashboard &lt; 5s |
| claude.ai | Submit prompt | platform=claude |
| gemini.google.com | Submit prompt | platform=gemini |
| Offline API | Extension queued or dropped silently | No UI break |

---

## CI integration

See [`10_DEVOPS_CI_CD.md`](10_DEVOPS_CI_CD.md) — backend + frontend jobs on every PR.

---

## Acceptance criteria

- [ ] DLP unit tests cover all fixtures in `19_ADMIN_VERIFY_DASHBOARD.md`
- [ ] Integration test for ingest passes in GitHub Actions
- [ ] Playwright smoke on main branch

---

## Cross-links

- [`17_IMPLEMENTATION_SEQUENCE.md`](17_IMPLEMENTATION_SEQUENCE.md)
- [`14_RISK_DETECTION_ENGINE.md`](14_RISK_DETECTION_ENGINE.md)
