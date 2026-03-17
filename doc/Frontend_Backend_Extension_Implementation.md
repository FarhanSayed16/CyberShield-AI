# CyberShield AI – Frontend, Backend & Extension Implementation

This document describes **what is implemented** in the **frontend** (React dashboard), **backend** (FastAPI), and **browser extension**, and **how each part works** end-to-end.

---

## 1. Backend (FastAPI)

### 1.1 Overview

- **Framework**: FastAPI
- **Entry**: `backend/app/main.py`
- **Database**: MongoDB with **Beanie** ODM; collection `threat_events` for threat analysis results.
- **Auth**: API key via `X-API-Key` header; validated in `app/api/deps.require_auth`. Default key: `dev-key` (configurable via `API_KEY` in `core/config.py`).
- **CORS**: Allowed origins from `CORS_ORIGINS` (default `http://localhost:5173` for the Vite dev server).

**Startup (lifespan)**:

1. `setup_logging()` — request ID and structured logging  
2. `init_db()` — MongoDB connection and Beanie document registration  
3. `ai_manager.initialize()` — load ML models and HuggingFace pipelines  

**Middleware**:

- **Request ID**: Each request gets an 8-char hex `X-Request-ID` for tracing.

**Routers** (all under `/api` unless noted):

| Prefix | Router | Purpose |
|--------|--------|--------|
| `/api` | `analyze_router` | Threat analysis, domain check |
| `/api` | `threats_router` | Threat history CRUD and list |
| `/api` | `stats_router` | Dashboard stats |
| `/api` | `health_router` | Health check |
| `/api` | `agents_router` | Agent debug endpoints |
| `/api` | `chat_router` | AI assistant chat |
| `/api` | `report_router` | Manual threat reports (extension) |
| `/api` | `ws_router` | WebSocket (optional live updates) |
| `/api/rules` | `rules_router` | Custom rules |
| `/api/intel` | `intel_router` | Intel sharing |

---

### 1.2 Main API Endpoints

#### POST `/api/analyze`

- **Purpose**: Main threat analysis. Accepts URL, text, prompt, image, or video; routes to the correct AI pipeline and returns a full analysis result.
- **Auth**: Required (`X-API-Key`).
- **Body**: `AnalyzeRequest` — `type` (url | text | prompt | image | video), `content` (string or base64 for media), `source` (extension | dashboard), optional `tier` (auto | tier1 | tier2 | tier3).
- **Flow**:
  1. Sanitize input; for URLs, validate format and optionally prepend `http://`.
  2. Call `route_request(type, content, source, tier)` → `ThreatDecision`.
  3. Run **rule engine** (custom rules) to optionally adjust risk_score, threat_level, and indicators.
  4. Get **remediation steps** from `get_remediation_steps(threat_type, risk_score, indicators)` and set `recommended_actions`.
  5. Build DB record and persist via `crud_threats.create_threat_event(db_data)`.
  6. Return `AnalyzeResponse` (event_id, risk_score, threat_level, indicators, explanation, key_points, recommended_actions, external_flags, etc.).
- **Response**: `AnalyzeResponse` — same shape as a threat event, including `event_id` for reference.

#### GET `/api/analyze/domain`

- **Purpose**: Domain reputation check (e.g. from extension). Runs URL analysis for `https://domain` and returns reputation result.
- **Query**: `domain`, `source`.
- **Auth**: Required.
- **Implementation**: Builds URL from domain, calls same URL analysis pipeline and rule/remediation logic, persists and returns a domain-oriented response (`DomainReputationResponse`).

#### GET `/api/threats`

- **Purpose**: Paginated list of past threat events with optional filters.
- **Query**: `page`, `page_size`, `threat_level` (Safe | Suspicious | High Risk | All), `threat_type` (phishing | malicious_url | prompt_injection | deepfake | behavior_anomaly | benign | All).
- **Auth**: Required.
- **Implementation**: `crud_threats.list_threats()` with `threat_level_filter` and `threat_type_filter`; returns `{ items: [...], total }` where each item is an `AnalyzeResponse`-like object.

#### GET `/api/threats/{id}`

- **Purpose**: Fetch a single threat event by ID (`event_id`).
- **Auth**: Required.
- **Implementation**: `crud_threats.get_threat_by_id(id)`.

#### GET `/api/stats`

- **Purpose**: Aggregate stats for dashboard (e.g. total threats, by level, by type, recent activity).
- **Auth**: Required.
- **Response**: `StatsResponse` — structure defined in backend schemas; consumed by frontend KPI cards and charts.

#### GET `/api/health`

- **Purpose**: Liveness/readiness (e.g. DB and optional dependency checks).
- **Response**: `{ status: "ok", ... }`.

#### POST `/api/chat`

- **Purpose**: AI assistant: user asks a question, optionally with current page URL as context.
- **Body**: `{ prompt: string, url_context?: string }`.
- **Auth**: Required.
- **Implementation**: `chat_service.generate_chat_response(prompt, url_context)` (Gemini); returns `{ response: string }`. Mock mode supported when `USE_MOCK_AGENTS` is True.

#### POST `/api/report`

- **Purpose**: Manual threat report from extension (e.g. user reports a URL or uploads screenshot).
- **Body**: Report payload (URL, description, optional screenshot/base64).
- **Auth**: Required.
- **Implementation**: Validates input, can create a threat event or store in a reports collection; returns `ThreatReportResponse`.

---

### 1.3 Database (MongoDB + Beanie)

- **Connection**: `MONGODB_URI`, `DB_NAME` (default `cybersentinel`) in `core/config.py`; initialized in `db/connection.py`.
- **Document**: `ThreatEventDocument` in `db/models.py`:
  - Fields: `event_id`, `type`, `source`, `raw_input_snippet`, `threat_type`, `risk_score`, `threat_level`, `confidence`, `indicators`, `explanation`, `key_points`, `recommended_actions`, `external_flags`, `severity_label`, `advanced_analysis`, `created_at`.
- **CRUD**: `db/crud_threats.py` — `create_threat_event`, `list_threats` (with pagination, threat_level and threat_type filters), `get_threat_by_id`, and any other helpers used by routes.

---

### 1.4 Security & Config

- **Input sanitization**: `core/security.sanitize_input`, `validate_url_format` used before analysis.
- **Config**: `core/config.py` — Pydantic `Settings` from env/`.env`: MongoDB, Gemini keys, external API keys, `API_KEY`, `CORS_ORIGINS`, etc.

---

## 2. Frontend (React + Vite)

### 2.1 Stack

- **React** with **TypeScript**
- **Vite** for build and dev server
- **React Router** for routing
- **MUI (Material-UI)** for components and layout
- **Zustand** for state (scan, threats, UI)
- **Axios** for API calls (see `api/client.ts`, `api/endpoints.ts`)
- **Framer Motion** for page transitions (`AnimatePresence`)

### 2.2 App Structure

- **Entry**: `main.tsx` — mounts `App` inside a root element.
- **App** (`App.tsx`):
  - `ThemeProvider` + `CssBaseline` (theme from `theme.ts`, mode from `useUIStore.themeMode`).
  - `OnboardingTour` — first-time user tour.
  - `useWebSocket()` — optional live feed from backend.
  - `AppLayout` — sidebar + main content area; children are routes.
  - **Routes**:
    - `/` → `DashboardPage`
    - `/threats` → `ThreatHistoryPage`
    - `/threats/:id1/compare/:id2` → `ThreatDiffPage`
    - `/analytics` → `AnalyticsPage`
    - `/email` → `EmailScanPage`
    - `/audit` → `BrowsingAuditPage`
    - `/rules` → `RulesPage`
  - `AssistantWidget` — floating AI assistant (chat with backend `/api/chat`).

### 2.3 API Layer

- **Client**: `api/client.ts` — Axios instance with `baseURL` from `VITE_API_URL` (default `http://localhost:8000`), header `X-API-Key` from `VITE_API_KEY` (default `dev-key`).
- **Endpoints** (`api/endpoints.ts`):
  - `analyzeThreat(req)` → POST `/api/analyze`, returns `AnalyzeResponse`.
  - `getThreats(page, pageSize, level, type)` → GET `/api/threats` with params `page`, `page_size`, `threat_level` (omitted if "All"), `threat_type` (omitted if "All").
  - `getThreatById(id)` → GET `/api/threats/{id}`.
  - `getStats()` → GET `/api/stats`.
  - `sendChatMessage(req)` → POST `/api/chat`.
- **Mocks**: When `VITE_USE_MOCKS=true` and not production, endpoints return mock data from `api/mocks.ts` (e.g. mockPhishing, mockMaliciousUrl, mockThreatList, mockStats) with simulated delay. Mock threat list is filtered by `level` and `type` the same way as the real API (threat_level and threat_type).
- **Types**: `api/types.ts` — `AnalyzeRequest`, `AnalyzeResponse`, `ThreatListResponse`, `StatsResponse`, `ChatRequest`, `ChatResponse`, etc., aligned with backend schemas.

### 2.4 State (Zustand)

- **useScanStore**: Holds last scan request, result, loading, error; used by scan form and result card.
- **useThreatsStore**: Holds list of threats, total count, loading, error, selected threat; methods to `fetchThreats(page, pageSize, level, type)` and clear error on success; used by Threat History page and filters.
- **useUIStore**: Theme (light/dark), sidebar open state, and any other UI preferences.

### 2.5 Main Features & Pages

- **Dashboard** (`DashboardPage`): Scan form, last scan result (ScanResultCard), scan history (ScanHistory), and high-level KPIs or links to threats/analytics.
- **Scan form** (`ScanForm`): Input for type (URL, text, prompt, etc.), content, optional tier; on submit calls `analyzeThreat` and updates `useScanStore` with result/error.
- **Scan result** (`ScanResultCard`): Displays risk score, threat level, indicators, explanation, recommended actions; uses `RiskBadge`, `RiskGauge` where applicable.
- **Threat History** (`ThreatHistoryPage`): Table of past threats (`ThreatTable`), filters (`ThreatFilters` — threat_level and threat_type including e.g. behavior_anomaly), refresh button, error banner with retry. On load and when filters change, calls `getThreats(..., level, type)` and stores in `useThreatsStore`; error state is shown via `ErrorBanner` (optional title), retry/refresh re-fetches and clears error on success.
- **Threat detail**: Row click or "View" opens `ThreatDetailDrawer` with full event (indicators, explanation, key_points, recommended_actions, etc.).
- **Threat compare** (`ThreatDiffPage`): Compare two threats by id (e.g. for A/B analysis).
- **Analytics** (`AnalyticsPage`): Uses `getStats()` and/or threat list; `KpiCards` and `ThreatCharts` for visualizations.
- **Email scan** (`EmailScanPage`): Dedicated UI for pasting email content and running text analysis (same backend analyze).
- **Browsing audit** (`BrowsingAuditPage`): Audit-style view of browsing/scan history (if implemented).
- **Rules** (`RulesPage`): UI for custom rules (if backend rules API is consumed).
- **Assistant** (`AssistantWidget`): Floating panel; user types message, frontend calls `sendChatMessage({ prompt, url_context })` and displays `response`; optional URL context can be passed from current page when used in extension context.

### 2.6 Common Components

- **Layout**: `AppLayout`, `Sidebar`, `Topbar` — navigation, theme toggle, user area.
- **Common**: `ErrorBanner` (message, optional title, retry), `RiskBadge`, `RiskGauge`, `LoadingSpinner`, `SkeletonCard`, `Card`, `AnimatedPage`, `IndicatorChip`.

### 2.7 Theme

- **theme.ts**: Builds MUI theme (palette, typography) based on mode (light/dark); used by `ThemeProvider` in App.

---

## 3. Browser Extension

### 3.1 Manifest (Manifest V3)

- **File**: `extension/manifest.json`
- **Permissions**: `activeTab`, `scripting`, `storage`, `contextMenus`, `webNavigation`, `history`, `webRequest`
- **Host permissions**: `<all_urls>`, `http://localhost:8000/*`
- **Background**: Service worker `background.js`
- **Content script**: `content.js`, `content.css` — injected into all pages
- **Action**: Popup `popup.html` (script `popup.js`); default icons 16/48/128

### 3.2 Background Script (`background.js`)

- **API config**: Reads `apiBaseUrl` and `apiKey` from `chrome.storage.local` (defaults: `http://localhost:8000/api`, `dev-key`). All backend calls use these.
- **Safe domains**: List of known-safe domains (e.g. google.com, github.com, localhost); used to skip auto-scan on these sites.
- **Context menu**: On install, creates "Scan with CyberSentinel AI" for selection and link. On click:
  - Sends message to content script to show scan overlay.
  - Calls `analyzeThreat(textOrUrl, type, tabId)` — type `url` for link, `text` for selection.
- **Message handlers**:
  - **manualScanFromQuickball**: Show overlay; call `analyzeThreatWithTier(url, "url", tabId, tier)`.
  - **pageTextForScan**: Auto-scan — content script sends extracted page text; background analyzes it as `text` and sends result back to tab.
  - **scanExternalLink**: Analyze URL from content script.
  - **manualTextScan**: User entered text/URL/prompt in Quickball; `analyzeThreatWithTier(content, inputType, tabId, tier)`.
  - **manualFileScan**: File upload for deepfake; `analyzeThreatWithTier(fileData, "image", tabId, tier)`.
  - **askAiAssistant**: POST to `${apiUrl}/chat` with `{ prompt: request.query, url_context: request.url }`, `X-API-Key`; sends response back to content script for AI assistant UI.
- **analyzeThreat / analyzeThreatWithTier**: POST to `${apiUrl}/analyze` (or equivalent) with body `{ type, content, source: "extension", tier }`; on response, sends `updateScanOverlay` with result to tab; on error, sends `scanOverlayError` with message.
- **Domain check**: Can call backend domain/reputation endpoint (e.g. `/api/analyze/domain`) with domain; used for badge or inline reputation.
- **Report**: Can POST to `/api/report` with user-reported URL/screenshot when user submits a report from the extension.

### 3.3 Content Script (`content.js`)

- **Overlay**: Creates/updates a glassmorphic overlay (`#cybersentinel-overlay-root`) for "Scanning..." and then "CyberSentinel AI Report" with risk color, summary, and close button.
- **Message handling**:
  - `showScanOverlay` — show overlay in "Scanning..." state.
  - `updateScanOverlay` — update overlay with result (risk, explanation, indicators).
  - `scanOverlayError` — show error toast.
  - `showWarningBlocker` — full-page blocker for high-risk (if implemented).
  - `aiAssistantResponse` — show AI assistant reply in Quickball or inline.
  - `toast` — show small notification.
  - `extractAndScanPageText` — extract visible text from page, send to background for analysis; also trigger link scanning.
- **Quickball**: Floating button/ball on the page; opens panel for:
  - Manual scan (URL/text/prompt/file) with tier selection.
  - AI assistant: user types question, content script sends `askAiAssistant` to background with query and current page URL; displays response.
- **Page text extraction**: `extractPageText()` — gathers visible text (e.g. from body) and sends substring to background.
- **Link scanning**: `scanPageLinks()` — finds external links and can send them to background for URL analysis.
- **Styling**: `content.css` — styles for overlay, Quickball, toasts, blocker.

### 3.4 Popup (`popup.html` + `popup.js`)

- **Status card**: Shows "Browser is Protected" or "Protection Paused" based on `safetySettings.blockHighRisk` in storage; toggle to enable/disable real-time (e.g. auto-scan) and persist.
- **Stats**: Fetches live stats from backend (e.g. GET `/api/stats` or equivalent) using stored API URL/key; displays threat count, last scan time, etc.
- **Settings**: API URL and API key inputs; save to `chrome.storage.local` (`apiBaseUrl`, `apiKey`); used by background for all API calls.

### 3.5 End-to-End Flow (Extension)

1. **User selects text or link** → Context menu "Scan with CyberSentinel AI" → overlay shown, background POSTs to `/api/analyze` → result sent to tab → overlay updated with risk and explanation.
2. **User opens Quickball** → Manual scan (URL/text/prompt/file) with tier → same analyze flow; optional tier sent as `tier` (e.g. tier1, tier2, tier3).
3. **User asks assistant** → Quickball chat → background POST `/api/chat` with prompt and URL context → content script shows response.
4. **Auto-scan (if enabled)** → On some pages, content script extracts text and sends to background → background analyzes as text → result can update badge or overlay.
5. **Report** → User can submit a report; background POSTs to `/api/report` with URL/screenshot/details.

---

## 4. Summary Table

| Area | Implemented | Notes |
|------|-------------|--------|
| Backend FastAPI app | Yes | Lifespan, CORS, request ID, routers |
| POST /api/analyze | Yes | Full pipeline, rules, remediation, DB persist |
| GET /api/analyze/domain | Yes | Domain reputation via URL pipeline |
| GET/POST threats (list, by id) | Yes | Pagination, threat_level + threat_type filters |
| GET /api/stats, /api/health | Yes | Stats for dashboard; health for ops |
| POST /api/chat | Yes | Gemini assistant; mock option |
| POST /api/report | Yes | Extension manual reports |
| MongoDB + Beanie | Yes | threat_events collection |
| Frontend React app | Yes | Router, theme, layout, WebSocket hook |
| Dashboard, Scan form, Result card | Yes | Uses scan store and analyze endpoint |
| Threat History + filters + drawer | Yes | getThreats with level/type; error + retry/refresh |
| Analytics, Email, Audit, Rules pages | Yes | Structure and API wiring as implemented |
| Assistant widget | Yes | sendChatMessage to /api/chat |
| Extension background | Yes | Analyze, chat, report, domain; storage config |
| Extension content script | Yes | Overlay, Quickball, page text, links, assistant |
| Extension popup | Yes | Protection toggle, API config, live stats |

This document and the **AI Implementation Overview** (`doc/AI_Implementation_Overview.md`) together describe the current implementation of the CyberShield AI project end-to-end.
