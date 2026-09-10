# 10 — Manifest V3 and Performance

## Executive summary

All advanced features must comply with **Chrome Manifest V3** and introduce **≤50ms p95 latency** on the prompt submit hot path. This document specifies permissions, service worker lifecycle, build output, and per-stage timing budgets.

---

## Current MVP manifest (baseline)

From [`aisentinel/extension/manifest.json`](../extension/manifest.json):

| Item | Current value |
|------|---------------|
| `manifest_version` | 3 |
| `permissions` | `storage`, `alarms` (alarms unused) |
| `host_permissions` | ChatGPT, Claude, Gemini, localhost API |
| Content scripts | 3 platform-specific entries |
| Background | `background.js` service worker |

Advanced features will **extend** permissions incrementally per phase — never request all upfront.

---

## Permission roadmap by phase

| Phase | New permissions | Justification |
|-------|-----------------|---------------|
| NF-0 | None | Build parity |
| NF-1 | None | JIT is DOM-only |
| NF-2 | `web_accessible_resources` for WASM | Load `.wasm` from extension package |
| NF-3 | Optional `scripting` | Programmatic inject on dynamic shadow AI pages |
| NF-4 | Additional `host_permissions` per org domain list | Copy tagger on Jira/SFDC |
| NF-5 | `activeTab` preferred over `<all_urls>` | Inject detector on demand |
| NF-6 | None | Uses existing + `offscreen` only if ONNX init requires it |

**Avoid:** `webRequestBlocking` (deprecated in MV3). Use DOM intercept + `declarativeNetRequest` only if product later adds true network block (out of scope for anonymize-first thesis).

---

## Target manifest snippet (NF-6 reference)

```json
{
  "manifest_version": 3,
  "name": "AISentinel — AI Usage Monitor",
  "version": "0.2.0",
  "permissions": ["storage", "alarms", "scripting", "activeTab"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://api.aisentinel.io/*"
  ],
  "optional_host_permissions": [
    "https://*.atlassian.net/*",
    "https://*.salesforce.com/*"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["dist/content.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["dist/*.wasm", "models/*.onnx"],
      "matches": ["<all_urls>"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

`wasm-unsafe-eval` required for WASM in extension pages; minimize exposure — WASM runs in content script context only.

---

## 50ms latency budget (p95)

| Stage | Budget (ms) | Notes |
|-------|-------------|-------|
| DOM read `getPromptText()` | 3 | Cache input element ref |
| Lineage hash lookup | 2 | `Map` in memory from session storage hydrate |
| WASM / regex audit | 15 | Early exit on clean short prompts |
| Tokenization | 10 | Proportional to entity count |
| JIT decision (no UI) | 2 | Score check only |
| Message to SW | 5 | `sendMessage` + serialize |
| **Total (no JIT UI)** | **≤37** | Headroom for slow devices |
| JIT overlay | +user time | Not counted in hot path |

**Measurement:** `performance.now()` marks in `pipeline.ts`; aggregate `client_timing_ms` on ingest payload for dashboard perf report.

```typescript
// Illustrative
const t0 = performance.now();
const audit = await runAudit(text);
const timing = { audit_ms: performance.now() - t0, total_ms: 0 };
```

---

## Service worker lifecycle

MV3 service workers **terminate when idle**. Implications:

| Concern | Mitigation |
|---------|------------|
| In-flight `fetch` killed | Keep requests &lt;10s; retry via alarm |
| Cold start on message | Pre-load policy on install + alarm every 15 min |
| WASM init cost | Init in content script, not SW (DOM context) |
| Offline events | IndexedDB queue + `chrome.alarms` `retryIngest` |

**Use `alarms` (fix MVP gap):**

```typescript
chrome.alarms.create('policyRefresh', { periodInMinutes: 15 });
chrome.alarms.create('ingestRetry', { periodInMinutes: 1 });
```

---

## Content script performance

| Practice | Reason |
|----------|--------|
| Debounce `MutationObserver` callbacks (100ms) | SPA DOM thrashing on ChatGPT |
| WeakMap for bound elements | Avoid duplicate listeners |
| Run heavy work in `requestIdleCallback` for shadow AI scan | Not on submit path |
| Do not scan entire `document.body` innerText | Use targeted selectors |
| Lazy-load ONNX on first risky paste, not page load | Faster initial page |

---

## MAIN world vs isolated world

| Approach | Use case |
|----------|----------|
| **Isolated** (default) | DOM read, overlay UI, activity log — current MVP |
| **MAIN** (`world: "MAIN"`) | Hook `fetch` / `XMLHttpRequest` to swap body before AI API call |

**NF-3 requirement:** Document injection spec for MAIN-world `inject.js` with minimal surface:

```javascript
// inject.js (MAIN) — illustrative
const origFetch = window.fetch;
window.fetch = async function (input, init) {
  const detail = await window.dispatchEvent(new CustomEvent('aisentinel:beforeFetch', { detail: { init } }));
  // Isolated world sets anonymized body via shared DOM attribute or postMessage bridge
  return origFetch.call(this, input, init);
};
```

Bridge pattern: `window.postMessage` between MAIN and isolated worlds with strict origin check.

---

## Build and bundle size targets

| Artifact | Max size (gzip) |
|----------|-----------------|
| `content.js` | 80 KB |
| `background.js` | 30 KB |
| `detect.wasm` | 200 KB |
| ONNX model (optional download) | 5–15 MB (not in CRX) |

Use esbuild `treeShaking`, `minify`, split chunks — ONNX loaded async from `models/` folder.

---

## Edge enterprise compatibility

| Requirement | Support |
|-------------|---------|
| Chrome Web Store MV3 | Primary |
| Microsoft Edge | Same CRX, `edge://extensions` sideload or store |
| Group Policy `ExtensionInstallForcelist` | Provide stable extension ID post-publish |
| `managed_storage` (future) | Enterprise policy overrides popup tokens |

---

## Security review checklist (perf-related)

- [ ] No synchronous XMLHttpRequest
- [ ] No `eval()` of page scripts
- [ ] WASM from extension package only (SRI hash in manifest)
- [ ] postMessage origin validation for MAIN bridge
- [ ] Token vault cleared on `chrome.runtime.onSuspend` best-effort flush

---

## Cross-references

- Integration phases: [07_INTEGRATION_MASTER_PLAN.md](./07_INTEGRATION_MASTER_PLAN.md)
- Testing perf gates: [11_TESTING_QA_AND_ROLLOUT.md](./11_TESTING_QA_AND_ROLLOUT.md)
- Original extension spec: [`Plan/08_CHROME_EXTENSION_SPEC.md`](../../Plan/08_CHROME_EXTENSION_SPEC.md)
