# 09 — Backend API and Schema Extensions

## Executive summary

This document specifies **MongoDB / Beanie model changes**, **new REST endpoints**, and **ingest payload extensions** required for advanced extension features. All new fields are **optional** for backward compatibility with MVP extension builds.

Baseline references: [`documents.py`](../../backend/models/documents.py), [`schemas.py`](../../backend/schemas.py), [`events.py`](../../backend/api/events.py).

---

## Organization.settings schema

Extend `Organization.settings` JSON (no migration required for mongomock/memory):

```json
{
  "features": {
    "jit_training": false,
    "local_audit": false,
    "anonymization": false,
    "clipboard_lineage": false,
    "shadow_ai_detection": false,
    "policy_cache": true
  },
  "anonymize_mode": "off",
  "jit_mode": "off",
  "shadow_ai_policy": "observe",
  "shadow_ai_threshold": 65,
  "sensitive_domains": [
    {
      "host_pattern": "*.atlassian.net",
      "sensitivity_label": "internal_restricted",
      "enabled": true
    }
  ],
  "ai_allowlist": ["labs.trusted.internal"],
  "shadow_ai_exclude_hosts": ["docs.google.com"],
  "policy_version": "pol_v1"
}
```

| Field | Type | Default |
|-------|------|---------|
| `anonymize_mode` | `off` \| `suggest` \| `enforce` | `off` |
| `jit_mode` | `off` \| `log_only` \| `attest` \| `manager_notify` | `off` |
| `shadow_ai_policy` | `observe` \| `protect` \| `alert_admin` | `observe` |

---

## Event document extensions

Add to `Event` in [`documents.py`](../../backend/models/documents.py):

```python
# Anonymization
prompt_text_redacted: Optional[str] = None
was_anonymized: bool = False
token_map_id: Optional[str] = None
entity_summary: list[dict[str, Any]] = Field(default_factory=list)

# Client audit
client_risk_score: Optional[int] = None
client_risk_level: Optional[str] = None
client_findings: list[dict[str, Any]] = Field(default_factory=list)
client_model_version: Optional[str] = None
client_timing_ms: Optional[int] = None

# Shadow AI
platform_detected: Optional[str] = None
shadow_ai_confidence: Optional[int] = None

# Clipboard lineage
clipboard_lineage: Optional[dict[str, Any]] = None

# JIT
jit_decision: Optional[dict[str, Any]] = None
```

**Storage rule:** When `was_anonymized=True` and org policy says `store_raw=false`, persist only `prompt_text_redacted` in `prompt_text` field (or separate fields per compliance mode).

---

## EventIngestRequest extensions

Add to [`schemas.py`](../../backend/schemas.py):

```python
class ClipboardLineagePayload(BaseModel):
    status: str  # resolved | unknown
    origin_host: Optional[str] = None
    sensitivity_label: Optional[str] = None
    copied_at: Optional[datetime] = None

class JitDecisionPayload(BaseModel):
    triggered: bool = False
    trigger_reason: Optional[str] = None
    policy_version: Optional[str] = None
    user_acknowledged_at: Optional[datetime] = None
    justification_text: Optional[str] = None
    user_cancelled: bool = False

class ClientFindingPayload(BaseModel):
    type: str
    severity: str
    description: Optional[str] = None

class EventIngestRequest(BaseModel):
    # ... existing fields ...
    was_anonymized: bool = False
    token_map_id: Optional[str] = None
    entity_summary: Optional[list[dict[str, Any]]] = None
    client_risk_score: Optional[int] = None
    client_risk_level: Optional[str] = None
    client_findings: Optional[list[ClientFindingPayload]] = None
    client_model_version: Optional[str] = None
    client_timing_ms: Optional[int] = None
    platform_detected: Optional[str] = None
    shadow_ai_confidence: Optional[int] = None
    clipboard_lineage: Optional[ClipboardLineagePayload] = None
    jit_decision: Optional[JitDecisionPayload] = None
```

---

## New collections (optional)

### ShadowAiDiscovery

For admin review queue before events exist:

```python
class ShadowAiDiscovery(Document):
    org_id: PydanticObjectId
    hostname: str
    sample_url: str
    confidence: int
    signals: list[str]
    first_seen_at: datetime
    last_seen_at: datetime
    status: str = "pending"  # pending | allowlisted | blocked | ignored
    reviewed_by: Optional[PydanticObjectId] = None
```

---

## API endpoints

### Policies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/policies/cache` | `X-Org-Token` or JWT | Extension policy bundle |
| `PUT` | `/api/policies` | Admin JWT | Update org policy settings |

**`GET /api/policies/cache` response:**

```json
{
  "policy_version": "pol_v3",
  "features": { "jit_training": false, "local_audit": true },
  "anonymize_mode": "suggest",
  "jit_mode": "attest",
  "sensitive_domains": [],
  "ai_allowlist": [],
  "shadow_ai_threshold": 65,
  "cached_at": "2026-05-23T12:00:00Z"
}
```

Extension sends `If-None-Match: pol_v3` → `304` when unchanged.

### Sensitive domains

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/orgs/sensitive-domains` | Admin JWT |
| `PUT` | `/api/orgs/sensitive-domains` | Admin JWT |

Body: `{ "domains": [ { "host_pattern": "...", "sensitivity_label": "...", "enabled": true } ] }`

### Shadow AI

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/shadow-ai/discoveries` | `X-Org-Token` + user_token |
| `GET` | `/api/shadow-ai/discoveries` | Admin JWT |
| `PATCH` | `/api/shadow-ai/discoveries/{id}` | Admin JWT |

Patch body: `{ "status": "allowlisted" }` → adds hostname to `ai_allowlist`.

### Events (existing, extended)

`POST /api/events` — accept all new optional fields; processing in [`events.py`](../../backend/api/events.py):

```python
async def _ingest_event(org, user, body):
    scan_text = body.prompt_text
    if body.was_anonymized:
        scan_text = body.prompt_text  # already redacted
    scan = scan_prompt(scan_text, custom_rules)
    if body.client_risk_score is not None:
        scan = merge_hybrid(body.client_risk_score, body.client_findings, scan)
    if body.clipboard_lineage and body.clipboard_lineage.sensitivity_label:
        scan = apply_lineage_boost(scan, body.clipboard_lineage)
    # ... create Event with extended fields ...
```

---

## Serializer extensions

Update [`api/serializers.py`](../../backend/api/serializers.py) `event_list_item`:

```python
{
    # ... existing ...
    "was_anonymized": e.was_anonymized,
    "client_risk_score": e.client_risk_score,
    "client_risk_level": e.client_risk_level,
    "shadow_ai_confidence": e.shadow_ai_confidence,
    "clipboard_lineage": e.clipboard_lineage,
    "jit_decision": e.jit_decision,
    "has_jit_decision": bool(e.jit_decision and e.jit_decision.get("triggered")),
}
```

---

## hybrid_dlp.py (new service)

```python
# services/hybrid_dlp.py
from services.dlp import ScanResult, Finding

LINEAGE_BOOST = {
    "internal_restricted": 15,
    "highly_confidential": 25,
}

def merge_hybrid(
    client_score: int,
    client_findings: list | None,
    server: ScanResult,
) -> ScanResult:
    score = min(100, max(client_score, server.risk_score))
    # Recompute level from score using same thresholds as dlp.py
    ...
```

---

## policy_engine.py (new service)

```python
def evaluate_pre_submit(policy: dict, context: dict) -> dict:
    """
    context: client_risk, lineage, platform_detected, anonymize_mode
    returns: { require_jit, require_anonymize, block_submit, reasons[] }
    """
```

Called conceptually on client; server re-validates on ingest for tamper detection.

---

## Dashboard API usage

| Page | Endpoints |
|------|-----------|
| Settings → Policies | `PUT /api/policies` |
| Sensitive domains | `GET/PUT /api/orgs/sensitive-domains` |
| Shadow AI queue | `GET/PATCH /api/shadow-ai/discoveries` |
| Events filter | `GET /api/events?has_jit=true` (query param extension) |

---

## Security notes

| Topic | Requirement |
|-------|-------------|
| Token maps | Do not store raw vault server-side in enforce mode |
| JIT justification | PII scrub before display in shared admin views |
| Policy cache | Signed bundle optional Phase 2 (`HMAC-SHA256`) |
| Rate limits | Keep existing 600 events/min per org |

---

## Migration checklist

- [ ] Add fields to Beanie models (defaults prevent break)
- [ ] Extend Pydantic ingest schema
- [ ] Update `event_list_item` serializer
- [ ] Seed demo org with `features.* = false`
- [ ] Document in OpenAPI `/docs` via FastAPI model docstrings

---

## Cross-references

- Integration phases: [07_INTEGRATION_MASTER_PLAN.md](./07_INTEGRATION_MASTER_PLAN.md)
- Original API spec: [`Plan/06_API_SPEC.md`](../../Plan/06_API_SPEC.md)
- MongoDB: [`Plan/05b_MONGODB_SCHEMA.md`](../../Plan/05b_MONGODB_SCHEMA.md)
