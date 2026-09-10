# Feature 03 — Dynamic Shadow AI UI Detection

## Part I — Deep explanation

### Problem statement

Security teams maintain URL blocklists of 20–50 known AI tools. Daily new surfaces appear: Hugging Face Spaces, Gradio demos, Streamlit apps, internal POC chatbots. **Static manifests cannot keep pace.**

Shadow AI detection applies **heuristic analysis** of the page DOM and behavior to infer: *this page is an AI chat interface.*

### User story

> Employee opens `https://labs.internal/demo-chat` (not in blocklist).  
> Extension scores page 78/100 as probable AI UI.  
> Org policy applies: observe + anonymize + JIT on first submit.  
> Admin receives "new AI surface detected" for allowlist review.

### Detection signals (v1 — no ML required)

| Signal | Weight | Detection method |
|--------|--------|------------------|
| Prompt input | +25 | `textarea` height &gt;80px OR large `contenteditable` |
| Send control | +20 | Button with send/submit aria-label or icon SVG pattern |
| Streaming output | +25 | `MutationObserver` text growth &gt;50 chars/sec in container |
| Markdown rendering | +15 | `pre code`, `.markdown`, `.prose` near output area |
| Message thread layout | +10 | Repeated user/assistant row DOM pattern |
| WebSocket activity | +5 | Optional: count WS frames via Performance API (limited) |

**Score** = sum of matched weights, capped at 100.  
**Threshold** default: 65 → treat as AI page.

### Platform identification

```typescript
type PlatformId =
  | 'chatgpt' | 'claude' | 'gemini'   // known — from PLATFORM_CONFIG
  | 'copilot' | 'unknown_ai';          // heuristic fallback
```

Replace static-only [`PLATFORM_CONFIG`](../../extension/utils/helpers.js) lookup:

```typescript
function resolvePlatform(hostname: string, domScore: number): PlatformId {
  if (PLATFORM_CONFIG[hostname]) return PLATFORM_CONFIG[hostname].name;
  if (domScore >= threshold) return 'unknown_ai';
  return 'none'; // not an AI page — minimal monitoring
}
```

### Policy on unknown AI

| `shadow_ai_policy` | Behavior |
|--------------------|----------|
| `observe` | Log events with `platform_detected: unknown_ai` |
| `protect` | Full pipeline: audit + anonymize + JIT |
| `alert_admin` | Create admin notification on first sighting per domain |

### Human-in-the-loop allowlist

Dashboard queue shows:

| Field | Example |
|-------|---------|
| Domain | `labs.internal` |
| First seen | 2026-05-23 |
| Confidence | 78 |
| Employee count | 3 |
| Actions | Allowlist / Block / Ignore |

Allowlist → persist to `org.settings.ai_allowlist[]` → extension fetches via policy cache.

### False positive sources

| Page type | Mitigation |
|-----------|------------|
| Google Docs | Require send button + streaming-like growth in same container |
| Slack | Exclude if hostname in `shadow_ai_exclude_hosts` |
| Gmail compose | Lower weight unless streaming response area detected |
| Code editors | Require paired input+output regions |

Tune per org with exclude list.

### Enterprise value

- **Coverage** of long-tail AI without weekly manifest updates
- **Discovery** report for shadow IT
- **Consistent policy** on unknown tools same as ChatGPT

### Limits

- Cannot detect AI used only via desktop app or API clients
- Heuristic scan on `<all_urls>` is expensive — use `activeTab` + programmatic injection ([`10_MANIFEST`](../10_MANIFEST_MV3_AND_PERFORMANCE.md))
- Adversarial pages could mimic AI DOM to trigger policies (low risk internally)

---

## Part II — Implementation stack

| Component | Technology |
|-----------|------------|
| Detector class | TypeScript `ShadowAiDetector` |
| Scan timing | `requestIdleCallback` after load + on major DOM mutations (debounced 500ms) |
| Injection | `chrome.scripting.executeScript` when tab active + score pending |
| Backend | `platform_detected`, `shadow_ai_confidence` on Event |
| Dashboard | Shadow AI review page |

### Core API

```typescript
class ShadowAiDetector {
  constructor(private readonly threshold = 65) {}

  scan(root: Document = document): { score: number; signals: string[] } {
    const signals: string[] = [];
    let score = 0;
    // ... evaluate each signal
    return { score: Math.min(100, score), signals };
  }

  isAiPage(): boolean {
    return this.scan().score >= this.threshold;
  }
}
```

### Latency

- **Not on submit hot path** — idle scan &lt;100ms acceptable
- Cache result in `sessionStorage` per tab URL for 5 min

---

## Part III — Integration and optimization

### Activation strategy (NF-5)

**Preferred:** Do not register global `<all_urls>` content script.

```typescript
// background.ts — on tab complete
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;
  if (isKnownAiHost(tab.url)) return; // already covered
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['dist/shadow-scan.js'],
  });
});
```

`shadow-scan.js` returns score via `sendMessage` → background logs discovery event.

### Files to add

```
extension/src/engine/shadow-ai.ts
extension/src/content/shadow-scan.ts
backend/api/shadow_ai.py
frontend/src/pages/ShadowAiReview.jsx
```

### Discovery event (new, optional endpoint)

`POST /api/shadow-ai/discoveries`

```json
{
  "url": "https://labs.internal/chat",
  "hostname": "labs.internal",
  "confidence": 78,
  "signals": ["prompt_input", "streaming_output"],
  "user_token": "..."
}
```

### Ingest extension

```json
{
  "platform": "unknown_ai",
  "platform_detected": "unknown_ai",
  "shadow_ai_confidence": 78,
  "page_url": "https://labs.internal/chat"
}
```

### Acceptance criteria (NF-5 gate)

- [ ] Known ChatGPT → uses `chatgpt` platform, no false unknown
- [ ] Gradio demo HTML fixture → score ≥65 in unit test
- [ ] Google Docs fixture → score &lt;65
- [ ] Allowlist domain → no admin alert on repeat visits
- [ ] Idle scan does not block main thread &gt;100ms (Performance API)

### Optimization

- [ ] Early exit when score already ≥threshold
- [ ] Disconnect observer after stable score for 30s
- [ ] Share detector instance per tab

### Rollback

`org.settings.features.shadow_ai_detection = false` → only known hosts from manifest.

---

## Cross-references

- Manifest performance: [10_MANIFEST_MV3_AND_PERFORMANCE.md](../10_MANIFEST_MV3_AND_PERFORMANCE.md)
- Extension spec: [`Plan/08_CHROME_EXTENSION_SPEC.md`](../../../Plan/08_CHROME_EXTENSION_SPEC.md)
- Policies: [`Plan/15_POLICIES_SPEC.md`](../../../Plan/15_POLICIES_SPEC.md)
