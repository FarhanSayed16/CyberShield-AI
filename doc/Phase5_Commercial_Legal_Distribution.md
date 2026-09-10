# Phase 5 — Commercial, legal & distribution

**Date:** 2026-09-09  
**Branch:** `integrate/phase5-commercial`  
**Status:** Core spine **done** (Stripe-ready + dev activate; legal pages live; Store package prep)

## Billing

| Item | Location |
| :--- | :--- |
| Plans / quotas | `backend/app/services/plans.py` |
| Org fields | `plan`, `trial_ends_at`, `stripe_*`, `seat_limit` on `Organization` |
| API | `/api/billing/status`, `/checkout`, `/portal`, `/webhook`, `/dev-activate`, `/plans` |
| UI | `/ai/billing` (`BillingPage.tsx`) |
| Signup | Starts **trial** (14 days) |
| Enforce | Seats on invite; events/day on ingest; analyzes/day on `/api/analyze` → **429** + upgrade hint |

**Stripe:** set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`.  
Without keys: `POST /api/billing/dev-activate` (blocked in production when Stripe is live).

## Onboarding

- Invite returns full `accept_url?token=` + honest `email_delivery: manual`  
- Accept invite UI already live  
- Admin checklist on AI Overview (+ Billing + Install)  
- Employee one-pager: `/install`

## Legal

| Doc | App route | Repo |
| :--- | :--- | :--- |
| Privacy | `/privacy` | `doc/legal/Privacy_Policy.md` |
| Terms | `/terms` | `doc/legal/Terms_Of_Service.md` |
| Retention | (referenced) | `doc/legal/Data_Retention.md` |
| Monitoring template | — | `doc/templates/Employee_Monitoring_Disclosure.md` |
| Incident / support | — | `doc/ops/Incident_Response.md` |

Replace `@cybersentinel.example` mailboxes before production.

## Distribution

- Store checklist updated: `extension/CHROME_WEB_STORE_CHECKLIST.md`  
- Pack: `extension/pack-store.ps1` → zip without secrets  
- Unpacked enterprise path: `extension/INSTALL.md` + `/install`  
- **Submit:** scheduled by team after privacy URL is on a public host (not auto-submitted)

## Exit criteria

- [x] Trial path (signup) + paid path (Stripe checkout **or** documented staging checkout)  
- [x] Quotas enforced  
- [x] Privacy + install docs live in app  
- [x] Store package ready (zip script + checklist; submit explicitly scheduled)  
