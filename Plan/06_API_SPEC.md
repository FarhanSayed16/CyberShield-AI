# 06 — API Specification

> **IDs:** MongoDB ObjectIds returned as 24-char hex strings in JSON (`"id": "674a1b2c..."`), not UUIDs. See [`05b_MONGODB_SCHEMA.md`](05b_MONGODB_SCHEMA.md).

## Base URL
- **Development:** `http://localhost:8000`
- **Production:** `https://api.aisentinel.io`

## Authentication

All protected endpoints require a JWT Bearer token:
```
Authorization: Bearer <access_token>
```

Event ingestion endpoints use an org API key:
```
X-Org-Token: aisnl_org_<key>
```

API proxy endpoints use an AISentinel proxy key:
```
Authorization: Bearer aisnl_prx_<key>
```

---

## Endpoints

---

### AUTH

#### `POST /api/auth/signup`
Create a new account and organization.

**Request:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@acmecorp.in",
  "password": "SecurePass123!",
  "org_name": "Acme Corp"
}
```

**Response `201`:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Rahul Sharma",
    "email": "rahul@acmecorp.in",
    "role": "admin"
  },
  "org": {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acmecorp",
    "org_api_key": "aisnl_org_abc123xyz",
    "plan": "free"
  },
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `400` — email already registered
- `422` — validation error (password too weak, etc.)

---

#### `POST /api/auth/login`
Login with email + password.

**Request:**
```json
{
  "email": "rahul@acmecorp.in",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "name": "Rahul Sharma",
    "email": "rahul@acmecorp.in",
    "role": "admin",
    "org_id": "uuid"
  }
}
```

**Errors:**
- `401` — invalid credentials
- `403` — account suspended

---

#### `GET /api/auth/me`
Returns current authenticated user.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Rahul Sharma",
  "email": "rahul@acmecorp.in",
  "role": "admin",
  "org_id": "uuid",
  "org_name": "Acme Corp",
  "user_token": "aisnl_usr_xyz789",
  "status": "active"
}
```

---

#### `POST /api/auth/accept-invite`
Accept an invite and set password.

**Request:**
```json
{
  "token": "<invite_token_from_email>",
  "name": "Priya Singh",
  "password": "MyPassword123!"
}
```

**Response `200`:** Same as login response.

---

### ORGANIZATIONS

#### `GET /api/org`
Get current org details.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acmecorp",
  "plan": "free",
  "org_api_key": "aisnl_org_abc123",
  "settings": {
    "alert_email": "cto@acmecorp.in",
    "daily_digest": true,
    "retention_days": 90
  },
  "stats": {
    "total_users": 12,
    "prompts_today": 347,
    "alerts_open": 5
  }
}
```

---

#### `PATCH /api/org`
Update org settings. Admin only.

**Request:**
```json
{
  "name": "Acme Corp India",
  "settings": {
    "alert_email": "security@acmecorp.in",
    "daily_digest": false,
    "notify_on_critical": true
  }
}
```

**Response `200`:** Updated org object.

---

#### `POST /api/org/regenerate-key`
Regenerate the org API key. Admin only.

**Response `200`:**
```json
{
  "org_api_key": "aisnl_org_newkey456"
}
```

---

### USERS

#### `GET /api/users`
List all users in org. Admin/Manager only.

**Query params:**
- `status` — `active` | `pending` | `suspended`
- `role` — `admin` | `manager` | `employee`

**Response `200`:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Priya Singh",
      "email": "priya@acmecorp.in",
      "role": "employee",
      "status": "active",
      "user_token": "aisnl_usr_priya",
      "last_active_at": "2026-05-21T14:30:00Z",
      "stats": {
        "prompts_today": 23,
        "alerts_today": 1
      }
    }
  ],
  "total": 12
}
```

---

#### `POST /api/users/invite`
Invite a new user. Admin only.

**Request:**
```json
{
  "email": "dev@acmecorp.in",
  "name": "New Dev",
  "role": "employee"
}
```

**Response `201`:**
```json
{
  "message": "Invite sent to dev@acmecorp.in",
  "invite_id": "uuid",
  "expires_at": "2026-05-28T00:00:00Z"
}
```

---

#### `PATCH /api/users/{user_id}`
Update user role or status. Admin only.

**Request:**
```json
{
  "role": "manager",
  "status": "suspended"
}
```

**Response `200`:** Updated user object.

---

#### `DELETE /api/users/{user_id}`
Remove user from org. Admin only.

**Response `204`:** No content.

---

### EVENTS

#### `POST /api/events`
**Ingest a new event.** Called by Chrome Extension.

**Auth:** `X-Org-Token: aisnl_org_<key>`

**Request:**
```json
{
  "user_token": "aisnl_usr_xyz789",
  "platform": "chatgpt",
  "source": "extension",
  "prompt_text": "Help me fix this Python function that processes our customer database: ...",
  "prompt_length": 512,
  "page_url": "https://chat.openai.com/c/abc123",
  "session_id": "sess_abc123",
  "captured_at": "2026-05-21T10:30:00Z"
}
```

**Response `201`:**
```json
{
  "event_id": "uuid",
  "status": "flagged",
  "risk_score": 30,
  "findings_count": 1,
  "has_critical": false
}
```

**Notes:**
- Rate limited: 600 events/minute per org (Redis counter)
- DLP scan is synchronous for MVP (< 100ms for typical prompts)
- Returns immediately with scan results

---

#### `GET /api/events`
List events with filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Results per page (default: 50, max: 200) |
| `user_id` | UUID | Filter by specific user |
| `platform` | string | chatgpt \| claude \| gemini \| openai_api |
| `status` | string | clean \| flagged \| reviewed |
| `min_risk` | int | Minimum risk score (0–100) |
| `has_critical` | bool | Only critical findings |
| `from_date` | ISO datetime | Start of date range |
| `to_date` | ISO datetime | End of date range |
| `search` | string | Search prompt text (basic ILIKE) |

**Response `200`:**
```json
{
  "events": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "Priya Singh", "email": "priya@acmecorp.in" },
      "platform": "chatgpt",
      "source": "extension",
      "prompt_preview": "Help me fix this Python function that processes our customer...",
      "prompt_length": 512,
      "risk_score": 30,
      "dlp_categories": ["NER_ORG"],
      "has_critical": false,
      "status": "clean",
      "captured_at": "2026-05-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 1247,
    "pages": 25
  }
}
```

**Notes:**
- `prompt_preview` is first 120 chars only (full text only in GET /events/{id})
- Employees can only see their own events
- Admins see all events

---

#### `GET /api/events/{event_id}`
Get full event detail.

**Response `200`:**
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "name": "Priya Singh" },
  "platform": "chatgpt",
  "source": "extension",
  "prompt_text": "Help me fix this Python function that processes our customer database...",
  "prompt_length": 512,
  "model_used": null,
  "risk_score": 30,
  "status": "clean",
  "captured_at": "2026-05-21T10:30:00Z",
  "findings": [
    {
      "finding_type": "NER_ORG",
      "severity": "LOW",
      "offset_start": 75,
      "matched_length": 8,
      "redacted_value": "c*** d***"
    }
  ],
  "dlp_categories": ["NER_ORG"]
}
```

---

#### `PATCH /api/events/{event_id}/status`
Update event status (mark as reviewed, false positive, etc.)

**Request:**
```json
{
  "status": "reviewed"
}
```

**Response `200`:** Updated event object.

---

### ALERTS

#### `GET /api/alerts`
List alerts.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | open \| acknowledged \| resolved |
| `severity` | string | LOW \| MEDIUM \| HIGH \| CRITICAL |
| `from_date` | datetime | Start range |
| `to_date` | datetime | End range |
| `page` | int | Pagination |

**Response `200`:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "alert_type": "DLP_CRITICAL",
      "severity": "CRITICAL",
      "title": "API Key detected in ChatGPT prompt",
      "description": "User Priya Singh sent a prompt containing what appears to be an API key (sk-****) to ChatGPT.",
      "user": { "id": "uuid", "name": "Priya Singh" },
      "event_id": "uuid",
      "status": "open",
      "created_at": "2026-05-21T10:30:00Z"
    }
  ],
  "counts": {
    "open": 5,
    "critical_open": 2
  }
}
```

---

#### `PATCH /api/alerts/{alert_id}`
Acknowledge or resolve an alert.

**Request:**
```json
{
  "status": "acknowledged",
  "note": "Discussed with employee, was a test key"
}
```

**Response `200`:** Updated alert object.

---

### DASHBOARD / ANALYTICS

#### `GET /api/dashboard/summary`
Overview stats for admin dashboard.

**Query params:**
- `period` — `today` | `7d` | `30d` (default: `7d`)

**Response `200`:**
```json
{
  "period": "7d",
  "totals": {
    "prompts": 2347,
    "flagged": 89,
    "critical_alerts": 5,
    "active_users": 18,
    "unique_platforms": 3
  },
  "change_vs_prev_period": {
    "prompts_pct": 12.5,
    "flagged_pct": -3.2
  }
}
```

---

#### `GET /api/dashboard/usage-over-time`
Time series data for charts.

**Query params:**
- `period` — `7d` | `30d` | `90d`
- `granularity` — `hour` | `day` (default: `day`)
- `user_id` — optional filter

**Response `200`:**
```json
{
  "series": [
    {
      "date": "2026-05-15",
      "prompts": 234,
      "flagged": 12,
      "critical": 1
    },
    {
      "date": "2026-05-16",
      "prompts": 198,
      "flagged": 8,
      "critical": 0
    }
  ]
}
```

---

#### `GET /api/dashboard/platform-breakdown`
Usage by AI platform.

**Response `200`:**
```json
{
  "platforms": [
    { "platform": "chatgpt", "prompts": 1456, "pct": 62.0 },
    { "platform": "claude", "prompts": 567, "pct": 24.2 },
    { "platform": "gemini", "prompts": 198, "pct": 8.4 },
    { "platform": "openai_api", "prompts": 126, "pct": 5.4 }
  ]
}
```

---

#### `GET /api/dashboard/top-users`
Top users by prompt volume.

**Query params:**
- `period` — `today` | `7d` | `30d`
- `limit` — default 10, max 50
- `sort_by` — `prompts` | `flagged` | `risk_score`

**Response `200`:**
```json
{
  "users": [
    {
      "user": { "id": "uuid", "name": "Dev A", "email": "deva@company.com" },
      "prompts": 456,
      "flagged": 23,
      "critical": 2,
      "avg_risk_score": 18.5
    }
  ]
}
```

---

#### `GET /api/dashboard/dlp-breakdown`
DLP findings by type.

**Response `200`:**
```json
{
  "findings": [
    { "type": "EMAIL", "count": 45, "severity": "MEDIUM" },
    { "type": "API_KEY", "count": 8, "severity": "CRITICAL" },
    { "type": "NER_PERSON", "count": 123, "severity": "LOW" }
  ]
}
```

---

### DLP CUSTOM PATTERNS

#### `GET /api/dlp/patterns`
List org's custom DLP patterns.

**Response `200`:**
```json
{
  "patterns": [
    {
      "id": "uuid",
      "name": "Internal Project Code",
      "pattern": "PROJ-[A-Z]{2}\\d{4}",
      "severity": "HIGH",
      "is_active": true
    }
  ]
}
```

---

#### `POST /api/dlp/patterns`
Add a custom DLP pattern. Admin only.

**Request:**
```json
{
  "name": "Internal Project Code",
  "pattern": "PROJ-[A-Z]{2}\\d{4}",
  "severity": "HIGH",
  "description": "Detects internal project identifiers"
}
```

**Response `201`:** Created pattern object.

---

#### `DELETE /api/dlp/patterns/{pattern_id}`
Delete a custom pattern. Admin only.

**Response `204`.**

---

### LLM PROXY

#### `POST /proxy/{provider}/v1/chat/completions`
Drop-in proxy for LLM API calls.

**Providers:** `openai`, `anthropic`

**Auth:** `Authorization: Bearer aisnl_prx_<proxy_key>`

**Request:** Identical to real OpenAI/Anthropic API format.

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Summarize this document: ..." }
  ],
  "stream": true
}
```

**Response:** Identical to real provider response (proxied through).

**What happens behind the scenes:**
1. Auth validated
2. DLP scan on all message content
3. Event logged to database
4. Request forwarded to real provider with real API key
5. Response streamed back to caller
6. Token counts logged after response completes

**Custom headers returned:**
```
X-AISentinel-Event-ID: <event_uuid>
X-AISentinel-Risk-Score: 0
X-AISentinel-Scan-Time: 12ms
```

---

### ADMIN VERIFY (admin role only)

See [`19_ADMIN_VERIFY_DASHBOARD.md`](19_ADMIN_VERIFY_DASHBOARD.md).

#### `GET /api/admin/health/detailed`
Detailed dependency health for Admin Verify page.

**Response `200`:**
```json
{
  "api": { "ok": true, "latency_ms": 2 },
  "mongo": { "ok": true, "latency_ms": 8 },
  "redis": { "ok": true, "latency_ms": 1 },
  "version": "0.1.0"
}
```

**Response `503`:** One or more dependencies unhealthy.

---

#### `POST /api/admin/verify/ingest-test`
Runs synthetic event with fake API key through full ingest + DLP pipeline.

**Response `201`:** `{ "event_id", "risk_score", "has_critical", "findings", "alert_id" }`

---

#### `GET /api/admin/verify/dlp-fixtures`
Returns canned prompts + expected severities for UI smoke tests.

**Response `200`:** `{ "fixtures": [{ "id", "prompt", "expected_severity", "expected_types" }] }`

---

### HEALTH

#### `GET /health`
Health check.

**Response `200`:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "db": "connected",
  "redis": "connected",
  "timestamp": "2026-05-21T10:30:00Z"
}
```

---

## Error Response Format

All errors follow this shape:
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect.",
    "details": null
  }
}
```

**Common error codes:**
| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 422 | Request body invalid |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /api/events` | 600/minute per org |
| `POST /api/auth/login` | 10/minute per IP |
| `POST /api/auth/signup` | 5/minute per IP |
| `POST /proxy/*` | 1000/minute per org |
| All other endpoints | 120/minute per user |

---

## OpenAPI Docs
Auto-generated at: `http://localhost:8000/docs` (Swagger UI)  
ReDoc at: `http://localhost:8000/redoc`
