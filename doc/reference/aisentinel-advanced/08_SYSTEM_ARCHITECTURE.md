# 08 — System Architecture

## Executive summary

Advanced AISentinel adds a **client-side protection pipeline** in the browser extension, optional **origin taggers** on internal apps, and **server-side policy + audit** reinforcement. The employee sees de-tokenized AI answers; the AI vendor and org backend receive redacted or policy-compliant payloads.

---

## Trust boundaries

```mermaid
flowchart TB
  subgraph untrusted [Untrusted]
    AIVendor[AI_SaaS_Vendor]
    ShadowSite[Unknown_AI_Site]
  end
  subgraph semi [Semi_trusted]
    AISentinelAPI[Org_AISentinel_Backend]
  end
  subgraph trusted [Trusted_endpoint]
    Browser[Employee_Browser]
    Ext[AISentinel_Extension]
    Vault[TokenVault_session_storage]
  end
  Browser --> Ext
  Ext --> Vault
  Ext -->|"anonymized_prompt"| AISentinelAPI
  Ext -->|"anonymized_prompt"| AIVendor
  AIVendor -->|"tokenized_response"| Ext
  Ext -->|"detokenized_UI"| Browser
  Ext -.->|"never_raw_secrets_if_enforced"| AISentinelAPI
```

| Zone | Data allowed |
|------|----------------|
| Extension + session vault | Raw secrets, token maps |
| Network to AI vendor | Placeholder tokens only (enforce mode) |
| AISentinel backend | Redacted prompt + metadata + optional encrypted map reference |
| Dashboard (admin) | Redacted by default; reveal raw with RBAC + audit log (future) |

---

## Component diagram

```mermaid
flowchart TB
  subgraph ext [Extension_MV3]
    CS[ContentScript]
    SW[ServiceWorker]
    ENG[Engine_Module]
    UI[JIT_Overlay]
    WASM[WASM_ONNX]
    CS --> ENG
    ENG --> WASM
    CS --> UI
    CS <--> SW
  end
  subgraph internal [Internal_Sites_Optional]
    TAG[CopyTagger_CS]
  end
  subgraph backend [FastAPI]
    EVT[events.py]
    DLP[dlp.py]
    POL[policy_engine.py]
    EVT --> DLP
    EVT --> POL
  end
  subgraph fe [React_Dashboard]
    ADM[Admin_Settings]
  end
  TAG -->|lineage_entry| SW
  CS -->|submit_pipeline| SW
  SW --> EVT
  ADM --> backend
```

---

## Submit pipeline (target state)

Sequence when employee sends a prompt on an AI page:

```mermaid
sequenceDiagram
  participant User
  participant CS as ContentScript
  participant ENG as Engine
  participant SW as ServiceWorker
  participant API as FastAPI
  participant AI as AI_Vendor

  User->>CS: Click_Send
  CS->>ENG: getPromptText()
  ENG->>ENG: lineageCheck(paste_meta)
  ENG->>ENG: localAudit_WASM()
  ENG->>ENG: buildTokenMap()
  alt JIT_required
    ENG->>User: showJITOverlay()
    User->>ENG: acknowledge()
  end
  ENG->>ENG: anonymize(prompt)
  CS->>SW: INGEST_EVENT_redacted
  par Audit_path
    SW->>API: POST_/api/events
  and AI_path
    Note over CS,AI: MAIN_world_hook_or_DOM_swap
    CS->>AI: anonymized_body_only
  end
  AI-->>CS: stream_tokenized_response
  CS->>ENG: detokenize(stream)
  ENG->>User: display_real_entities
```

**MVP today:** Only `INGEST_EVENT` with full `prompt_text` to API — no anonymization, no AI intercept ([`content.js`](../extension/content.js)).

---

## Module responsibilities (future `extension/src/`)

| Module | Path | Responsibility |
|--------|------|----------------|
| `content/index.ts` | Entry | Wire DOM observers, delegate to pipeline |
| `engine/pipeline.ts` | Orchestrator | Ordered stages, timing metrics |
| `engine/tokenizer.ts` | Anonymize | Entity → placeholder |
| `engine/detokenizer.ts` | De-anonymize | Response stream swap |
| `engine/vault.ts` | Storage | Session-scoped maps |
| `engine/lineage.ts` | Clipboard | Hash lookup / tag on copy |
| `engine/shadow-ai.ts` | Detection | Heuristic score |
| `engine/audit.ts` | Risk | WASM + optional ONNX |
| `ui/jit-overlay.ts` | UX | Blur + attestation |
| `background/index.ts` | SW | Policy fetch, queue, ingest |
| `shared/messages.ts` | Types | `INGEST_EVENT`, `POLICY_UPDATE` |

---

## Policy distribution

```mermaid
sequenceDiagram
  participant SW as ServiceWorker
  participant API as FastAPI
  participant CS as ContentScript

  Note over SW: On_install_and_every_15min_alarm
  SW->>API: GET_/api/policies/cache
  API-->>SW: policy_bundle_version_hash
  SW->>SW: chrome.storage.local
  CS->>SW: getPolicy()
  SW-->>CS: cached_policy
```

Policy bundle includes: `anonymize_mode`, `jit_mode`, `sensitive_domains`, `feature_flags`, `shadow_ai_threshold`.

---

## Hybrid risk scoring

| Source | Field | Weighting |
|--------|-------|-----------|
| Client WASM/ONNX | `client_risk_score`, `client_findings[]` | First signal; can trigger JIT |
| Server `dlp.py` | `risk_score`, `risk_level` | Authoritative for alerts when anonymized text sent |
| Lineage | `clipboard_lineage.sensitivity` | Bump score +15 if `internal_restricted` |

```python
# Illustrative server merge (future dlp.py)
def hybrid_score(client: int, server: int, lineage_boost: int = 0) -> int:
    return min(100, max(client, server) + lineage_boost)
```

---

## Storage model (client)

| Store | Key pattern | TTL | Contents |
|-------|-------------|-----|----------|
| `chrome.storage.sync` | `apiBase`, `orgToken`, `userToken` | Persistent | Config (existing) |
| `chrome.storage.local` | `policy:v{hash}` | Until update | Policy JSON |
| `chrome.storage.session` | `vault:{sessionId}` | Browser session | Token maps |
| `chrome.storage.session` | `lineage:{hash}` | Browser session | Copy metadata |
| IndexedDB (optional NF-6) | `offline_queue` | Until ack | Failed ingest retries |

---

## Deployment topologies

| Topology | Extension role | Backend |
|----------|----------------|---------|
| **SaaS** | All employees → `api.aisentinel.io` | Multi-tenant MongoDB |
| **Single-tenant VPC** | Same CRX, custom API URL in popup | Customer-hosted FastAPI |
| **Air-gapped audit** | Local ONNX only; ingest metadata-only mode | Optional |

---

## Failure and degrade modes

| Failure | Behavior |
|---------|----------|
| WASM load fail | Fall back to TS regex ([`dlp.py`](../backend/services/dlp.py) patterns ported) |
| Policy fetch fail | Use last cached policy; if none, **observe-only MVP** |
| ONNX timeout (&gt;50ms) | Skip semantic tier; rules-only |
| API ingest fail | Queue in IndexedDB; alarm retry |
| De-tokenize mismatch | Log `DETOKENIZE_MISS`; show tokens to user with warning banner |

---

## Cross-references

- Stack choices: [06_TECH_STACK_AND_LANGUAGES.md](./06_TECH_STACK_AND_LANGUAGES.md)
- API/schema: [09_BACKEND_API_AND_SCHEMA.md](./09_BACKEND_API_AND_SCHEMA.md)
- Performance: [10_MANIFEST_MV3_AND_PERFORMANCE.md](./10_MANIFEST_MV3_AND_PERFORMANCE.md)
- Feature details: `features/01` … `features/05`
