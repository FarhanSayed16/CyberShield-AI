# 03 — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          EMPLOYEE DEVICES                           │
│                                                                     │
│  ┌──────────────────┐        ┌───────────────────────────────────┐  │
│  │  Chrome Browser  │        │    Developer / App Code           │  │
│  │                  │        │                                   │  │
│  │  ┌────────────┐  │        │   base_url = "api.aisentinel.io" │  │
│  │  │  AISentinel│  │        │   api_key  = <proxy_key>          │  │
│  │  │  Extension │  │        └──────────────┬────────────────────┘  │
│  │  └─────┬──────┘  │                       │                       │
│  │        │Prompt   │                       │ API Call              │
│  └────────┼─────────┘                       │                       │
└───────────┼─────────────────────────────────┼─────────────────────┘
            │                                 │
            │ HTTPS POST /events              │ HTTPS (OpenAI format)
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AISENTINEL BACKEND                           │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐   │
│  │  Event      │   │  API Proxy   │   │  Auth Service          │   │
│  │  Ingestion  │   │  (FastAPI)   │   │  JWT + org management  │   │
│  │  Service    │   │              │   │                        │   │
│  └──────┬──────┘   └──────┬───────┘   └────────────────────────┘   │
│         │                 │                                         │
│         └────────┬────────┘                                         │
│                  │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     DLP SCANNER                               │  │
│  │   Regex patterns + spaCy NER + Custom org patterns            │  │
│  │   Detects: PII, API Keys, Credentials, Financial Data         │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌─────────────────┐  ┌────────────┐  ┌───────────────┐            │
│  │   MongoDB 7     │  │   Redis    │  │  Alert Queue  │            │
│  │   (main store)  │  │  (cache +  │  │  (background  │            │
│  │   Beanie ODM    │  │  sessions) │  │   jobs)       │            │
│  └─────────────────┘  └────────────┘  └───────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ Forwards clean request
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│             AI PROVIDERS (external)                                 │
│                                                                     │
│   OpenAI API    Anthropic API    Google Gemini    Others            │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ Response streamed back through proxy
            ▼
      Developer's App / Employee's Browser
```

---

## Component Breakdown

### 1. Chrome Extension (Manifest V3)
**Purpose:** Capture browser-based AI usage (ChatGPT, Claude.ai, Gemini)

**How it works:**
- Content script injected into supported AI domains
- Intercepts form submissions / API calls using MutationObserver + fetch hooks
- Reads typed/pasted text from input elements
- POSTs events to AISentinel backend (non-blocking, async)
- Does NOT modify page behavior in MVP (observe-only)

**Supported sites (MVP):**
- `chat.openai.com`
- `chatgpt.com`
- `claude.ai`
- `gemini.google.com`
- `copilot.microsoft.com`

**Data captured per event:**
```json
{
  "org_token": "org_abc123",
  "user_token": "usr_xyz789",
  "platform": "chatgpt",
  "prompt_text": "...",
  "prompt_length": 512,
  "timestamp": "2026-05-21T10:30:00Z",
  "page_url": "https://chat.openai.com/...",
  "session_id": "sess_..."
}
```

---

### 2. API Proxy (FastAPI)
**Purpose:** Capture programmatic LLM API calls

**How it works:**
- Fully OpenAI-compatible endpoint (`/v1/chat/completions`, `/v1/embeddings`, etc.)
- Developers set `base_url = https://api.aisentinel.io/proxy/openai`
- Proxy extracts: org, user, model, prompt, token counts
- Forwards to real provider, logs request/response
- Streams response back to caller with minimal added latency

**Supported providers (MVP):**
- OpenAI (`api.openai.com`)
- Anthropic (`api.anthropic.com`)

**Headers used for auth:**
```
Authorization: Bearer <aisentinel_api_key>
X-AI-Provider: openai          # which provider to route to
X-Real-Provider-Key: sk-...    # optional, or stored in AISentinel
```

---

### 3. DLP Scanner
**Purpose:** Classify prompt content and detect sensitive data

**Detection patterns (MVP):**

| Category | Method | Examples |
|----------|--------|---------|
| Email addresses | Regex | `user@company.com` |
| Phone numbers | Regex (India + US) | `+91-9876543210`, `(555) 123-4567` |
| API Keys / Tokens | Regex | `sk-...`, `ghp_...`, `AKIA...` |
| Credit card numbers | Regex + Luhn check | `4111 1111 1111 1111` |
| Aadhaar numbers | Regex (India) | `1234 5678 9012` |
| PAN card | Regex (India) | `ABCDE1234F` |
| IP addresses | Regex | `192.168.1.1` |
| Company-specific | Custom patterns | Set by admin |
| Person names | spaCy NER | Detected as PERSON entities |
| Organization names | spaCy NER | Detected as ORG entities |

**Output per scan:**
```json
{
  "risk_score": 75,
  "findings": [
    {"type": "API_KEY", "severity": "CRITICAL", "offset": 45, "redacted": "sk-****"},
    {"type": "EMAIL", "severity": "MEDIUM", "offset": 120, "redacted": "u***@c***.com"}
  ],
  "categories": ["CREDENTIAL", "PII"]
}
```

---

### 4. Backend Services (FastAPI)

**Service structure:**
```
backend/
├── main.py                    # FastAPI app entry point
├── api/
│   ├── auth.py                # Login, signup, JWT
│   ├── orgs.py                # Org management
│   ├── users.py               # User management
│   ├── events.py              # Event ingestion + query
│   ├── proxy.py               # LLM proxy endpoint
│   └── dashboard.py           # Analytics aggregations
├── services/
│   ├── dlp.py                 # DLP scanner
│   ├── alerts.py              # Alert generation
│   └── email.py               # Email notifications
├── models/
│   └── documents.py           # Beanie ODM models
├── api/admin.py               # Admin Verify health + tests
└── config.py                  # Settings (env vars)
```

---

### 5. Frontend (React)

**Page structure:**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx       # Main analytics view
│   │   ├── Events.jsx          # Event log / feed
│   │   ├── Alerts.jsx          # DLP alerts
│   │   ├── Users.jsx           # Team management
│   │   ├── Settings.jsx        # Org settings + policies
│   │   └── AdminVerify.jsx     # Pipeline verification (admin)
│   ├── components/
│   │   ├── UsageChart.jsx      # Recharts line/bar
│   │   ├── EventTable.jsx      # Filterable event log
│   │   ├── AlertBadge.jsx      # Severity badges
│   │   ├── UserCard.jsx        # Per-user usage card
│   │   └── Sidebar.jsx
│   └── api/
│       └── client.js           # Axios API calls
```

---

## Tech Stack Decision Log

| Decision | Choice | Why |
|----------|--------|-----|
| Backend language | Python | DLP/NLP ecosystem (spaCy), rapid dev |
| API framework | FastAPI | Async, OpenAPI auto-docs, streaming support |
| Database | MongoDB 7 + Beanie | Flexible schema for events/findings, fast MVP |
| Cache | Redis | Session store + rate limiting + queue |
| Frontend | React + Tailwind | Fast to build, component reuse |
| Charts | Recharts | React-native, simple API |
| Extension | Vanilla JS MV3 | No bundler complexity for MVP |
| Auth | JWT (HS256) | Simple, stateless, good enough for MVP |
| Deploy | Docker Compose | Local + staging; see `13_DEPLOYMENT_DOCKER.md` |

---

## Data Flow: Employee Uses ChatGPT

```
1. Employee opens chat.openai.com
2. AISentinel extension content script activates
3. Employee types prompt and hits Enter
4. Extension intercepts before submission
5. Extension sends event to: POST /api/events (async, non-blocking)
6. Event hits DLP scanner (< 50ms)
7. If clean: logged as INFO event
8. If flagged: logged as ALERT + admin notified
9. Admin dashboard updates in real-time via WebSocket
```

## Data Flow: Developer Makes API Call

```
1. Developer code calls: POST https://api.aisentinel.io/proxy/openai/v1/chat/completions
2. Proxy authenticates via AISentinel API key
3. Proxy extracts org/user from key
4. Proxy runs DLP on prompt content
5. Proxy forwards request to real OpenAI endpoint
6. OpenAI streams response back through proxy
7. Proxy logs token counts + response summary
8. Response delivered to developer with ~20ms overhead
```

---

## Security Considerations

- Prompt data: TTL in MongoDB; optional field encryption in production (see `11_SECURITY_SPEC.md`)
- TLS 1.3 for all transport
- API keys are hashed before storage (bcrypt)
- Prompt text stored for 90 days by default (configurable)
- GDPR: admin can request full data deletion per user
- Extension uses HTTPS only, no HTTP fallback
- DLP scan happens server-side only (prompt never scanned client-side to avoid extension perf issues)

---

## Scaling Plan

**MVP (0–100 customers):**
- Single FastAPI instance + MongoDB + Redis via Docker Compose
- ~$20–50/month infra cost

**Growth (100–1000 customers):**
- MongoDB replica set or Atlas
- Redis cluster
- Separate DLP service (heavier spaCy model)
- CDN for frontend

**Scale (1000+ customers):**
- Kubernetes deployment
- Kafka for event streaming
- ClickHouse for analytics queries
- Multi-region
