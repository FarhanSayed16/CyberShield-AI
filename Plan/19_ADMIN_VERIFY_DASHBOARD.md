# 19 — Admin Verify Dashboard

## Executive summary

The **Admin Verify** page (`/admin/verify`) lets an org admin confirm the full AISentinel pipeline—API, MongoDB, Redis, ingest, DLP, and extension tokens—in under **3 minutes** after `docker compose up`, without reading server logs.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Admin-only UI + 3 verify APIs | Employee-facing onboarding wizard |
| Synthetic ingest + DLP smoke tests | Load/stress testing |
| Live event tail (poll or WS) | Production monitoring (Grafana — Phase 2) |

---

## Route and access

| Item | Value |
|------|-------|
| Frontend route | `/admin/verify` |
| Component | `AdminVerify.jsx` |
| Roles allowed | `admin` only |
| Nav label | "Verify Setup" (under Settings group or top-level for admins) |

Non-admin → redirect to `/` with toast "Admin access required".

---

## UI panels

### 1. System health

Cards for each dependency:

| Service | Check | Green criteria |
|---------|-------|----------------|
| API | `GET /health` | 200, &lt; 500ms |
| MongoDB | via detailed health | `mongo.ok === true` |
| Redis | via detailed health | `redis.ok === true` |
| Ingest | `POST /api/admin/verify/ingest-test` | 201, `risk_score > 0` |

Display latency in ms per card.

### 2. Auth check

Show decoded JWT claims (from `GET /api/auth/me`):
- `user.id`, `email`, `role`, `org.id`, `org.name`

### 3. Synthetic ingest test

Button: **"Send test prompt"**

Calls `POST /api/admin/verify/ingest-test` which:
1. Inserts event with prompt containing fake OpenAI key `sk-test1234567890abcdef0123456789`
2. Runs DLP
3. Returns `{ event_id, risk_score, alert_id?, findings[] }`

UI shows pass/fail badge.

### 4. Live tail

Table: last 10 events for org, refresh every 5s (or WebSocket if implemented).

Columns: Time | User | Platform | Risk | Status

### 5. Extension handshake

Display (read-only, copy buttons):
- `org_api_key` from org settings / signup response
- Current user's `user_token`
- Instructions: Chrome → Extensions → AISentinel → paste tokens

Optional: QR encoding `aisentinel://configure?org=...&user=...` (Phase 2).

### 6. DLP rule smoke tests

Table from `GET /api/admin/verify/dlp-fixtures`:

| Fixture name | Input preview | Expected severity | Actual | Pass |
|--------------|---------------|-------------------|--------|------|
| email | `contact me at test@acme.com` | MEDIUM | — | — |
| openai_key | `sk-test...` | CRITICAL | — | — |
| phone_in | `+91-9876543210` | MEDIUM | — | — |
| ssn_us | `123-45-6789` | HIGH | — | — |
| clean | `What is the weather?` | NONE | — | — |

Button **"Run all DLP tests"** calls scan endpoint per fixture (client-side or batch API).

---

## API contracts

### `GET /api/admin/health/detailed`

**Auth:** JWT, role `admin`

**Response `200`:**
```json
{
  "api": { "ok": true, "latency_ms": 2 },
  "mongo": { "ok": true, "latency_ms": 8, "collections": 10 },
  "redis": { "ok": true, "latency_ms": 1 },
  "version": "0.1.0",
  "environment": "development"
}
```

**Errors:** `503` if any dependency down

---

### `POST /api/admin/verify/ingest-test`

**Auth:** JWT admin

**Request:** (empty body or optional `platform`)

**Response `201`:**
```json
{
  "event_id": "674a1b2c3d4e5f6789012345",
  "risk_score": 95,
  "has_critical": true,
  "findings": [{ "type": "API_KEY", "severity": "CRITICAL" }],
  "alert_id": "674a1b2c3d4e5f6789012346"
}
```

---

### `GET /api/admin/verify/dlp-fixtures`

**Auth:** JWT admin

**Response `200`:**
```json
{
  "fixtures": [
    {
      "id": "email",
      "prompt": "My email is leak@company.com",
      "expected_severity": "MEDIUM",
      "expected_types": ["EMAIL"]
    }
  ]
}
```

---

## Wireframe (ASCII)

```
┌─────────────────────────────────────────────────────────┐
│ Verify Setup                                    [Refresh]│
├──────────┬──────────┬──────────┬──────────────────────┤
│ API ✓    │ Mongo ✓  │ Redis ✓  │ Ingest [Run Test]    │
├─────────────────────────────────────────────────────────┤
│ Logged in: admin@demo.com · Demo Corp · role: admin     │
├─────────────────────────────────────────────────────────┤
│ Extension tokens          [Copy Org] [Copy User]        │
│ org: aisnl_org_demo123    user: aisnl_usr_admin123      │
├─────────────────────────────────────────────────────────┤
│ DLP smoke tests                    [Run All]            │
│ email      MEDIUM    ✓                                  │
│ openai_key CRITICAL  ✓                                  │
├─────────────────────────────────────────────────────────┤
│ Recent events (live)                                    │
│ 10:32  admin  chatgpt  95  flagged                      │
└─────────────────────────────────────────────────────────┘
```

---

## Acceptance criteria

- [ ] Admin opens `/admin/verify` within 3 min of `docker compose up`
- [ ] All health cards green after seed
- [ ] Synthetic ingest creates event visible in live tail
- [ ] All 5 DLP fixtures pass expected severity
- [ ] Non-admin receives 403 on verify APIs

---

## Agent instructions

- **Gate 4** in `17_IMPLEMENTATION_SEQUENCE.md` requires this page before Dashboard polish.
- Implement backend verify routes in `api/admin.py` before frontend.
- See [`07_FRONTEND_SPEC.md`](07_FRONTEND_SPEC.md) for `AdminVerify.jsx` props.

---

## Cross-links

- [`06_API_SPEC.md`](06_API_SPEC.md) — full API listing
- [`14_RISK_DETECTION_ENGINE.md`](14_RISK_DETECTION_ENGINE.md) — fixture expectations
- [`17_IMPLEMENTATION_SEQUENCE.md`](17_IMPLEMENTATION_SEQUENCE.md) — Gate 4
