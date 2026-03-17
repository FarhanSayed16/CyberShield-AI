## CyberSentinel AI – Architecture Reference Guide

This document explains each architecture diagram and how it maps to the real system.  
Use it as the **single reference** while building and extending CyberSentinel AI.

Related PlantUML files:

- `architecture_context.puml`
- `architecture_backend_agents.puml`
- `architecture_frontend_extension.puml`
- `architecture_url_sequence.puml`
- `architecture_data_model.puml`

---

### 1. System Context – `architecture_context.puml`

**Purpose**: Show the **big picture** of CyberSentinel AI – what talks to what.

**Key elements**

- **End User**
  - Interacts with:
    - Web browser (normal browsing, AI prompts, email/web apps).
    - React dashboard (manual scans, viewing threats).
- **User Environment**
  - `Web Browser (Chrome / Edge)` – where the Chrome extension runs.
  - `Other Apps (Email / Chat)` – sources of text the user can copy/paste into the dashboard.
- **CyberSentinel Client Layer**
  - `React Dashboard (Vite + Tailwind)` – main UI for scanning, history, analytics.
  - `Floating Security Assistant` – small widget showing security status and alerts.
  - `Chrome Extension (Manifest V3)` – automatically monitors URLs and selected text.
- **CyberSentinel Backend Layer**
  - `API Gateway / Orchestrator` – FastAPI endpoints (`/api/analyze`, `/api/threats`, `/api/stats`).
  - `AI Agent Router` – decides which AI agents and security services to call.
- **AI & Security Intelligence**
  - `Gemini‑based AI Agents` – phishing, URL, prompt injection, explanation, recommendation.
  - `Google Safe Browsing API` – URL reputation.
  - `VirusTotal API` – community malware/phishing scans.
  - `WHOIS / Domain Info (Optional)` – domain age and metadata.
- **MongoDB Atlas**
  - Stores all **threat events**, indicators, explanations, and basic analytics.

**Flows (high‑level)**

- Browser/extension and dashboard send JSON requests to **FastAPI**.
- FastAPI forwards to AI agents + security APIs, then stores results in **MongoDB**.
- Dashboard and assistant read from FastAPI (which reads from MongoDB) to show history, analytics, and live status.

Use this diagram when you need to explain the overall architecture to judges or new teammates.

---

### 2. Backend & AI Agents – `architecture_backend_agents.puml`

**Purpose**: Explain the **internal structure of the backend** and the **AI agent layer**.

**Main backend components**

- `API Gateway (routers/api.py)`
  - Public FastAPI endpoints.
  - Handles authentication, CORS, and error formatting.
- `Input Validator (Pydantic Models)`
  - Defines request/response schemas.
  - Normalizes inputs into a standard internal `ThreatRequest` shape.
- `Threat Router (type‑based dispatch)`
  - Checks `type` (`url`, `text`, `prompt`) and routes to the correct detection service.

**Detection services**

- `Phishing Detection Service`
  - For `type = text/email`.
  - Calls **Phishing Detection Agent** and aggregates indicators (urgency, credential request, etc.).
- `URL Analysis Service`
  - For `type = url`.
  - Calls **URL Risk Agent**, **Safe Browsing**, **VirusTotal**, and optional **WHOIS**.
  - Produces a combined view of URL risk.
- `Prompt Injection Service`
  - For `type = prompt`.
  - Calls **Prompt Injection Agent** to classify and extract indicators.

**AI Agent clients (Gemini / Google AI Studio)**

- `Phishing Detection Agent Client`
  - Sends email/message content to Gemini with a strict JSON schema.
- `URL Risk Agent Client`
  - Sends the URL to Gemini for pattern‑based risk reasoning.
- `Prompt Injection Agent Client`
  - Evaluates prompts for instruction overrides and policy bypass attempts.
- `Threat Explanation Agent Client`
  - Converts raw results (threat type, indicators, score) into human‑readable explanation + bullet points.
- `Recommendation Agent Client`
  - Suggests specific actions based on threat type and severity.

**Security integrations**

- `Google Safe Browsing Client`
  - Queries Google for known phishing/malware flags.
- `VirusTotal Client`
  - Checks how many engines report the URL as malicious.
- `WHOIS / Domain Info Client (optional)`
  - Retrieves domain age and registration metadata; new or suspicious domains increase risk.

**Risk & persistence**

- `Risk Scoring & Fusion Engine`
  - Combines:
    - LLM risk score.
    - External evidence.
    - Simple heuristics (domain length, age, suspicious keywords).
  - Produces a final **risk_score (0–100)** and **threat_level (Safe / Suspicious / High Risk)**.
- `Recommendation Composer`
  - Wraps the final decision + recommendations into a **single threat event object**.
  - Saves the event in `MongoDB` and returns structured JSON to the client.

Use this diagram whenever you work on **backend code**, especially when wiring new endpoints or agents.

---

### 3. Frontend & Browser Extension – `architecture_frontend_extension.puml`

**Purpose**: Describe how the **React dashboard** and **Chrome extension** are structured and how they talk to the backend.

**React dashboard (Vite + Tailwind)**

- `Scan View (URL / Text / Prompt)`
  - Form to input URLs, messages, or prompts manually.
  - Calls `POST /api/analyze` and shows results (risk, explanation, actions).
- `Threat History Table`
  - Lists past threat events from `GET /api/threats`.
  - Columns: time, type, risk level, source, short description.
- `Analytics & Charts`
  - Uses `/api/stats` for:
    - Threat counts over time.
    - Distribution by type and severity.
- `Threat Detail & Explainability Panel`
  - Shows full explanation, indicators, external flags, and recommended actions for a single event.
- `Floating CyberSentinel Assistant Widget`
  - Mini component pinned on the UI edge.
  - Shows current overall status (Safe / Elevated / High Risk).
  - Links to the most recent high‑risk event.

**Chrome extension (Manifest V3)**

- `Background Script`
  - Central hub for:
    - Receiving messages from content script and popup.
    - Making HTTP calls to `/api/analyze`.
  - Keeps minimal state about recent results.
- `Content Script`
  - Runs inside web pages.
  - Reads the current URL and selection.
  - Can highlight risky content when results arrive.
- `Popup UI`
  - When clicked in the browser toolbar:
    - Button: "Scan this page".
    - Shows last scan result (status + risk score).
- `Context Menu ('Scan with CyberSentinel')`
  - Right‑click action to scan selected text or links.

**Backend API**

- All frontend/extension components talk only to the **FastAPI API**, never directly to LLMs or third‑party security APIs.

Use this diagram to plan or review **UI features** and **extension behavior**.

---

### 4. URL Threat Analysis Sequence – `architecture_url_sequence.puml`

**Purpose**: Show the **end‑to‑end flow** for a single, common scenario: scanning a suspicious URL from the browser.

**Step‑by‑step flow**

1. **User action**
   - User visits a URL and clicks "Scan page" (popup or context menu).
2. **Extension sends request**
   - Extension posts to `/api/analyze` with:
     - `type = "url"`
     - `content = "<url>"`
3. **API Gateway and router**
   - API Gateway validates the request and passes a normalized `ThreatRequest` to the `Threat Router`.
   - Router routes to `URL Analysis Service`.
4. **URL Analysis Service → AI & security APIs**
   - Calls:
     - `Gemini URL Agent` – pattern‑based reasoning on the URL itself.
     - `Google Safe Browsing` – reputation.
     - `VirusTotal` – community scan results.
5. **Risk scoring**
   - URL service sends all signals to the `Risk Scoring Engine`.
   - Engine outputs final `risk_score` and `threat_level`.
6. **Persistence**
   - URL service writes a `threat_event` document into `MongoDB`.
7. **Responses**
   - API Gateway sends:
     - **Compact result** to the extension (short label + risk).
     - **Full result** to the React dashboard on demand.
8. **User feedback**
   - Extension shows popup/badge (Safe/Suspicious/High Risk).
   - Dashboard/assistant can show detailed explanation and recommended actions.

Use this diagram during implementation/debugging of **URL scanning** or when demonstrating the request/response pipeline to judges.

---

### 5. Threat Event Data Model – `architecture_data_model.puml`

**Purpose**: Define the **MongoDB data structures** you should follow when implementing the database layer.

**Collections and relationships**

- `ThreatEvent`
  - Core document for every analyzed input.
  - Key fields:
    - `type` – `url | text | prompt`.
    - `source` – `extension | dashboard`.
    - `raw_input_snippet` – short version of the scanned content.
    - `threat_type` – `phishing | malicious_url | prompt_injection | benign`.
    - `risk_score` – integer 0–100.
    - `threat_level` – `Safe | Suspicious | High Risk`.
    - `confidence` – 0.0–1.0 from AI.
    - `created_at` – timestamp.
- `Indicators`
  - One‑to‑many with `ThreatEvent`.
  - Each row is a **reason** the system flagged the threat.
  - Examples:
    - `label`: "urgency language", `category`: "language".
    - `label`: "recently registered domain", `category`: "domain_reputation".
- `ExternalFlags`
  - Optional one‑to‑one with `ThreatEvent`.
  - Stores:
    - `safe_browsing` – `SAFE / PHISHING / MALWARE / UNKNOWN`.
    - `virustotal_positives` and `virustotal_total_engines`.
    - `domain_age` – e.g. `"<30 days"`.
- `Explanation`
  - Optional one‑to‑one with `ThreatEvent`.
  - Fields:
    - `summary_text` – human‑readable explanation.
    - `key_points` – bullet points for UI.
- `Recommendations`
  - Optional one‑to‑one with `ThreatEvent`.
  - Fields:
    - `severity_label` – `Informational | Warning | Critical`.
    - `actions` – array of recommended user actions.

Use this diagram when designing **MongoDB schemas**, writing **Pydantic models**, or building **history and detail views** in the dashboard.

---

### How to Use This Reference While Building

- When you implement or modify **APIs and backend logic**, look at:
  - `architecture_backend_agents.puml`
  - `architecture_data_model.puml`
- When you work on **UI, UX, or extension**, use:
  - `architecture_frontend_extension.puml`
  - `architecture_url_sequence.puml` (for flows).
- When you need to **explain the whole system** (judges, README, presentation), start with:
  - `architecture_context.puml`

Keep this file open as your **master guide** so all team members implement features in line with the same architecture.

