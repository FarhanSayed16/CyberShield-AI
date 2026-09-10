# Phase 3 — Frontend integration notes

**Date:** 2026-09-09  
**Branch:** `integrate/phase3-frontend`  
**Status:** Core merge **done** — one React app with JWT auth + AI Guard + Threat Explainer

## What landed in `frontend/`

| Area | Location |
| :--- | :--- |
| Auth context | `src/context/AuthContext.tsx` |
| API client (Bearer JWT) | `src/api/client.ts` |
| Login / Signup / Invite | `LoginPage`, `SignupPage`, `AcceptInvitePage` |
| AI Guard pages | `AiOverviewPage`, `AiEventsPage`, `AiAlertsPage`, `TeamUsersPage`, `OrgSettingsPage`, `AdminVerifyPage` |
| Shell | `App.tsx` + role-gated routes; `Sidebar` / `Topbar` with AI + Threat nav |
| Landing CTAs | Sign in / signup (no bare `/dashboard` for guests) |
| WS | `useWebSocket` sends JWT `token=` (or optional `VITE_API_KEY`) |

## Backend tweaks for JWT console

Threat Explainer routes that still used only `X-API-Key` now accept JWT via `require_jwt_or_api_key`:

- `/api/stats`, `/api/analytics/*`, `/api/chat`, `/api/rules/*`
- `/api/analyze/domain|batch|email`, narrative/compare, `/api/report`
- WebSocket `/api/ws/threats?token=<jwt>` (or legacy `api_key=`)

`GET /api/auth/me` returns `user_public` + `org_name` (includes `user_token` for extension setup).

## Auth UX

| Actor | Flow |
| :--- | :--- |
| New admin | `/signup` → JWT → `/ai` |
| Returning | `/login` → `/ai` |
| Invitee | `/accept-invite?token=…` |
| Employee | Sees AI Overview + events + Threat Explainer; no Team / Settings / Alerts admin |
| Manager | + Risk Alerts |
| Admin | + Team, Org Settings, Admin Verify |

## Smoke checklist

1. Seed: `python -m app.scripts.seed_org` (memory or Mongo)
2. Frontend: `npm run dev` → Sign in `admin@demo.com` / `password`
3. `/ai` overview loads; `/ai/events` lists
4. `/dashboard` Live Scan with JWT (no `VITE_API_KEY` required)
5. Employee login cannot open `/ai/settings` (redirect `/ai`)

## Deferred / follow-ups

- Dedicated “Install extension” guide page (Phase 4 packaging)
- Rich post-signup checklist UI (invite → install → first event)
- Org-scoped `/api/stats` filtering (still global aggregate when JWT)
- Rules org-scope
- Full brand pass on long-form landing capability copy (hero + CTAs updated)

## Exit criteria

- [x] Auth shell + Guard pages + Threat Explainer under one app  
- [x] Role gates in nav and routes  
- [x] Landing pitch matches Guard + Explainer + D8 pricing signal  
- [x] End users use JWT (API key optional/dev only)  
- [x] `npm run build` succeeds  
