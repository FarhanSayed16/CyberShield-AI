# 05 — Database Schema

> **ARCHIVED — PostgreSQL reference only.**  
> The MVP uses **MongoDB 7**. Implement against [`05b_MONGODB_SCHEMA.md`](05b_MONGODB_SCHEMA.md).  
> This file is kept for historical relational design and field-name alignment.

---

## Overview

**Primary DB (archived):** PostgreSQL 15  
**Cache / Sessions:** Redis 7  
**ORM:** SQLAlchemy 2.0 (async)  
**Migrations:** Alembic  

---

## Entity Relationship Diagram (Text)

```
organizations
    │
    ├─── users (many)
    │       │
    │       └─── events (many)
    │               │
    │               └─── dlp_findings (many)
    │
    ├─── api_keys (many)
    ├─── dlp_custom_patterns (many)
    └─── alert_rules (many)

alerts
    └─── linked to events (one-to-one or one-to-many)

invite_tokens
    └─── linked to organizations + pending email
```

---

## Tables

### `organizations`

```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,       -- e.g. "acmecorp"
    org_api_key     VARCHAR(64) UNIQUE NOT NULL,        -- prefix: aisnl_org_
    plan            VARCHAR(50) DEFAULT 'free',         -- free | starter | growth | enterprise
    settings        JSONB DEFAULT '{}',                 -- org-level config
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_api_key ON organizations(org_api_key);
```

**`settings` JSONB keys:**
```json
{
  "alert_email": "cto@company.com",
  "daily_digest": true,
  "retention_days": 90,
  "dlp_sensitivity": "medium",
  "notify_on_critical": true
}
```

---

### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(320) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255),                       -- null for pending invites
    role            VARCHAR(50) DEFAULT 'employee',     -- admin | manager | employee
    user_token      VARCHAR(64) UNIQUE NOT NULL,        -- prefix: aisnl_usr_ (for extension)
    status          VARCHAR(50) DEFAULT 'pending',      -- pending | active | suspended
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, email)
);

CREATE INDEX idx_user_org ON users(org_id);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_token ON users(user_token);
```

---

### `invite_tokens`

```sql
CREATE TABLE invite_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       VARCHAR(320) NOT NULL,
    token       VARCHAR(128) UNIQUE NOT NULL,
    invited_by  UUID REFERENCES users(id),
    role        VARCHAR(50) DEFAULT 'employee',
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_token ON invite_tokens(token);
CREATE INDEX idx_invite_org ON invite_tokens(org_id);
```

---

### `api_keys`

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,               -- "Production API Key"
    key_prefix      VARCHAR(20) NOT NULL,                -- first 8 chars, for display
    hashed_key      VARCHAR(255) NOT NULL,               -- bcrypt hash
    key_type        VARCHAR(50) NOT NULL,                -- proxy | extension | admin
    provider        VARCHAR(50),                         -- openai | anthropic | null
    encrypted_provider_key TEXT,                        -- encrypted real API key
    is_active       BOOLEAN DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_apikey_org ON api_keys(org_id);
CREATE INDEX idx_apikey_prefix ON api_keys(key_prefix);
```

---

### `events`

This is the core table — every AI interaction captured.

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Source metadata
    source          VARCHAR(50) NOT NULL,               -- extension | proxy | api
    platform        VARCHAR(100) NOT NULL,              -- chatgpt | claude | gemini | openai_api | anthropic_api
    page_url        TEXT,                               -- for extension events

    -- Prompt data
    prompt_text     TEXT NOT NULL,
    prompt_length   INTEGER NOT NULL,
    prompt_tokens   INTEGER,                            -- for API proxy events
    session_id      VARCHAR(128),

    -- Response data (optional, proxy only)
    response_text   TEXT,
    response_tokens INTEGER,
    model_used      VARCHAR(100),

    -- DLP results
    risk_score      INTEGER DEFAULT 0,                  -- 0–100
    dlp_categories  TEXT[],                             -- array of category names
    has_critical    BOOLEAN DEFAULT FALSE,
    scan_version    VARCHAR(20) DEFAULT '1.0',

    -- Status
    status          VARCHAR(50) DEFAULT 'clean',        -- clean | flagged | reviewed | blocked

    -- Timing
    captured_at     TIMESTAMPTZ NOT NULL,               -- when the prompt was sent
    processed_at    TIMESTAMPTZ DEFAULT NOW(),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_event_org_time ON events(org_id, captured_at DESC);
CREATE INDEX idx_event_user ON events(user_id);
CREATE INDEX idx_event_platform ON events(platform);
CREATE INDEX idx_event_risk ON events(org_id, risk_score DESC);
CREATE INDEX idx_event_critical ON events(org_id, has_critical) WHERE has_critical = TRUE;
CREATE INDEX idx_event_status ON events(status);

-- Partition by month for scale (optional for MVP, add in Phase 2)
-- PARTITION BY RANGE (captured_at)
```

**Notes:**
- `prompt_text` should be encrypted at column level in production
- For MVP: store plaintext, add encryption in Week 3
- Keep `response_text` nullable — not captured for browser extension (we only see prompt, not response, in MVP)

---

### `dlp_findings`

```sql
CREATE TABLE dlp_findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL,

    finding_type    VARCHAR(100) NOT NULL,              -- API_KEY | EMAIL | PHONE_IN | CREDIT_CARD | etc.
    severity        VARCHAR(20) NOT NULL,               -- LOW | MEDIUM | HIGH | CRITICAL
    offset_start    INTEGER,                            -- character position in prompt
    matched_length  INTEGER,
    redacted_value  VARCHAR(255),                       -- e.g. "sk-****" or "j***@c***.com"

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finding_event ON dlp_findings(event_id);
CREATE INDEX idx_finding_org_type ON dlp_findings(org_id, finding_type);
CREATE INDEX idx_finding_severity ON dlp_findings(org_id, severity);
```

---

### `dlp_custom_patterns`

```sql
CREATE TABLE dlp_custom_patterns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    pattern     TEXT NOT NULL,                          -- regex pattern
    severity    VARCHAR(20) DEFAULT 'MEDIUM',
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_pattern_org ON dlp_custom_patterns(org_id) WHERE is_active = TRUE;
```

---

### `alerts`

```sql
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,

    alert_type      VARCHAR(100) NOT NULL,              -- DLP_CRITICAL | DLP_HIGH | SHADOW_AI | etc.
    severity        VARCHAR(20) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,

    status          VARCHAR(50) DEFAULT 'open',         -- open | acknowledged | resolved | false_positive
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,

    notified_email  BOOLEAN DEFAULT FALSE,
    notified_slack  BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_org_status ON alerts(org_id, status);
CREATE INDEX idx_alert_org_time ON alerts(org_id, created_at DESC);
CREATE INDEX idx_alert_severity ON alerts(org_id, severity);
```

---

### `daily_stats` (Materialized / Pre-aggregated)

```sql
CREATE TABLE daily_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    stat_date       DATE NOT NULL,

    -- Counters
    prompt_count    INTEGER DEFAULT 0,
    flagged_count   INTEGER DEFAULT 0,
    critical_count  INTEGER DEFAULT 0,
    total_tokens    INTEGER DEFAULT 0,

    -- Platform breakdown (JSONB)
    platform_counts JSONB DEFAULT '{}',
    -- e.g. {"chatgpt": 45, "claude": 12, "gemini": 3}

    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, user_id, stat_date)
);

CREATE INDEX idx_dailystats_org_date ON daily_stats(org_id, stat_date DESC);
CREATE INDEX idx_dailystats_user_date ON daily_stats(user_id, stat_date DESC);
```

**How populated:** Background job runs every 5 minutes with:
```sql
INSERT INTO daily_stats (org_id, user_id, stat_date, prompt_count, flagged_count, ...)
SELECT org_id, user_id, DATE(captured_at), COUNT(*), ...
FROM events
WHERE captured_at > NOW() - INTERVAL '1 day'
GROUP BY org_id, user_id, DATE(captured_at)
ON CONFLICT (org_id, user_id, stat_date) DO UPDATE SET ...
```

---

## Redis Key Structure

```
# Session tokens (JWT revocation list)
session:{user_id}:{jti}       → "valid"   TTL: token expiry

# Rate limiting (event ingestion per org)
ratelimit:events:{org_id}     → count     TTL: 1 minute window

# Cache: org settings (avoid DB hit on every event)
cache:org:{org_id}            → JSON      TTL: 5 minutes

# Cache: user token lookup
cache:usertoken:{user_token}  → user_id   TTL: 10 minutes

# WebSocket broadcast: pending events to push
ws:pending:{org_id}           → List of event JSON

# Extension session tracking
ext:session:{session_id}      → {user_id, org_id, platform}   TTL: 8 hours
```

---

## SQLAlchemy Models (`models/db.py`)

```python
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMPTZ
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func
import uuid

class Base(DeclarativeBase):
    pass

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    org_api_key = Column(String(64), unique=True, nullable=False)
    plan = Column(String(50), default="free")
    settings = Column(JSONB, default={})
    created_at = Column(TIMESTAMPTZ, server_default=func.now())
    updated_at = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="org", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="org", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    email = Column(String(320), nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255))
    role = Column(String(50), default="employee")
    user_token = Column(String(64), unique=True, nullable=False)
    status = Column(String(50), default="pending")
    last_active_at = Column(TIMESTAMPTZ)
    created_at = Column(TIMESTAMPTZ, server_default=func.now())

    org = relationship("Organization", back_populates="users")
    events = relationship("Event", back_populates="user")

class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    source = Column(String(50), nullable=False)
    platform = Column(String(100), nullable=False)
    page_url = Column(Text)
    prompt_text = Column(Text, nullable=False)
    prompt_length = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer)
    session_id = Column(String(128))
    response_tokens = Column(Integer)
    model_used = Column(String(100))
    risk_score = Column(Integer, default=0)
    dlp_categories = Column(ARRAY(Text), default=[])
    has_critical = Column(Boolean, default=False)
    status = Column(String(50), default="clean")
    captured_at = Column(TIMESTAMPTZ, nullable=False)
    created_at = Column(TIMESTAMPTZ, server_default=func.now())

    org = relationship("Organization", back_populates="events")
    user = relationship("User", back_populates="events")
    findings = relationship("DLPFinding", back_populates="event", cascade="all, delete-orphan")

class DLPFinding(Base):
    __tablename__ = "dlp_findings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    org_id = Column(UUID(as_uuid=True), nullable=False)
    finding_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    offset_start = Column(Integer)
    matched_length = Column(Integer)
    redacted_value = Column(String(255))
    created_at = Column(TIMESTAMPTZ, server_default=func.now())

    event = relationship("Event", back_populates="findings")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="open")
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    acknowledged_at = Column(TIMESTAMPTZ)
    created_at = Column(TIMESTAMPTZ, server_default=func.now())
```

---

## Alembic Migration (Initial)

```bash
# Initialize alembic
alembic init alembic

# Create first migration
alembic revision --autogenerate -m "initial schema"

# Run migrations
alembic upgrade head
```

**`alembic/env.py`** — set `target_metadata = Base.metadata` and point to DATABASE_URL from env.

---

## Seed Data (for development)

```python
# scripts/seed.py
async def seed():
    org = Organization(name="Demo Corp", slug="democorp", org_api_key="aisnl_org_demo123")
    admin = User(org_id=org.id, email="admin@demo.com", name="Demo Admin",
                 role="admin", user_token="aisnl_usr_admin123",
                 hashed_password=bcrypt.hash("password"), status="active")
    employee = User(org_id=org.id, email="emp@demo.com", name="Demo Employee",
                    role="employee", user_token="aisnl_usr_emp456", status="active")
    db.add_all([org, admin, employee])
    await db.commit()
```
