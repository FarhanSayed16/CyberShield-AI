# Phase 4 — Extension integration notes

**Date:** 2026-09-09  
**Branch:** `integrate/phase4-extension`  
**Status:** Core merge **done** — one MV3 extension = AI Workplace Guard + Threat Explainer

## Package

Load unpacked: repo root **`extension/`** (see [`../extension/INSTALL.md`](../extension/INSTALL.md)).

| Area | Location |
| :--- | :--- |
| Manifest | `extension/manifest.json` v1.1.0 |
| Threat UX | `content.js`, `content.css`, Quickball / context menu |
| AI Guard scripts | `ai-content.js` + `utils/`, `engine/`, `lineage/`, `ui/` |
| Service worker | `background.js` (analyze + ingest + policy + enforcement) |
| Popup | Config: API origin, org token, user token, dashboard URL |

## Auth model

| Call | Auth |
| :--- | :--- |
| `POST /api/events`, policy, enforcement | `X-Org-Token` + `user_token` body |
| `/api/analyze`, `/api/stats`, chat, report | `X-Org-Token` (+ optional `X-User-Token`) via extended `require_jwt_or_api_key` |
| Legacy | Optional `X-API-Key` if no org token (dev only) |

No shared `dev-key` defaults in popup/background. Placeholders only.

## Removed / cleaned

- AIS debug telemetry endpoint (`127.0.0.1:7607`) — never ported
- Hardcoded dashboard footer URL — requires Config
- Brand: `window.__CyberSentinel`, storage `cs_policy` / `cs_ingest_queue`

## Deferred

- esbuild packaging (still unpacked multi-file; fine for v1 Store later)
- Shadow-AI scoring still unused (module present, not wired — post-v1)
- Narrowing `<all_urls>` for Store review (document justification in checklist)

## Exit criteria

- [x] One unpacked extension: AI ingest **and** threat scan path  
- [x] Tokens identify employee for Events  
- [x] Soft enforcement poll + close/blackout wired  
- [x] Reload / install docs for testers  
- [x] Manual matrix sheet in INSTALL.md  
