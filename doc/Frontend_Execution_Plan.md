## CyberSentinel AI – Frontend Development Plan (Enhanced)

This plan is for the **Frontend Team** building the **React + Vite + Tailwind + UI library + Charts** dashboard, the **Chrome Browser Extension**, and the **Floating Security Assistant** — all integrated with the backend API.

Work is organized into **9 phases → sub‑phases**, with clear tasks, commands, tools, folder structure, implementation steps, expected outputs, and integration points.

---

### Integration Contract (Cross‑Team Reference)

Before starting, the Frontend Team must align on these shared contracts.

#### What the Backend Team Provides

- **Base API URL**: `http://localhost:8000` (dev), production URL from Render/Railway deployment.
- **Endpoints**:
  | Method | Path | Purpose |
  |--------|------|---------|
  | `POST` | `/api/analyze` | Submit URL / text / prompt for threat analysis |
  | `GET` | `/api/threats?page=1&page_size=20&type=url&threat_level=High Risk` | Paginated threat history |
  | `GET` | `/api/threats/{id}` | Single threat event details |
  | `GET` | `/api/stats` | Aggregated analytics (counts, distributions, timeseries) |
- **Auth**: All requests must include header `X-API-Key: <key>` (key set via environment variable).
- **CORS**: Backend allows `http://localhost:5173` (dev) and production frontend URL.

#### Shared Data Shapes (match Backend Pydantic schemas)

```ts
// --- Request ---
interface AnalyzeRequest {
  source: 'extension' | 'dashboard';
  type: 'url' | 'text' | 'prompt' | 'image' | 'video';
  content: string; // base64 for image/video
}

// --- Response ---
interface AnalyzeResponse {
  id: string;
  type: 'url' | 'text' | 'prompt' | 'image' | 'video';
  source: 'extension' | 'dashboard';
  raw_input_snippet: string;
  threat_type: 'phishing' | 'malicious_url' | 'prompt_injection' | 'deepfake' | 'benign';
  risk_score: number;          // 0–100
  threat_level: 'Safe' | 'Low Risk' | 'Suspicious' | 'High Risk';
  confidence: number;          // 0.0–1.0
  indicators: string[];
  explanation: string;
  key_points: string[];
  recommended_actions: string[];
  external_flags?: {
    safe_browsing?: string;
    virustotal_positives?: number;
    virustotal_total_engines?: number;
    domain_age?: string;
    phishstats_flagged?: boolean;
    safeprompt_risk?: string;
    hive_ai_result?: string;
  };
  severity_label: 'Informational' | 'Warning' | 'Critical';
  created_at: string;          // ISO‑8601
}

interface ThreatListResponse {
  items: AnalyzeResponse[];
  total: number;
}

interface StatsResponse {
  total_threats: number;
  by_type: Record<string, number>;
  by_level: { Safe: number; 'Low Risk': number; Suspicious: number; 'High Risk': number };
  last_24h: { timestamps: string[]; counts: number[] };
}
```

#### What the AI Agent Team Provides (for Frontend mocks)

- AI Agent team provides **sample JSON responses** for each threat type so the frontend can develop and demo even before the live AI agents are connected.
- Frontend should build with **mock data first**, then switch to live API.

#### Handoff Checkpoints

| Checkpoint | When | What |
|------------|------|------|
| API types aligned | Phase 2 start | Frontend TS types match Backend Pydantic schemas |
| Mock data ready | Phase 2 start | AI team provides 3+ sample responses per threat type |
| Live API callable | Phase 3 start | Backend `/api/analyze` returns real responses |
| Extension ↔ Backend | Phase 7 start | Extension can POST to `/api/analyze` and read responses |
| Deployment URLs | Phase 8 start | Backend gives production API URL; Frontend deploys to Vercel |

---

### Phase 1 – Project Initialization & Base Architecture

#### Subphase 1.1 – Initialize React/Vite/Tailwind Project

- **Instructions**
  - Create the `frontend` project using Vite with React + TypeScript.
  - Set up TailwindCSS as the styling foundation.
- **Tools Required**
  - Node.js (LTS)
  - npm or yarn
  - Vite, React, TypeScript, TailwindCSS
- **Commands**
  ```bash
  # From repo root
  mkdir frontend && cd frontend

  # Initialize Vite + React + TS
  npm create vite@latest . -- --template react-ts

  # Install Tailwind + PostCSS
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- **Implementation Steps**
  - Configure `tailwind.config.cjs` with:
    - `content: ["./index.html", "./src/**/*.{ts,tsx}"]`.
    - **Dark mode**: `darkMode: 'class'` (enable dark theme support).
    - **Custom color palette** — define security-themed colors:
      - `safe: '#10B981'` (green)
      - `low-risk: '#3B82F6'` (blue)
      - `suspicious: '#F59E0B'` (amber)
      - `high-risk: '#EF4444'` (red)
      - `primary: '#8B5CF6'` (purple)
      - `dark-bg: '#0F172A'` (slate-900)
  - Add Tailwind base styles to `src/styles/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* Dark theme default */
    body {
      @apply bg-dark-bg text-gray-100 font-sans;
    }
    ```
  - Import `index.css` in `src/main.tsx`.
  - Set up **responsive breakpoints** (Tailwind defaults: sm/md/lg/xl/2xl).
- **Expected Outputs**
  - `frontend` app runs at `http://localhost:5173` with dark-themed blank starter.
- **Integration Points**
  - None yet; this phase sets up the UI foundation.

---

#### Subphase 1.2 – Install UI Library, Icons, Charts, and HTTP Client

- **Instructions**
  - Add component library, charts library, HTTP client, and state management.
- **Commands**
  ```bash
  cd frontend

  # UI components
  npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

  # Charts
  npm install recharts

  # HTTP client
  npm install axios

  # State management
  npm install zustand

  # Routing
  npm install react-router-dom

  # Toast notifications
  npm install react-hot-toast
  ```
- **Implementation Steps**
  - Configure Material UI theme file `src/theme.ts`:
    - Dark mode palette with security-themed colors.
    - Custom typography (Inter or Roboto font).
  - Wrap `App` with `ThemeProvider`.
  - Verify a sample MUI button and a simple Recharts chart render correctly.
- **Expected Outputs**
  - All dependencies installed, dark theme configured, sample components render.
- **Integration Points**
  - These components will be reused across all dashboard phases.

---

#### Subphase 1.3 – Define Frontend Folder & Routing Structure

- **Instructions**
  - Establish a clear folder layout and basic routing.
- **Folder Structure**
  ```text
  frontend/
    src/
      api/
        client.ts              # Axios instance with baseURL + API key header
        endpoints.ts           # Wrapper functions for all backend APIs
        types.ts               # Shared TS interfaces (from Integration Contract)
        mocks.ts               # Mock responses for development without backend
      components/
        layout/
          AppLayout.tsx        # Main layout wrapper with sidebar + content area
          Sidebar.tsx          # Navigation sidebar
          Topbar.tsx           # Top bar with app name + status indicator
        common/
          Card.tsx             # Styled card component
          LoadingSpinner.tsx   # Loading spinner
          SkeletonCard.tsx     # Skeleton loader for cards
          RiskBadge.tsx        # Color-coded threat level badge
          RiskGauge.tsx        # Animated risk score gauge (0-100)
          IndicatorChip.tsx    # Threat indicator chip/tag
          ErrorBanner.tsx      # API error display with retry button
      features/
        scan/
          ScanForm.tsx         # Input form (URL / text / prompt selector + textarea)
          ScanResultCard.tsx   # Full result display after scan
          ScanHistory.tsx      # Recent scans quick list
        threats/
          ThreatTable.tsx      # Paginated threat history table
          ThreatFilters.tsx    # Filter controls (by type, level, date)
          ThreatDetailDrawer.tsx  # Slide-out detail panel for single threat
        analytics/
          ThreatCharts.tsx     # Charts: pie, bar, line
          KpiCards.tsx         # Top-level KPI summary cards
        assistant/
          AssistantWidget.tsx  # Floating security assistant widget
          AlertToast.tsx       # Toast notification for new threats
      pages/
        DashboardPage.tsx      # Live scan + overview
        ThreatHistoryPage.tsx  # Threat logs
        AnalyticsPage.tsx      # Charts and analytics
      stores/
        useScanStore.ts        # Scan input/result/loading/error state
        useThreatsStore.ts     # History, filters, pagination state
        useUIStore.ts          # Global toasts, assistant state, risk level
      styles/
        index.css              # Tailwind + global styles
      theme.ts                 # MUI theme config
      main.tsx
      App.tsx
  ```
- **Implementation Steps**
  - Implement `App.tsx` with routes:
    - `/` → `DashboardPage`
    - `/threats` → `ThreatHistoryPage`
    - `/analytics` → `AnalyticsPage`
  - Create `AppLayout` with `Sidebar` (collapsed/expanded) and `Topbar`.
  - Sidebar navigation items:
    - 🛡️ Dashboard (Live Scan)
    - 📋 Threat History
    - 📊 Analytics
  - Support URL query param `?threatId=...` on `/threats` to auto-open detail drawer.
- **Expected Outputs**
  - App with 3 navigable pages, consistent dark-themed layout with sidebar + content.
- **Integration Points**
  - `features/*` folders map directly to backend endpoints.
  - URL query param support enables deep-linking from the Chrome extension.

---

### Phase 2 – API Layer & Mock Data Setup

#### Subphase 2.1 – Define API Types and Client Helpers

- **Instructions**
  - Mirror the backend contracts exactly. Set up Axios with auth headers.
- **Implementation Steps**
  - In `src/api/types.ts`:
    - Copy all TypeScript interfaces from the Integration Contract section above.
  - In `src/api/client.ts`:
    ```ts
    import axios from 'axios';

    const apiClient = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      headers: {
        'X-API-Key': import.meta.env.VITE_API_KEY || 'dev-key',
        'Content-Type': 'application/json',
      },
    });

    export default apiClient;
    ```
  - In `src/api/endpoints.ts`:
    - `analyzeThreat(req: AnalyzeRequest): Promise<AnalyzeResponse>`
    - `getThreats(params): Promise<ThreatListResponse>`
    - `getThreatById(id: string): Promise<AnalyzeResponse>`
    - `getStats(): Promise<StatsResponse>`
  - Create `.env` file:
    ```
    VITE_API_URL=http://localhost:8000
    VITE_API_KEY=dev-key
    ```
- **Expected Outputs**
  - Strongly typed API helpers ready for use.
- **Integration Points**
  - Backend must implement endpoints with matching JSON shapes.

#### Subphase 2.2 – Create Mock Data for Parallel Development

- **Instructions**
  - Build mock responses so frontend can develop without waiting for backend.
- **Implementation Steps**
  - In `src/api/mocks.ts`:
    - Create 3+ mock `AnalyzeResponse` objects:
      - One phishing (high risk, score 92)
      - One malicious URL (high risk, score 86)
      - One benign (safe, score 12)
      - One prompt injection (suspicious, score 65)
      - One deepfake image (low risk/suspicious, score 45)
    - Create mock `StatsResponse` with realistic data.
    - Create mock `ThreatListResponse` with 10+ items for table testing.
  - Add a feature flag `VITE_USE_MOCKS=true` to switch between mock and live API.
- **Expected Outputs**
  - Frontend can render all views with realistic-looking data immediately.
- **Integration Points**
  - Mock data uses exact same types as real API — switching is seamless.

---

### Phase 3 – Threat Analysis UI (Scan View + Result Panel)

#### Subphase 3.1 – Build Scan Form

- **Instructions**
  - Create the primary scan interface on the Dashboard page.
- **Implementation Steps**
  - `features/scan/ScanForm.tsx`:
    - **Type selector**: Four tab buttons — 🔗 URL | 📧 Text/Email | 🤖 Prompt | 🖼️ Deepfake
    - **Content input**: Large textarea (or file uploader for deepfake) with placeholder:
      - URL: `"Enter a URL to scan, e.g. http://example-suspicious-site.com"`
      - Text: `"Paste an email or message to analyze for phishing"`
      - Prompt: `"Enter an AI prompt to check for injection attacks"`
      - Deepfake: Upload zone for image/video file (converts to base64 before send)
    - **Submit button**: "🔍 Scan Now" with loading state.
    - **Quick examples**: Pre-filled example buttons for demo convenience:
      - "Try phishing example"
      - "Try suspicious URL"
      - "Try prompt injection"
      - "Try deepfake image"
  - Wire to Zustand `useScanStore` for state management.
- **Expected Outputs**
  - Clean, intuitive scan form with type switching and example inputs.

#### Subphase 3.2 – Build Result Card with Risk Visualization

- **Instructions**
  - Display scan results with rich visual feedback.
- **Implementation Steps**
  - `features/scan/ScanResultCard.tsx`:
    - **Risk Score Gauge**: Animated circular gauge (0–100) with color gradient:
      - 0–29: Green (Safe)
      - 30–49: Blue (Low Risk)
      - 50–79: Amber (Suspicious)
      - 80–100: Red (High Risk)
    - **Threat Level Badge**: Large color-coded badge (`RiskBadge` component).
    - **Confidence**: Progress bar showing model confidence (0–100%).
    - **Indicators**: Row of chips/tags (`IndicatorChip` components).
    - **Explanation**: Text block with the AI's human-readable explanation.
    - **Key Points**: Bulleted list of key findings.
    - **Recommended Actions**: Checklist-style list with action items.
    - **External Flags** (if present):
      - Safe Browsing status badge.
      - VirusTotal score (e.g., "12/70 engines flagged").
      - Domain age warning.
    - **Severity Label**: "Informational" / "Warning" / "Critical" banner at top.
  - Add **animation**: Smooth slide-in when results appear.
  - Add **error state**: Banner with retry button on API failure.
  - Add **loading state**: Skeleton card while waiting for response.
- **Expected Outputs**
  - Visually impressive result display suitable for hackathon demo.
- **Integration Points**
  - Requires backend `POST /api/analyze` or mock data.

---

### Phase 4 – Threat Logs Interface (History & Detail)

#### Subphase 4.1 – Threat History Table

- **Instructions**
  - Build a paginated, filterable table listing historical threats.
- **Implementation Steps**
  - `features/threats/ThreatTable.tsx`:
    - **Columns**: Time, Type (icon), Threat Type, Risk Score, Threat Level (badge), Source, Snippet, Actions.
    - **Sorting**: Click headers to sort by risk score or time.
    - **Row click**: Opens detail drawer.
    - **Row styling**: Subtle red background tint for High Risk rows.
  - `features/threats/ThreatFilters.tsx`:
    - **Filter by type**: URL / Text / Prompt / Image / Video / All
    - **Filter by threat level**: Safe / Low Risk / Suspicious / High Risk / All
    - **Search**: Text search in `raw_input_snippet`.
  - **Pagination**: Page size selector (10/20/50) + page navigation.
  - Wire to `useThreatsStore`.
- **Expected Outputs**
  - Threat history page that loads from `GET /api/threats`.

#### Subphase 4.2 – Threat Detail Drawer

- **Instructions**
  - Show full details when a table row is clicked.
- **Implementation Steps**
  - `ThreatDetailDrawer.tsx`:
    - Slides in from the right side.
    - Displays ALL fields from `AnalyzeResponse`:
      - Full explanation with key points.
      - All indicators as chips.
      - External flags with visual badges.
      - Recommended actions as a checklist.
      - Timestamp and source info.
    - **"Copy Report"** button: Copies a text summary to clipboard.
  - Support direct navigation via URL: `?threatId=<id>` query parameter.
- **Expected Outputs**
  - Smooth UX for inspecting individual threats.
- **Integration Points**
  - May use `GET /api/threats/{id}` or reuse list data.

---

### Phase 5 – Security Analytics Visualization

#### Subphase 5.1 – KPI Summary Cards

- **Instructions**
  - Build top-level metric cards for the Analytics page.
- **Implementation Steps**
  - `features/analytics/KpiCards.tsx`:
    - **Total Threats Detected**: Large number with trend arrow.
    - **High Risk Count**: Red-themed card.
    - **Most Common Threat Type**: Icon + label.
    - **Average Risk Score**: Score with color indicator.
  - Cards should have subtle hover animations.
- **Expected Outputs**
  - At-a-glance security overview cards.

#### Subphase 5.2 – Analytics Charts

- **Instructions**
  - Build multiple chart visualizations using Recharts.
- **Implementation Steps**
  - `features/analytics/ThreatCharts.tsx`:
    - **Pie/Donut chart**: Threats by type (phishing / URL / prompt injection / deepfake).
    - **Bar chart**: Threats by risk level (Safe / Low Risk / Suspicious / High Risk).
    - **Line chart**: Threats over time (last 24 hours, hourly buckets).
    - **Horizontal bar**: Top indicators detected.
  - Use color palette matching threat level colors.
  - Layout `AnalyticsPage`: Responsive grid (2×2 on desktop, stacked on mobile).
- **Expected Outputs**
  - Rich analytics view ideal for hackathon demo.
- **Integration Points**
  - Charts update from `GET /api/stats`.

---

### Phase 6 – Floating AI Assistant Widget

#### Subphase 6.1 – Assistant Widget Component

- **Instructions**
  - Implement the "CyberSentinel Assistant" floating widget visible on all pages.
- **Implementation Steps**
  - `assistant/AssistantWidget.tsx`:
    - **Position**: Fixed bottom-right corner.
    - **Collapsed state** (default):
      - Circular icon with pulsing glow.
      - Color indicates system status: 🟢 Safe / 🔵 Low Risk / 🟡 Elevated / 🔴 High Risk.
      - Badge count for recent high-risk threats.
    - **Expanded state** (on click):
      - System status text: "CyberSentinel AI — System Monitoring"
      - Current threat level with explanation.
      - Quick link: "View Latest Threat" → opens detail drawer.
      - Quick scan button → opens scan form.
      - Recent activity feed (last 3 events).
    - **Toast notifications** (`AlertToast.tsx`):
      - When a new high-risk threat is detected, show toast alert.
      - Use `react-hot-toast` for notifications.
  - Connect to `useUIStore` for:
    - `currentGlobalRiskLevel` (derived from latest stats).
    - `latestThreatId`.
    - `unreadHighRiskCount`.
  - **Polling**: Poll `GET /api/stats` every 30 seconds to update status.
- **Expected Outputs**
  - Floating widget visible across all routes, showing live security status.
- **Integration Points**
  - Uses stats endpoint and threats list endpoint.

---

### Phase 7 – Chrome Browser Extension

#### Subphase 7.1 – Extension Project Setup

- **Instructions**
  - Create a Chrome Extension (Manifest V3) under `extension/` directory.
- **Folder Structure**
  ```text
  extension/
    manifest.json
    background.js          # Service worker
    content.js             # Injected into web pages
    popup/
      popup.html           # Popup UI
      popup.js
      popup.css
    icons/
      icon-16.png
      icon-48.png
      icon-128.png
  ```
- **Implementation Steps**
  - `manifest.json`:
    ```json
    {
      "manifest_version": 3,
      "name": "CyberSentinel AI",
      "version": "1.0",
      "description": "AI-powered cyber threat detection assistant",
      "permissions": ["activeTab", "contextMenus", "storage"],
      "host_permissions": ["http://localhost:8000/*", "<PRODUCTION_API_URL>/*"],
      "background": { "service_worker": "background.js" },
      "content_scripts": [{
        "matches": ["<all_urls>"],
        "js": ["content.js"]
      }],
      "action": {
        "default_popup": "popup/popup.html",
        "default_icon": { "16": "icons/icon-16.png", "48": "icons/icon-48.png" }
      },
      "icons": { "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
    }
    ```
  - Load extension in Chrome via `chrome://extensions` → Developer mode → Load unpacked.
- **Expected Outputs**
  - Extension loads in Chrome with icon in toolbar.
- **Integration Points**
  - Extension will POST to backend `POST /api/analyze`.

#### Subphase 7.2 – Background Script & API Communication

- **Instructions**
  - Implement the service worker that handles API calls to the backend.
- **Implementation Steps**
  - `background.js`:
    - Store backend API URL and API key in `chrome.storage.local`.
    - Function `analyzeContent(type, content)`:
      - POST to `/api/analyze` with `{ source: 'extension', type, content }`.
      - Return response JSON.
    - Handle responses:
      - Update extension badge:
        - Safe → green badge "OK"
        - Suspicious → amber badge "!"
        - High Risk → red badge "⚠"
    - **Context menu**:
      - Add right-click menu item: "🛡️ Scan with CyberSentinel"
      - On click: send selected text or link to `analyzeContent`.
- **Expected Outputs**
  - Background script can communicate with backend and update badge.

#### Subphase 7.3 – Content Script & Page Monitoring

- **Instructions**
  - Content script captures current page URL and selected text.
- **Implementation Steps**
  - `content.js`:
    - On page load: send current URL to background script for analysis.
    - Listen for text selection: when user selects text and right-clicks, make it available to context menu.
    - On receiving high-risk result from background: inject a small warning banner at the top of the page.
  - **Rate limiting**: Don't scan the same URL within 5 minutes.
- **Expected Outputs**
  - Page URLs auto-scanned; warning banner shown for dangerous pages.

#### Subphase 7.4 – Popup UI

- **Instructions**
  - Build a compact popup shown when clicking the extension icon.
- **Implementation Steps**
  - `popup/popup.html` + `popup.js`:
    - Display:
      - Current page scan status (Safe / Suspicious / High Risk).
      - Risk score if scanned.
      - Button: "Scan Current Page".
      - Button: "Open Dashboard" → opens React dashboard in new tab.
      - Link: "View in Dashboard" → opens `dashboard-url/?threatId=<id>`.
    - Style: Dark theme matching the dashboard.
- **Expected Outputs**
  - Functional popup with scan capability and dashboard link.
- **Integration Points**
  - "View in Dashboard" uses the deep-linking from Phase 1.3.

---

### Phase 8 – Deployment & Production Build

#### Subphase 8.1 – Frontend Deployment to Vercel/Netlify

- **Instructions**
  - Deploy the React dashboard to a live URL accessible to judges.
- **Implementation Steps**
  - Option A: **Vercel** (recommended):
    ```bash
    cd frontend
    npm install -g vercel
    vercel --prod
    ```
  - Option B: **Netlify**:
    - Push to GitHub, connect repo to Netlify.
    - Build command: `npm run build`
    - Publish directory: `dist`
  - Set environment variables on hosting platform:
    - `VITE_API_URL=<backend-production-url>`
    - `VITE_API_KEY=<production-api-key>`
  - Update backend CORS to allow production frontend URL.
  - Update extension `manifest.json` `host_permissions` with production API URL.
- **Expected Outputs**
  - Dashboard accessible at `https://<project>.vercel.app` or similar.
- **Integration Points**
  - Backend team must provide production API URL before this step.

---

### Phase 9 – Demo Preparation & Polish

#### Subphase 9.1 – Demo Data & Script

- **Instructions**
  - Prepare demo-ready data and a walkthrough script.
- **Implementation Steps**
  - Seed the database (coordinate with backend) with 15–20 sample threat events:
    - Mix of phishing, malicious URL, prompt injection, and benign results.
    - Various risk levels for chart diversity.
  - Create a **demo script** (order of operations for live demo):
    1. Open dashboard → show overview (assistant widget shows "Monitoring").
    2. Scan a phishing message → show risk gauge, explanation, actions.
    3. Scan a malicious URL → show external flags (Safe Browsing, VirusTotal).
    4. Scan a benign URL → show "Safe" result.
    5. Navigate to Threat History → show table with filters.
    6. Click a row → show detail drawer with full explanation.
    7. Navigate to Analytics → show charts and KPIs.
    8. Show Chrome extension → scan current page from popup.
    9. Right-click → "Scan with CyberSentinel" context menu.
  - **Quick example buttons** on the scan form should work with pre-written examples.

#### Subphase 9.2 – UX Polish & Error Handling

- **Instructions**
  - Final polish pass for hackathon presentation.
- **Implementation Steps**
  - Ensure all loading states have skeleton loaders (not just spinners).
  - Add smooth transitions between pages (fade or slide).
  - Add error boundaries with friendly messages and retry buttons.
  - Handle backend-down scenario: show "Backend unavailable, showing cached data" message.
  - Test all views on 1920×1080 (projector resolution) for demo.
  - Add CyberSentinel AI branding: logo, consistent header, footer.
- **Expected Outputs**
  - Production-quality, demo-ready UI that will impress judges.

---

### Task Assignment Guide

For a team of 2–3 frontend developers:

| Developer | Phases | Focus Area |
|-----------|--------|------------|
| Dev 1 | Phase 1, 2, 3 | Project setup, API layer, scan UI |
| Dev 2 | Phase 4, 5, 6 | History table, analytics charts, assistant widget |
| Dev 3 | Phase 7, 8, 9 | Chrome extension, deployment, demo prep |

If only 2 developers:
- **Dev 1**: Phases 1–3, 5 (setup + scan + analytics)
- **Dev 2**: Phases 4, 6–9 (history + assistant + extension + deploy + demo)

---

This plan enables the **Frontend Team** to work in parallel with backend and AI agent teams, produce a visually impressive and fully functional prototype, and be demo-ready for judges. The Integration Contract ensures all teams share the same data shapes and endpoints.
