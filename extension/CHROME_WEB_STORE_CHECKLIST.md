# Chrome Web Store — packaging checklist

Use this before submitting the CyberSentinel extension. Submission itself is scheduled by the team after the privacy URL is public.

## 1. Privacy & permissions

- [x] Privacy policy hosted at app `/privacy` (and `doc/legal/Privacy_Policy.md`) — covers AI prompts, analyze content, tokens in `chrome.storage.local`, screenshots only on user-triggered report.
- [x] Permission justifications (paste into Store listing):

| Permission | Justification |
| :--- | :--- |
| `storage` | Persist API URL, org/user tokens, dashboard URL, safety settings |
| `alarms` | Policy refresh, ingest retry, enforcement poll |
| `tabs` / `scripting` / `activeTab` | Soft enforcement (close/blackout), overlays, scan UX |
| `contextMenus` | On-demand “Scan with CyberSentinel” |
| `webNavigation` | Optional pre-nav URL risk checks |
| `webRequest` | Optional network log heuristics in popup |
| `history` | History audit batch scan (dashboard-triggered) |
| Host access | AI sites for Guard; `<all_urls>` for Threat Explainer Quickball (document honestly for review) |

- [x] No remote code execution; all logic ships in the package.

## 2. Production defaults

- [x] Popup Config has **empty** defaults — user/admin sets API origin + tokens + dashboard (no `dev-key`).
- [ ] Screenshots from `frontend/public/Preview_images/` + live extension captures attached in listing.
- [x] Listing name: **CyberSentinel**.
- [x] Support contact: support@cybersentinel.example *(replace)*.

## 3. Functional smoke (staging)

- [ ] Manual page scan toast/overlay
- [ ] Open Dashboard uses configured URL
- [ ] AI prompt ingest appears in `/ai/events`
- [ ] 429 quota shows upgrade messaging
- [ ] Overlays do not execute HTML from model text

## 4. Assets

| Asset | Source |
| :--- | :--- |
| Store icon 128×128 | `extension/icons/icon128.png` |
| Screenshots | `frontend/public/Preview_images/` |
| Promo | Landing hero still (optional) |

## 5. Before submit

- [x] Package zip: `pwsh extension/pack-store.ps1`
- [x] Version in `manifest.json` (currently 1.1.0 — bump if shipping Store-only changes)
- [x] Privacy policy URL live and linked in listing
- [ ] **Submit or schedule:** _Scheduled after Phase 7 staging privacy URL is public. Owner: core team._

*Checklist version: 2026-09-09 — Phase 5.*
