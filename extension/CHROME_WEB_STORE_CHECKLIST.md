# Chrome Web Store — packaging checklist

Use this before submitting the CyberSentinel extension. Submission itself is optional; the checklist keeps production defaults honest.

## 1. Privacy & permissions

- [ ] Write a short privacy policy (hosted URL) covering: scanned page URLs/text, API key storage in `chrome.storage.local`, screenshots only when user triggers a report.
- [ ] Justify each permission in the Store listing:
  - `storage` — API URL, API key, dashboard URL, safety settings
  - `activeTab` / `scripting` / `tabs` — overlay + scan UX
  - `webNavigation` / `webRequest` — optional real-time URL checks (describe accurately)
  - Host permissions — only your backend API origin in production builds if possible
- [ ] Confirm no remote code execution; all logic ships in the package.

## 2. Production defaults

- [ ] Popup “API Configuration” defaults documented; users set:
  - API URL → `https://<backend>/api`
  - API key → strong production key (not `dev-key`)
  - Dashboard URL → Vercel app origin
- [ ] Screenshots for Store listing taken from `frontend/public/Preview_images/` (and live extension captures).
- [ ] Listing name: **CyberSentinel** (not CyberShield).
- [ ] Support / developer contact listed.

## 3. Functional smoke (production backends)

- [ ] Manual page scan returns a result toast/overlay
- [ ] Open Dashboard opens the configured Vercel URL
- [ ] History Audit `postMessage` works on that same origin
- [ ] 429 from API shows a user-visible message (no silent flood)
- [ ] Chat / overlays do not execute HTML from model text (XSS hardened)

## 4. Assets

| Asset | Source |
| :--- | :--- |
| Store icon 128×128 | `extension/` icons / logo |
| Screenshots | `frontend/public/Preview_images/` + Action Center captures |
| Promo tile | Optional — reuse landing hero still |

## 5. Before submit

- [ ] Package zip from a clean `extension/` folder (no `.env`, no secrets)
- [ ] Version bump in `manifest.json`
- [ ] Privacy policy URL live and linked in listing

*Checklist version: 2026-09-03 — Phase 5.*
