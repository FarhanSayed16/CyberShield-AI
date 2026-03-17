# CyberSentinel AI – Current Project Gaps, Issues & Fixes

This document lists **gaps**, **bugs**, **contract mismatches**, and **enhancements** identified across the connected frontend, backend, and extension. Use it to fix and harden the system.

---

## 1. Frontend ↔ Backend Contract & Config

### 1.1 Mock mode in production

- **Issue**: Frontend uses `VITE_USE_MOCKS === 'true'` to switch to mock data. If `.env` (or build env) has `VITE_USE_MOCKS=true` in production, the dashboard never calls the real API.
- **Fix**:
  - In production build, ensure `VITE_USE_MOCKS` is unset or `false`.
  - In `frontend/src/api/endpoints.ts`, you can add a fallback: if `import.meta.env.PROD` is true, ignore `VITE_USE_MOCKS` and always use the real API.

### 1.2 API base URL and key in production

- **Issue**: Frontend uses `import.meta.env.VITE_API_URL || 'http://localhost:8000'`. For deployed dashboard, the API URL and key must be set at build time.
- **Fix**:
  - On Vercel/Netlify (or similar), set `VITE_API_URL` and `VITE_API_KEY` in the project environment.
  - Ensure backend `CORS_ORIGINS` includes the production frontend origin (e.g. `https://your-app.vercel.app`).

### 1.3 Domain reputation endpoint query parameter

- **Issue**: Backend route is `GET /api/analyze/domain` with query param `url`. FastAPI treats `url: str` as a query parameter, so the client must send `?url=...`. Extension does this correctly; if any other client omits the query param, the request will fail.
- **Fix**: Document that `url` is required as a query parameter. Optionally in backend use `Query(...)` for clarity:  
  `url: str = Query(..., description="URL to check")`.

---

## 2. Frontend-Only Issues

### 2.1 Dashboard assistant not calling backend chat

- **Issue**: `AssistantWidget.tsx` uses a local `setTimeout` and keyword-based replies. It does **not** call `POST /api/chat` on the backend, so the “AI assistant” is not using the real chat service.
- **Fix**:
  - Add an API function in `frontend/src/api/endpoints.ts`, e.g. `sendChatMessage(prompt: string, url_context?: string)` that POSTs to `/api/chat` with the same body the backend expects.
  - In `AssistantWidget`, replace the simulated reply with a call to this API and show the returned `response_text` (or equivalent field from `ChatResponse`).

### 2.2 Scan result missing `key_points` handling

- **Issue**: Backend can return `key_points` as an array. `ScanResultCard` shows `explanation` and `recommended_actions` but does not render `key_points` as a separate bullet list (plan expected “Key Points” in the result card).
- **Fix**: In `ScanResultCard.tsx`, add a “Key points” section that maps `result.key_points` to a list when `result.key_points?.length > 0`.

### 2.3 Empty or sparse stats breaking charts

- **Issue**: If `GET /api/stats` returns `by_type: {}`, `by_level: {}`, or `last_24h: { timestamps: [], counts: [] }`, Recharts may still render but with empty or odd layouts.
- **Fix**: In `ThreatCharts.tsx` (and any KPI components), guard against empty data: use `Object.entries(stats.by_type).length ? ... : <EmptyState />`, and for the timeline use a default “no data” message when `last_24h.timestamps.length === 0`.

### 2.4 Image upload: data URL is correct

- **Status**: Frontend sends `readAsDataURL` (e.g. `data:image/png;base64,...`). Backend `deepfake_service` already strips the prefix with `content.split("base64,")[-1]`. No change needed.

---

## 3. Extension-Specific Issues

### 3.1 Extension API URL hardcoded to localhost

- **Issue**: In `extension/background.js` and `extension/popup.js`, `API_URL = 'http://localhost:8000/api'` and `API_KEY = 'dev-key'` are hardcoded. When the backend is deployed, the extension will still call localhost and fail.
- **Fix**:
  - Use `chrome.storage.sync` or `chrome.storage.local` to store `apiBaseUrl` and `apiKey` (e.g. set via options page or first-run).
  - Default to `http://localhost:8000/api` and `dev-key` only when not set.
  - For production, build or inject the production API URL (e.g. via a small build step or options UI).

### 3.2 Extension tier parameter typo

- **Issue**: In `background.js`, `analyzeThreatWithTier(..., fileTierStr)` is built as `"tier" + (request.tier || "3")`. If `request.tier` is the string `"1"` or `"2"`, you get `"tier1"` / `"tier2"` correctly. If `request.tier` is missing, you get `"tier3"`. So behavior is correct; ensure Quickball/UI always sends a numeric string `"1"`, `"2"`, or `"3"` (not `"tier1"` again) to avoid double prefix.

### 3.3 Report endpoint screenshot format

- **Issue**: Extension sends `screenshot_base64: dataUrl` where `dataUrl` is from `chrome.tabs.captureVisibleTab` (format `data:image/png;base64,...`). Backend schema expects “Base64 encoded PNG”. Backend report handler does not decode it; if later you persist or process the image, you must strip the `data:image/png;base64,` prefix before decoding.
- **Fix**: Either strip the prefix in the backend when processing, or in the extension send only the raw base64 string: `screenshot_base64: dataUrl.replace(/^data:image\/\w+;base64,/, '')`.

### 3.4 Popup stats URL

- **Issue**: Popup uses `fetch(\`${API_URL}/stats\`)` with `API_URL = 'http://localhost:8000/api'`, so it requests `http://localhost:8000/api/stats`. Backend serves stats at `/api/stats`. Correct; no change except making `API_URL` configurable (see 3.1).

### 3.5 Missing content.css

- **Issue**: `manifest.json` references `"css": ["content.css"]` in the content_scripts block, but the extension folder may not include `content.css`. That can cause the content script to fail loading or styling (Quickball/overlay) to be missing.
- **Fix**: Add `content.css` in the extension folder with styles for `.cs-glass-panel`, `.cs-header`, `.cs-close-btn`, etc., or remove the `"css": ["content.css"]` entry from the manifest if styles are injected by JS.

---

## 4. Backend-Only Issues

### 4.1 Domain reputation endpoint auth from extension

- **Issue**: Domain endpoint uses `Depends(require_auth)`, which expects `X-API-Key`. Extension sends that header for `/analyze` and `/report`; ensure it also sends `X-API-Key` for `GET /api/analyze/domain?url=...`. If the extension uses a shared `fetch` helper that adds the header, confirm it’s used for the domain request too.

### 4.2 Snippet for image/video in analyze

- **Status**: Backend uses `snippet = content[:200]` only when type is not image/video; for image/video it uses `f"[{request.type} file]"`. No change needed.

### 4.3 Optional `advanced_analysis` in response and DB

- **Issue**: Backend returns and schema allows `advanced_analysis`. If this is not stored in MongoDB, detail view and history will not show it after reload.
- **Fix**: If you want `advanced_analysis` to persist, add an optional field to `ThreatEventDocument` and to `crud_threats.create_threat_event` (and to the mapping in routes). If it’s intentionally ephemeral, document that and ensure frontend does not rely on it for persistence.

### 4.4 Error messages and 422 validation

- **Issue**: When backend returns 422 (e.g. invalid URL, empty content), frontend shows `err.response.data.detail` which can be a string or a list of validation errors. Frontend already handles both in `useScanStore`; ensure all analyze validation rules (min_length, max_length, URL format) are consistent with frontend validation so users see clear messages.

---

## 5. Cross-Stack Integration

### 5.1 CORS

- **Issue**: Backend must allow the exact origin of the deployed frontend and (for extension) often no “origin” for background requests; extension background script requests may send no Origin. Ensure backend CORS allows the frontend origin; for extension, same-origin or no-origin is typically fine if you’re not calling from a web page.
- **Fix**: Set `CORS_ORIGINS` to include `https://your-dashboard.vercel.app` (and keep `http://localhost:5173` for dev).

### 5.2 Rate limiting and toasts

- **Issue**: Backend enforces rate limiting (e.g. 30/min). If the frontend triggers many requests (e.g. polling + scan), users may hit 429 with a generic message.
- **Fix**: In frontend API client, on 429 response show a user-friendly toast (“Too many requests; please wait a moment”) and optionally back off polling.

### 5.3 Threat history refresh after scan

- **Status**: After a successful scan, `useScanStore` calls `useThreatsStore.getState().fetchThreats(true)`. Good; ensure `fetchThreats` is not clearing the list on error when called with `isPolling: true` so that a transient error doesn’t wipe the table.

---

## 6. Data & Types

### 6.1 Frontend type `behavior_anomaly`

- **Issue**: Frontend `types.ts` includes `behavior_anomaly` in `ThreatType`. Backend supports `anomaly` as input type and can return `behavior_anomaly` as threat_type. Ensure backend actually returns that value when the anomaly service classifies a threat so that filters and badges work.

### 6.2 Stats `by_level` keys

- **Issue**: Frontend expects `by_level: { Safe, Suspicious, 'High Risk' }`. Backend aggregation returns whatever exists in the DB. If there are no “High Risk” events, that key may be missing and charts might need to default to 0 for each level.
- **Fix**: In backend `get_stats_summary`, ensure the returned `by_level` dict always includes keys `"Safe"`, `"Suspicious"`, and `"High Risk"` with value 0 when missing. Alternatively, in frontend when building `levelData`, default missing keys to 0.

---

## 7. Suggested Fix Order

1. **Config & production**
   - Ensure production frontend does not use mocks (`VITE_USE_MOCKS` / `PROD` check).
   - Set `VITE_API_URL` and `VITE_API_KEY` for production build.
   - Add production frontend origin to backend `CORS_ORIGINS`.

2. **Dashboard assistant**
   - Wire `AssistantWidget` to `POST /api/chat` and display the real response.

3. **Extension**
   - Make API URL and API key configurable (storage + options or env) and use them in background and popup.

4. **UX**
   - Add `key_points` to `ScanResultCard`.
   - Harden charts and KPIs for empty stats; default `by_level` in backend or frontend.

5. **Polish**
   - Handle 429 in frontend with a clear message and optional back-off.
   - Optionally persist or document `advanced_analysis`; ensure domain endpoint is documented (query param `url`).

---

## 8. Quick Checklist

| Area              | Item                                              | Status / Action        |
|-------------------|---------------------------------------------------|------------------------|
| Frontend          | Mocks off in production                           | Add PROD check or env  |
| Frontend          | Assistant calls `/api/chat`                        | Wire API + UI          |
| Frontend          | ScanResultCard shows `key_points`                 | Add section            |
| Frontend          | Charts handle empty stats                         | Defaults / empty state  |
| Frontend          | 429 handling                                      | Toast + back-off       |
| Extension         | API URL/key configurable                          | Storage + defaults     |
| Extension         | Report: send raw base64 if backend expects it     | Strip data URL prefix  |
| Extension         | content.css present if manifest references it     | Add file or remove ref |
| Backend           | Stats `by_level` always has Safe/Suspicious/High Risk | Return default 0s  |
| Backend           | Domain endpoint `url` query param                 | Document or use Query() |
| Integration       | CORS for production frontend                      | Set CORS_ORIGINS       |

Use this file as the single reference to close gaps and align frontend, backend, and extension for a stable, production-ready flow.
