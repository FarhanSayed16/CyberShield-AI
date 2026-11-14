# Baseline — 2026-10-27 (tag `baseline-2026-10-27`, commit `5ab2339`)

Recorded before any P1+ code change. Any later phase must not regress below this.

## Environment

- Windows, PowerShell. No global `python` on PATH — always use `backend\.venv\Scripts\python.exe`.
- Node v24.22.1, npm 11.13.0.
- `backend/.env`: `STORAGE_BACKEND=memory`, `ENVIRONMENT=development`, Gemini key is a placeholder.

## Backend tests

- Command: `$env:STORAGE_BACKEND="memory"; .\.venv\Scripts\python.exe -m pytest -q tests`
- Result: **48 passed, 0 failed** (24.9 s).

## Frontend

- `npm run build`: **pass** (tsc + vite). Warning: main chunk 1.5 MB (>500 kB). Browserslist data stale (cosmetic).
- `npm run lint`: **fail — 14 errors, 3 warnings (pre-existing)**. Fixed in P8.2.

| File | Problem |
| :--- | :--- |
| `src/features/threats/ThreatTable.tsx:12` | unused `Button` |
| `src/pages/AnalyticsPage.tsx:2` | unused `Box`, `Chip`, `Button` |
| `src/pages/BrowsingAuditPage.tsx:15` | unused `EXTENSION_ID` |
| `src/pages/EmailScanPage.tsx:2` | unused `Button` |
| `src/pages/ThreatDiffPage.tsx:3` | unused `Button` |
| `src/pages/ThreatHistoryPage.tsx:3` | unused `Button` |
| `src/stores/useScanStore.ts:42` | `prefer-const` (`content`, `selectedTier`) |
| `src/stores/useScanStore.ts:51` | 4x `no-useless-escape` |
| `src/context/AuthContext.tsx:95` | warning: react-refresh only-export-components |
| `src/hooks/useWebSocket.ts:77` | warning: exhaustive-deps `scheduleReconnect` |
| `src/pages/AiOverviewPage.tsx:80` | warning: exhaustive-deps `isManager`, `user` |

## API smoke (fresh memory DB)

| Check | Result |
| :--- | :--- |
| `GET /api/health` | ok (`pipeline_mode: gemini_only`) |
| Login `admin@demo.com` after restart | **401 — demo org not seeded in memory mode** (fixed by P2.1) |
| Signup → login | ok |
| `POST /api/events` (X-Org-Token) with AWS key | ok — `risk_level: critical`, `risk_score: 90`, alert created |
| Same `client_submit_id` again | ok — `duplicate: true`, no second alert |
| `GET /api/events`, `GET /api/alerts` (JWT) | ok — 1 event, 1 CRITICAL alert |
| `GET /api/policies/cache` keys | `policy_version, dlp_sensitivity, jit_mode, anonymize_mode, shadow_ai_threshold, sensitive_domains, ai_allowlist, features` (no `submit_mode` yet) |

## Manual (human, browser) — pending

- [ ] Dashboard Events page renders after login.
- [ ] Extension Config saves → "Monitoring active".
- [ ] One ChatGPT prompt → exactly one event in dashboard.

## Notes for later phases

- Events list renders platform label with an em dash; PowerShell showed it as mojibake — console encoding only, not an API bug.
