# 21 — Web Browsing Monitoring (Future Epic)

## Status

**Not in MVP.** AISentinel MVP monitors **employee AI tool prompts** on ChatGPT, Claude, and Gemini only. See [`20_ORG_EMPLOYEE_MONITORING.md`](20_ORG_EMPLOYEE_MONITORING.md).

This document defines a **future phase** for broader web activity visibility. Do not implement until Gate 6 (extension → dashboard for AI prompts) passes reliably.

---

## Product intent

Give org admins visibility into **which sites employees visit** and **time spent**, separate from AI prompt content. This complements AI prompt monitoring; it does not replace it.

---

## Legal and HR requirements

- Written employee notice before deployment (acceptable use policy).
- Configurable retention (e.g. 30–90 days) for URL/title logs.
- Blocklist for personal domains (banking, health, etc.) where feasible.
- No full page HTML capture by default — URL, title, duration, category only.

---

## Technical approach (draft)

| Component | Proposal |
|-----------|----------|
| Extension | `webNavigation` + `tabs` permissions; org policy `web_activity_monitoring: boolean` |
| Events | New collection `browsing_events` or `Event.event_type: navigation` |
| Payload | `{ url, title, duration_sec, category, user_token }` |
| Dashboard | New route `/web-activity` — timeline and top domains |
| Performance | Batch sends every 30s; cap events per user per hour |

---

## Out of scope for this epic

- Keystroke logging on non-AI sites
- Screenshot capture
- Blocking or modifying navigation (observe-only)

---

## Gate to start implementation

1. Extension AI ingest: `extension_count > 0` on Admin Verify ingest-stats for 7 consecutive days in pilot.
2. Customer sign-off on employee notice template.
3. Security review per [`11_SECURITY_SPEC.md`](11_SECURITY_SPEC.md).

---

## Cross-links

- Shadow AI (unknown AI UIs): [`aisentinel/new features/features/03_SHADOW_AI_DETECTION.md`](../aisentinel/new%20features/features/03_SHADOW_AI_DETECTION.md)
- MVP extension: [`08_CHROME_EXTENSION_SPEC.md`](08_CHROME_EXTENSION_SPEC.md)
