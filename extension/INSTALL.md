# CyberSentinel Extension — Install & reload (Phase 4)

## Load unpacked (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select the repo folder `extension/` (this directory).
4. Pin the CyberSentinel action icon.

## Configure (employee)

1. Sign in to the dashboard as admin → **Org Settings** (copy **org token**) and **Team** (copy the employee’s **user token**), or use seed tokens when developing with Mongo.
2. Click the extension → **Config** tab:
   - **API URL:** `http://localhost:8000` (local) or your staging/prod API origin (no `/api` suffix).
   - **Org token** / **User token**
   - **Dashboard URL:** e.g. `http://localhost:5173`
3. **Save**. Status should show **Monitoring active**.

## What it does

| Surface | Behavior |
| :--- | :--- |
| ChatGPT / Claude / Gemini | Captures prompts → `POST /api/events` (org-scoped) |
| Soft enforcement | Polls `/api/enforcement/pull` → close AI tabs or blackout |
| Any page | Quickball + context-menu threat scan → `/api/analyze` (org token) |
| Dashboard deep links | Uses configured Dashboard URL |

## Reload after code changes

1. On `chrome://extensions`, click **Reload** on CyberSentinel.
2. Refresh any open ChatGPT/Claude/Gemini tabs (content scripts re-inject).
3. Re-open the popup if Config looks stale.

## Manual QA matrix (smoke)

| Site | Action | Expect |
| :--- | :--- | :--- |
| ChatGPT | Send a prompt | Event appears under `/ai/events` for that user |
| Claude | Send a prompt | Same |
| Gemini | Send a prompt | Same |
| Any site | Right-click → Scan | Overlay + threat in history |
| Alerts UI | Soft enforcement | AI tabs close or blackout within ~1 min |

## Version

Manifest version: **1.1.0** (Phase 4 merge). Bump patch for fixes; minor for feature drops.
