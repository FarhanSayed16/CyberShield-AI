# CyberSentinel

<p align="center">
  <img src="frontend/public/logo.png" alt="CyberSentinel Logo" width="140" />
</p>

<p align="center">
  <strong>Explainable AI-Powered Cyber Defense Platform</strong><br />
  Detect · Analyze · Explain · Remediate
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-0F766E?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.135-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas%20%7C%20Local-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Extension-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Product Preview](#product-preview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [API Overview](#api-overview)
- [Browser Extension](#browser-extension)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Core Developers](#core-developers)
- [License](#license)

---

## Overview

**CyberSentinel** (CyberShield AI) is an explainable cyber defense platform that protects users across the browser and an operator console. It analyzes **phishing**, **malicious URLs**, **prompt injection**, **synthetic media (deepfakes)**, and related threats using a **multi-tier detection pipeline**—then returns not only a risk score, but **indicators, plain-language explanations, and recommended actions**.

| Surface | Role |
| :--- | :--- |
| **Landing + Operator Console** | Marketing site and full dashboard for scan, history, analytics, email, audit, and rules |
| **Browser Extension** | Real-time Quickball / Action Center on every page |
| **FastAPI Backend** | Analyze, threats, stats, chat, report, rules, and intel APIs |
| **MongoDB** | Persistent threat event history |
| **Gemini (Tier 3)** | Structured explainability and assistant chat |

---

## Product Preview

### Landing page

<p align="center">
  <img src="frontend/public/Preview_images/01-landing-hero.png" alt="CyberSentinel Landing Page" width="900" />
</p>

<p align="center"><em>Brand-first landing experience with explainable analysis mock and product CTAs</em></p>

### Operator console — Live scan

<p align="center">
  <img src="frontend/public/Preview_images/02-dashboard-scan.png" alt="Live Scan Dashboard" width="900" />
</p>

<p align="center"><em>Threat Analyzer with URL / text / prompt / deepfake inputs and engine tier selection</em></p>

### Threat history

<p align="center">
  <img src="frontend/public/Preview_images/03-threat-history.png" alt="Threat History" width="900" />
</p>

<p align="center"><em>Filterable event log with risk scores, levels, compare mode, and CSV export</em></p>

### Security analytics

<p align="center">
  <img src="frontend/public/Preview_images/04-analytics.png" alt="Security Analytics" width="900" />
</p>

<p align="center"><em>KPI cards and attack timeline for operational visibility</em></p>

### Browser extension — Action Center

<p align="center">
  <img src="frontend/public/Preview_images/05-extension-action-center.png" alt="Extension Action Center" width="420" />
  &nbsp;&nbsp;
  <img src="frontend/public/Preview_images/06-extension-results.png" alt="Extension Analysis Results" width="420" />
</p>

<p align="center"><em>In-page Action Center: tier selection, URL/text scan, deepfake upload, live detection, and explainable results</em></p>

---

## Core Features

### Multi-tier detection engine

| Tier | Purpose | Typical technology |
| :--- | :--- | :--- |
| **Tier 1** | Fast local triage | Lexical / custom ML heuristics for URL & text |
| **Tier 2** | Enrichment | External intel (e.g. Safe Browsing, VirusTotal) when configured |
| **Tier 3** | Explainability | Google Gemini structured JSON — explanations, IOCs, remediation |

Users can run **Auto** (fused) or force a single tier from the dashboard or extension.

### Threat channels

- **Malicious URL & phishing** — lookalike domains, credential harvest patterns, urgency language  
- **Prompt injection** — jailbreaks, system-prompt leaks, payload highlighting  
- **Deepfake / synthetic media** — image (and related) authenticity signals  
- **Email / message review** — paste or scan message bodies for IOCs  

### Operator console

- Live Threat Analyzer with engine selection  
- Threat History with filters, detail views, compare, and export  
- Analytics (totals, high-risk blocked, timelines)  
- Email scanner, browsing audit, and custom rule engine  

### Browser extension (Manifest V3)

- Context-menu and Quickball / Action Center scans  
- Live page detection, manual scan, pause protection  
- Deepfake upload, tier selection, AI assistant with page context  
- Configurable API base URL and API key  

### Explainability contract

Every analysis aims to return a consistent shape:

`risk_score` · `threat_level` · `indicators` · `explanation` · `recommended_actions` · optional `external_flags`

---

## Architecture

```text
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  React Console + Landing     │     │  Chrome Extension (MV3)      │
│  Vite · TypeScript · MUI     │     │  Quickball / Action Center   │
└──────────────┬───────────────┘     └──────────────┬───────────────┘
               │  REST / WebSocket                   │
               └────────────────┬────────────────────┘
                                ▼
               ┌────────────────────────────────────┐
               │  FastAPI Backend (:8000)             │
               │  /api/analyze · /threats · /stats    │
               │  /chat · /report · /rules · /intel   │
               └────────────────┬───────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
   │  MongoDB    │      │  Gemini T3   │      │ Optional ML  │
   │  Beanie ODM │      │  Explain +   │      │  HF Space URL │
   │  threat_events │   │  Chat        │      │  (if set)    │
   └─────────────┘      └──────────────┘      └──────────────┘
```

> **Note:** Heavy local Torch/transformers loads are intentionally offloaded from the main API for free-tier hosts. Leave `HF_API_URL` empty to operate **Gemini-only**, or point it at a separate ML service when available.

---

## Technology Stack

| Layer | Stack |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, MUI, Tailwind CSS, Zustand, Framer Motion, Recharts |
| **Backend** | FastAPI, Uvicorn, Pydantic Settings, Loguru, httpx |
| **Database** | MongoDB, Motor, Beanie |
| **AI** | Google Gemini (`GEMINI_API_KEYS`), optional enrichment APIs |
| **Extension** | Manifest V3, vanilla JS content/background/popup |
| **Models** | Trained artifacts under `models/` (URL / text / deepfake weights) |

---

## Repository Structure

```text
CyberShield AI/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/v1/          # Routes (analyze, threats, stats, chat, …)
│   │   ├── clients/         # Gemini, Safe Browsing, VirusTotal, …
│   │   ├── services/        # Phishing, URL, prompt, deepfake, risk engine
│   │   ├── db/              # Beanie models & CRUD
│   │   └── core/            # Config, security, prompts
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React operator console + landing
│   ├── public/
│   │   ├── logo.png         # Official CyberSentinel brand mark
│   │   └── Preview_images/  # Product screenshots for docs
│   ├── src/
│   │   ├── pages/           # Landing, Dashboard, Threats, Analytics, …
│   │   ├── features/        # Scan, threats, analytics, assistant, landing
│   │   ├── components/      # Layout, brand logo, shared UI
│   │   └── api/             # Axios client & endpoints
│   └── .env.example
├── extension/               # Chrome MV3 extension
├── models/                  # Trained ML artifacts
├── cybersentinel-ml-api/    # Optional remote ML microservice
├── doc/                     # Architecture & implementation docs
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+  
- **Python** 3.10+  
- **MongoDB** (local or [Atlas](https://www.mongodb.com/cloud/atlas))  
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)  

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env
# Edit .env — see Environment Configuration below

uvicorn app.main:app --reload --port 8000
```

- Health: http://localhost:8000/api/health  
- Swagger: http://localhost:8000/docs  

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- Landing: `/` · Console: `/dashboard`  

### 3. Extension

1. Chrome → `chrome://extensions` → enable **Developer mode**  
2. **Load unpacked** → select the `extension/` folder  
3. Open the popup → set API URL to `http://localhost:8000/api` and your `API_KEY`  

---

## Environment Configuration

### Backend (`backend/.env`)

Use names that match the code (see `backend/.env.example`):

| Variable | Description |
| :--- | :--- |
| `MONGODB_URI` | Mongo connection string |
| `DB_NAME` | Database name (default `cybersentinel`) |
| `GEMINI_API_KEYS` | One or more Gemini keys (comma-separated) |
| `API_KEY` | Shared secret for `X-API-Key` |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `HF_API_URL` | Optional remote ML base URL (leave empty for Gemini-only) |
| `USE_MOCK_AGENTS` | `false` for real Gemini responses |

### Frontend (`frontend/.env`)

| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Backend origin, e.g. `http://localhost:8000` |
| `VITE_API_KEY` | Must match backend `API_KEY` |
| `VITE_USE_MOCKS` | `false` for real API calls |

Production builds: set `VITE_*` on the host **before** build (Vite bakes them at compile time). See `frontend/.env.production.example`.

---

## API Overview

Authenticated requests send header: `X-API-Key: <API_KEY>`

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/analyze` | Main threat analysis (`type`, `content`, `source`, `tier`) |
| `GET` | `/api/analyze/domain` | Domain reputation check |
| `GET` | `/api/threats` | Paginated history (`threat_type`, `threat_level`) |
| `GET` | `/api/threats/{id}` | Single event |
| `GET` | `/api/stats` | Dashboard aggregates |
| `POST` | `/api/chat` | Security assistant |
| `POST` | `/api/report` | Manual reports from the extension |
| `GET` | `/api/health` | Health check |

Full interactive docs: http://localhost:8000/docs  

---

## Browser Extension

| Capability | Description |
| :--- | :--- |
| **Action Center** | Score, tier picker, URL/text scan, deepfake upload |
| **Live detection** | Background / page monitoring with pause control |
| **Results overlay** | Risk, confidence, explanation, remediation |
| **Ask CyberSentinel** | Chat with optional page URL context |
| **Dashboard link** | Jump to the full operator console |

Brand asset used in the product UI: [`frontend/public/logo.png`](frontend/public/logo.png)

---

## Deployment

Recommended free-tier path (Gemini-only):

| Component | Host |
| :--- | :--- |
| Database | MongoDB Atlas (M0) |
| Backend | Render (root: `backend`) |
| Frontend | Vercel (root: `frontend`) |
| Extension | Load unpacked (or Chrome Web Store later) |

Hugging Face **Docker / Gradio Spaces** currently require a paid plan for new free accounts. Leave `HF_API_URL` empty unless you host ML elsewhere.

Detailed guides:

- [`free_tier_deployment_guide.md`](free_tier_deployment_guide.md)  
- [`cybersentinel-ml-api/HF_UPLOAD_GUIDE.md`](cybersentinel-ml-api/HF_UPLOAD_GUIDE.md)  

---

## Documentation

| Document | Contents |
| :--- | :--- |
| [`doc/AI_Implementation_Overview.md`](doc/AI_Implementation_Overview.md) | AI tiers, services, schemas |
| [`doc/Frontend_Backend_Extension_Implementation.md`](doc/Frontend_Backend_Extension_Implementation.md) | Full-stack implementation map |
| [`doc/Architecture_Reference.md`](doc/Architecture_Reference.md) | Architecture reference |
| [`doc/Current_Project_Gaps_And_Fixes.md`](doc/Current_Project_Gaps_And_Fixes.md) | Known gaps and fixes |

---

## Core Developers

CyberSentinel is built and maintained by:

| Developer | Role |
| :--- | :--- |
| **Farhan Sayed** | Core developer |
| **Manas Sawant** | Core developer |
| **Simran Singh** | Core developer |

<p align="center">
  <img src="frontend/public/logo.png" alt="CyberSentinel" width="72" />
</p>

---

## License

This project is intended for educational and research use unless a separate license file is provided in the repository.

---

<p align="center">
  <strong>CyberSentinel</strong> — Explainable protection for every page you open.<br />
  <sub>Built by Farhan Sayed · Manas Sawant · Simran Singh</sub>
</p>
