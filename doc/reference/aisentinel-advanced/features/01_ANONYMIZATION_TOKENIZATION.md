# Feature 01 — Bi-directional Prompt Anonymization (Tokenization Engine)

## Part I — Deep explanation

### Problem statement

Hard-blocking a prompt that contains a company name or API key teaches employees to **work around security**. They rephrase secrets, use personal ChatGPT, or screenshot internal docs. The AI vendor may still receive sensitive data; the org loses visibility.

**Anonymization** inverts the model: the employee experience stays seamless; the **AI never sees raw secrets**.

### User story

> As a developer, I paste: *"Find the bug in this code for Apple Inc. using encryption key XYZ."*  
> The extension sends: *"Find the bug in this code for `<COMPANY_1>` using encryption key `<KEY_1>`."*  
> When ChatGPT replies with `<COMPANY_1>`, I see **Apple Inc.** in my browser.

### How it works

#### 1. Entity detection

Run detectors on prompt text **before** submit:

| Entity type | Example | Placeholder |
|-------------|---------|-------------|
| Organization name | Apple Inc. | `<COMPANY_1>` |
| API key | `sk-abc...` | `<KEY_1>` |
| Email | user@corp.com | `<EMAIL_1>` |
| Phone | +1-555-… | `<PHONE_1>` |
| Financial figure | $2.4M revenue | `<FIN_1>` |
| Custom org pattern | Project codename TITAN | `<CUSTOM_1>` |

Counters are per-type and per-session (`COMPANY_1`, `COMPANY_2`, …).

#### 2. Token vault

In-memory map stored in `chrome.storage.session`:

```json
{
  "sessionId": "sess_abc",
  "tokens": {
    "<COMPANY_1>": { "value": "Apple Inc.", "type": "COMPANY", "hash": "sha256..." },
    "<KEY_1>": { "value": "XYZ", "type": "API_KEY", "hash": "..." }
  }
}
```

**Never** send `value` to AISentinel API in `enforce` mode — only types and counts, plus `token_map_id` reference if server-side audit map is enabled (encrypted).

#### 3. Anonymize (outbound)

Replace entities longest-first (avoid partial overlaps). Preserve prompt grammar so model reasoning still works.

#### 4. De-tokenize (inbound)

`MutationObserver` on assistant message containers (platform-specific selectors from [`helpers.js`](../../extension/utils/helpers.js)):

- Walk text nodes
- Replace `<COMPANY_1>` → vault lookup
- Handle streaming: debounce 50ms, re-run on chunk append

#### 5. Intercept points

| Path | Method |
|------|--------|
| DOM submit (MVP+) | Swap `textContent` / `value` before site JS reads it |
| `fetch` to AI API | MAIN-world hook ([`10_MANIFEST_MV3_AND_PERFORMANCE.md`](../10_MANIFEST_MV3_AND_PERFORMANCE.md)) |
| Clipboard paste into input | Optional pre-tokenize on paste |

### Policy modes

| Mode | Behavior |
|------|----------|
| `off` | Observe-only; send raw text to org backend (current MVP) |
| `suggest` | Show banner "We can anonymize N entities"; user confirms |
| `enforce` | Always tokenize before AI network; block submit if vault fails |

### Failure modes and mitigations

| Failure | Mitigation |
|---------|------------|
| Model invents `<COMPANY_99>` | Ignore unknown tokens in de-tokenizer; log metric |
| Multi-turn context drift | Persist vault per `sessionId` in session storage |
| Partial leak in code block | Detect entities inside fenced code blocks separately |
| Over-tokenization hurts answer | Org tuning: allowlist generic terms; min entity length |
| Vault cleared mid-chat | Graceful degrade: show placeholders + "session expired" toast |

### Enterprise value

- **Compliance:** Demonstrate AI vendors did not process raw PII/secrets
- **Productivity:** No hard stop for developers using real variable names
- **Audit:** Map which entity *types* were sent, how many per session

### Chrome / security limits

- Cannot de-tokenize what employee never received through our observed DOM (e.g. native app)
- MAIN-world hook may break on CSP-heavy sites — DOM path is fallback
- Other extensions reading network see tokenized body only if hook succeeds

---

## Part II — Implementation stack

| Component | Technology |
|-----------|------------|
| Orchestration | TypeScript `Tokenizer` class |
| Fast detection | Rust WASM `detect_entities()` or port of [`dlp.py`](../../backend/services/dlp.py) rules to TS |
| Vault | `chrome.storage.session` + in-memory cache |
| DOM | Isolated content script + optional MAIN `inject.js` |
| Server | Python: store `prompt_text_redacted`, `was_anonymized`, `token_map_id` |
| Dashboard | React: policy toggle `anonymize_mode` |

### Core TypeScript interfaces

```typescript
interface EntitySpan {
  start: number;
  end: number;
  type: 'COMPANY' | 'API_KEY' | 'EMAIL' | 'PHONE' | 'FIN' | 'CUSTOM';
  text: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

interface TokenMap {
  sessionId: string;
  tokens: Record<string, { value: string; type: string; hash: string }>;
}

interface AnonymizeResult {
  redactedText: string;
  map: TokenMap;
  entityCount: number;
}
```

### Latency budget

| Step | Target |
|------|--------|
| detect_entities | ≤15ms |
| replace + vault write | ≤10ms |
| **Total** | ≤25ms (within 50ms pipeline) |

---

## Part III — Integration and optimization

### Files to add (NF-3)

```
extension/src/engine/tokenizer.ts
extension/src/engine/detokenizer.ts
extension/src/engine/vault.ts
extension/src/engine/entities.ts
extension/src/content/response-observer.ts
extension/src/inject/fetch-hook.ts          # MAIN world, optional
```

### Files to modify

| File | Change |
|------|--------|
| [`content.js`](../../extension/content.js) → `content/index.ts` | Call pipeline before `sendEvent` |
| [`background.js`](../../extension/background.js) | Accept `prompt_text_redacted`, `was_anonymized` |
| [`schemas.py`](../../backend/schemas.py) | Extend `EventIngestRequest` |
| [`events.py`](../../backend/api/events.py) | Persist new fields; scan redacted text |
| [`documents.py`](../../backend/models/documents.py) | Event model fields |

### API ingest extension

```json
{
  "prompt_text": "<redacted or same if off>",
  "prompt_text_original_length": 120,
  "was_anonymized": true,
  "token_map_id": "tm_sess_abc",
  "entity_summary": [{ "type": "COMPANY", "count": 1 }, { "type": "API_KEY", "count": 1 }]
}
```

### Acceptance criteria (NF-3 gate)

- [ ] Round-trip: submit with secret → network payload has no secret substring (verify DevTools)
- [ ] UI shows real secret in assistant reply after de-tokenize
- [ ] `enforce` off → identical to current MVP ingest
- [ ] Vault not in API payload in enforce mode
- [ ] p95 anonymize &lt;25ms on 2KB prompt (benchmark in [`11_TESTING`](../11_TESTING_QA_AND_ROLLOUT.md))

### Optimization checklist

- [ ] Sort entities by start index descending before replace
- [ ] Cache compiled regex at module load
- [ ] Skip tokenization for prompts &lt;10 chars
- [ ] Batch de-tokenize on `requestAnimationFrame` during streaming

### Rollback

Feature flag `org.settings.features.anonymization = false` → pipeline stage no-op.

---

## Cross-references

- Architecture: [08_SYSTEM_ARCHITECTURE.md](../08_SYSTEM_ARCHITECTURE.md)
- Policies: [`Plan/15_POLICIES_SPEC.md`](../../../Plan/15_POLICIES_SPEC.md)
- Local audit before tokenize: [04_LOCAL_WASM_WEBGPU_AUDIT.md](./04_LOCAL_WASM_WEBGPU_AUDIT.md)
- JIT on borderline: [05_JIT_MICRO_TRAINING.md](./05_JIT_MICRO_TRAINING.md)
