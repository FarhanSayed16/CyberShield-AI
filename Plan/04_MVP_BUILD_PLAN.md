# 04 — MVP Build Plan (Week-by-Week)

## Overview

**Total MVP Duration:** 3 weeks  
**Output:** Working prototype with Chrome extension + backend + dashboard  
**Target:** A CTO can sign up, invite team, and see prompts within 30 minutes  

---

## Pre-requisites (Before Starting)

```bash
# Required installed on build machine:
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- MongoDB 7 (via Compose)
- Redis 7 (via Compose)
- Git

# Optional:
- Gmail (SMTP for notifications)
```

---

## Week 1 — Backend Foundation

### Day 1: Project Setup + Database

**Tasks:**
1. Initialize project structure
2. Set up Docker Compose for local dev
3. Start MongoDB via Compose; init Beanie models + seed
4. Implement health check endpoint

**Canonical Compose:** see [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md) (MongoDB, not PostgreSQL).

**Directory structure to create:**
```
aisentinel/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── orgs.py
│   │   ├── users.py
│   │   ├── events.py
│   │   ├── dashboard.py
│   │   └── admin.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── documents.py
│   ├── migrations/
│   ├── scripts/seed.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── dlp.py
│   │   └── alerts.py
│   └── Dockerfile
├── frontend/
│   └── (React app — scaffold with Vite)
├── extension/
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   └── popup/
├── docker-compose.yml
└── README.md
```

Use full `docker-compose.yml` from [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md).

**requirements.txt (MongoDB stack):**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
motor==3.4.0
beanie==1.26.0
redis==5.0.4
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
httpx==0.27.0
pydantic==2.7.1
pydantic-settings==2.2.1
python-multipart==0.0.9
websockets==12.0
```

**Completion check:** `curl http://localhost:8000/health` returns `{"status": "ok"}`

---

### Day 2: Auth System

**Build:**
- `POST /api/auth/signup` — create account (email, password, name, org_name)
- `POST /api/auth/login` — returns JWT access token
- `GET /api/auth/me` — returns current user info
- JWT middleware for protected routes

**Key details:**
- On signup: create User + Organization + default admin role in one transaction
- Generate `org_api_key` (prefix: `aisnl_org_`) for extension auth
- Generate `proxy_api_key` (prefix: `aisnl_prx_`) for developer API proxy auth

---

### Day 3: User & Team Management

**Build:**
- `POST /api/users/invite` — admin sends email invite (creates pending user)
- `POST /api/users/accept-invite` — invited user sets password
- `GET /api/users` — list all users in org (admin only)
- `DELETE /api/users/{id}` — remove user from org

---

### Day 4: Event Ingestion

**Build:**
- `POST /api/events` — ingest a captured prompt event (from extension or proxy)
- `GET /api/events` — list events with filters (user, platform, date, severity)
- `GET /api/events/{id}` — get single event detail

**Event ingestion endpoint should:**
1. Authenticate via `org_api_key` header
2. Run DLP scanner on `prompt_text`
3. Store event with scan results
4. Return `event_id` immediately (async DLP if > 500ms)

---

### Day 5: DLP Scanner Service

**Build `services/dlp.py`:**

```python
import re
import spacy
from dataclasses import dataclass

# Load spaCy model (run: python -m spacy download en_core_web_sm)
nlp = spacy.load("en_core_web_sm")

PATTERNS = {
    "API_KEY": [
        (r"sk-[a-zA-Z0-9]{20,}", "CRITICAL"),
        (r"ghp_[a-zA-Z0-9]{36}", "CRITICAL"),
        (r"AKIA[0-9A-Z]{16}", "CRITICAL"),
        (r"AIza[0-9A-Za-z-_]{35}", "CRITICAL"),
        (r"anthropic-[a-zA-Z0-9]{40,}", "CRITICAL"),
    ],
    "EMAIL": [
        (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "MEDIUM"),
    ],
    "PHONE_IN": [
        (r"(\+91|0)[6-9]\d{9}", "MEDIUM"),
    ],
    "PHONE_US": [
        (r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", "LOW"),
    ],
    "CREDIT_CARD": [
        (r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b", "CRITICAL"),
    ],
    "AADHAAR": [
        (r"\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b", "CRITICAL"),
    ],
    "PAN_INDIA": [
        (r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", "HIGH"),
    ],
    "IP_ADDRESS": [
        (r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b", "LOW"),
    ],
    "JWT_TOKEN": [
        (r"eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+", "CRITICAL"),
    ],
}

SEVERITY_SCORE = {"LOW": 10, "MEDIUM": 30, "HIGH": 60, "CRITICAL": 90}

def scan(text: str, custom_patterns: list = None) -> dict:
    findings = []
    
    # Regex scan
    for category, pattern_list in PATTERNS.items():
        for pattern, severity in pattern_list:
            for match in re.finditer(pattern, text):
                findings.append({
                    "type": category,
                    "severity": severity,
                    "offset": match.start(),
                    "matched_length": len(match.group()),
                })
    
    # Custom org patterns
    if custom_patterns:
        for cp in custom_patterns:
            for match in re.finditer(cp["pattern"], text, re.IGNORECASE):
                findings.append({
                    "type": "CUSTOM_" + cp["name"].upper(),
                    "severity": cp.get("severity", "MEDIUM"),
                    "offset": match.start(),
                    "matched_length": len(match.group()),
                })
    
    # NER scan (names, orgs)
    doc = nlp(text[:5000])  # limit for perf
    for ent in doc.ents:
        if ent.label_ in ("PERSON", "ORG", "GPE"):
            findings.append({
                "type": f"NER_{ent.label_}",
                "severity": "LOW",
                "offset": ent.start_char,
                "matched_length": len(ent.text),
            })
    
    risk_score = min(100, sum(SEVERITY_SCORE.get(f["severity"], 0) for f in findings))
    categories = list(set(f["type"] for f in findings))
    
    return {
        "risk_score": risk_score,
        "findings": findings,
        "categories": categories,
        "has_critical": any(f["severity"] == "CRITICAL" for f in findings),
    }
```

---

### Day 6–7: API Proxy

**Build `api/proxy.py`:**
- Endpoint: `POST /proxy/{provider}/v1/chat/completions`
- Providers: `openai`, `anthropic`
- Auth: AISentinel proxy key in Authorization header
- Forward request to real provider, stream response back
- Log request + response metadata (NOT full response in MVP — too large)
- Run DLP on request content

**Key implementation note:**
Use `httpx.AsyncClient` with streaming support:
```python
async with httpx.AsyncClient() as client:
    async with client.stream("POST", provider_url, ...) as response:
        async for chunk in response.aiter_bytes():
            yield chunk
```

---

## Week 2 — Chrome Extension + Dashboard

### Day 8–9: Chrome Extension

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "AISentinel",
  "version": "0.1.0",
  "description": "AI usage monitoring for your team",
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://copilot.microsoft.com/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon48.png"
  }
}
```

**content.js — Core interception logic:**
```javascript
// Configuration (injected from popup settings)
let ORG_TOKEN = null;
let USER_TOKEN = null;
const API_BASE = 'https://api.aisentinel.io'; // or localhost:8000

// Load tokens from storage
chrome.storage.sync.get(['orgToken', 'userToken'], (data) => {
  ORG_TOKEN = data.orgToken;
  USER_TOKEN = data.userToken;
});

// Detect platform
const PLATFORM_MAP = {
  'chat.openai.com': 'chatgpt',
  'chatgpt.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
};
const platform = PLATFORM_MAP[window.location.hostname] || 'unknown';

// Track last sent text to avoid duplicate events
let lastSentText = '';

// Submit button click interception
function interceptSubmit(promptText) {
  if (!ORG_TOKEN || !USER_TOKEN) return;
  if (!promptText || promptText.trim() === '' || promptText === lastSentText) return;
  lastSentText = promptText.trim();

  const event = {
    org_token: ORG_TOKEN,
    user_token: USER_TOKEN,
    platform: platform,
    prompt_text: promptText.trim(),
    prompt_length: promptText.length,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
    session_id: getOrCreateSessionId(),
  };

  // Fire and forget — don't block UX
  fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Token': ORG_TOKEN },
    body: JSON.stringify(event),
  }).catch(() => {}); // Silently fail
}

// Watch for Enter keypress on textarea / input elements
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target;
    if (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable')) {
      interceptSubmit(target.value || target.innerText);
    }
  }
}, true);

// Also watch for button clicks (submit button)
const observer = new MutationObserver(() => {
  const buttons = document.querySelectorAll('button[data-testid*="send"], button[aria-label*="Send"]');
  buttons.forEach(btn => {
    if (!btn._aisentinel_hooked) {
      btn._aisentinel_hooked = true;
      btn.addEventListener('click', () => {
        const textarea = document.querySelector('textarea, [contenteditable="true"]');
        if (textarea) interceptSubmit(textarea.value || textarea.innerText);
      });
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });

function getOrCreateSessionId() {
  let id = sessionStorage.getItem('_aisentinel_session');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2);
    sessionStorage.setItem('_aisentinel_session', id);
  }
  return id;
}
```

**popup/popup.html + popup.js:**
- Input fields for `Org Token` and `User Token`
- Save button (stores to `chrome.storage.sync`)
- Status indicator: "Connected" / "Not configured"
- Today's stats: prompts sent, alerts triggered

---

### Day 10–12: React Dashboard

**Setup:**
```bash
cd frontend
npm create vite@latest . -- --template react
npm install react-router-dom axios recharts lucide-react tailwindcss
npx tailwindcss init -p
```

**Pages to build:**

#### Dashboard.jsx (Main Page)
Components:
- Summary cards: Total prompts today, Active users, Alerts, AI tools used
- Line chart: Prompts over time (last 7 days) — use Recharts
- Bar chart: Usage by AI platform (ChatGPT vs Claude vs Gemini)
- Table: Top 5 users by prompt volume
- Recent alerts panel (last 5 critical events)

#### Events.jsx (Event Log)
- Table with columns: Time | User | Platform | Prompt preview | Risk score | Status
- Filters: Date range, User, Platform, Min risk score
- Click row to expand full prompt (with PII highlighted/redacted)
- Pagination

#### Alerts.jsx (DLP Alerts)
- Alert list filtered to risk_score > 50
- Severity badges (CRITICAL = red, HIGH = orange, MEDIUM = yellow)
- Mark as reviewed button

#### Users.jsx (Team Management)
- List of users with: Name | Email | Status | Last active | Prompts sent today
- "Invite User" button → opens modal with email input
- Remove user option

#### Settings.jsx
- Org name, API keys display (copy button)
- Custom DLP patterns (add/remove)
- Notification email settings

---

### Day 13–14: Integration + Real-time

**WebSocket for live updates:**
```python
# backend/api/events.py
@router.websocket("/ws/events/{org_id}")
async def events_websocket(websocket: WebSocket, org_id: str):
    await manager.connect(websocket, org_id)
    try:
        while True:
            await asyncio.sleep(1)  # Keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id)
```

**Frontend WebSocket hook:**
```javascript
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:8000/ws/events/${orgId}`);
  ws.onmessage = (msg) => {
    const event = JSON.parse(msg.data);
    setEvents(prev => [event, ...prev].slice(0, 100));
    if (event.risk_score > 50) setAlertCount(c => c + 1);
  };
  return () => ws.close();
}, [orgId]);
```

---

## Week 3 — Polish, Testing, Deploy

### Day 15–16: Error Handling + Edge Cases
- Rate limiting on event ingestion (max 10 events/second per org)
- Extension graceful failure when backend is unreachable
- Database connection pooling
- Proper HTTP error responses (400/401/403/404/500)

### Day 17–18: Email Notifications
- Welcome email on signup
- Daily digest email to admin (prompts count, alerts count)
- Real-time alert email for CRITICAL DLP findings
- Use SMTP (Gmail or SendGrid)

### Day 19–20: End-to-End Testing
**Manual test checklist:**
```
□ Signup flow (create org + admin account)
□ Invite employee (email delivery works)
□ Employee accepts invite + sets password
□ Employee installs Chrome extension
□ Employee configures extension with tokens
□ Employee types prompt in ChatGPT
□ Event appears in admin dashboard within 5 seconds
□ DLP: paste an API key in ChatGPT → CRITICAL alert fires
□ DLP: paste an email address → MEDIUM alert fires
□ Events page: filter by user works
□ Proxy: change OpenAI base_url → event appears
□ Mobile: dashboard readable on phone
```

### Day 20: Admin Verify Dashboard

Build `/admin/verify` per [`19_ADMIN_VERIFY_DASHBOARD.md`](19_ADMIN_VERIFY_DASHBOARD.md).  
**Gate:** Admin completes verify checklist in &lt; 3 minutes after `docker compose up`.

### Day 21: Deployment

**Deploy via Docker Compose on staging VPS** (see [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md)):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Chrome extension — for testing:**
- Load unpacked in Chrome (chrome://extensions → Developer mode → Load unpacked)
- For production: submit to Chrome Web Store

**Environment variables needed:**
```env
MONGODB_URL=mongodb://mongo:27017/aisentinel
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<strong-random-string>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=<app-password>
FRONTEND_URL=https://your-app.vercel.app
```

---

## Acceptance Criteria (MVP Done When:)

1. ✅ Admin signs up and gets a working dashboard in < 5 minutes
2. ✅ Chrome extension captures prompts from ChatGPT and Claude
3. ✅ DLP detects API keys and emails in prompts
4. ✅ Alerts appear in dashboard within 5 seconds of prompt submission
5. ✅ API proxy works as drop-in for OpenAI SDK
6. ✅ Admin can invite employees via email
7. ✅ System handles 100 concurrent events without crashing
8. ✅ All pages load in < 2 seconds
