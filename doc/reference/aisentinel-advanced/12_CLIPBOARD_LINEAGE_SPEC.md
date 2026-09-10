# 12 — Clipboard Lineage & Origin Tracking: Full Implementation Spec

## The Architecture in One Diagram

```
ALL PAGES (content script: clipboard-tracker.js)
     │
     │  User copies text on jira.company.com
     │  → copy event fires
     │  → hash the selected text (SHA-256, Web Crypto API)
     │  → send {hash, source_domain, sensitivity} to background
     ▼
BACKGROUND SERVICE WORKER (clipboard-registry.js)
     │
     │  Maintains ClipboardRegistry Map in memory
     │  {hash → {source_domain, sensitivity, timestamp, source_url}}
     │  Max 50 entries, LRU eviction, 2-hour TTL
     ▼
AI PAGES (content script: clipboard-enforcer.js)
     │
     │  User pastes into ChatGPT/Claude
     │  → paste event fires
     │  → hash the pasted text
     │  → ask background: "do you know this hash?"
     │  → background returns sensitivity level
     │  → if CRITICAL or HIGH: trigger JIT overlay or block
     ▼
BACKEND (POST /api/events with clipboard_lineage metadata)
```

---

## Conceptual Deep Dive Before the Code

### Why SHA-256 and Not Full-Text Storage

You might wonder why we hash the clipboard text instead of storing it directly — after all, the extension already captures prompt text for the main event log. The reason is **scope of collection**. The clipboard tracker runs on *all* pages, not just AI sites. If you stored the full text from every copy event, you would be collecting content from every website the employee visits — emails, personal banking, medical records — whether or not it ever reaches an AI tool. That is surveillance, not security, and it would make the extension legally problematic and ethically unacceptable.

SHA-256 hashing gives you the ability to *recognize* that two pieces of text are the same without ever retaining what the text *is*. The hash of a sensitive document and the hash of its pasted copy will match. But if you only have the hash, you cannot reconstruct the original text. This is the same principle used in password storage: you can verify a password without storing it.

### The Edit-Tolerance Problem and Why It Matters

One weakness of exact-match hashing is that users often paste and then edit text. They might copy 500 words from a Jira ticket, then delete the last sentence before submitting to ChatGPT. The resulting hash will be completely different from the copied hash — a perfect SHA-256 match will miss it.

For the MVP, we accept this limitation and document it clearly. The MVP protects against direct, unmodified pastes from sensitive sources, which covers the majority of accidental (non-malicious) leaks. Employees who are deliberately trying to evade detection will modify text anyway, and that threat model requires a different approach (the semantic local model in Feature 4).

The production extension can extend this with **fuzzy hashing** using a technique called **ssdeep** (Trigger-based, Context-Triggered Piecewise Hashing). ssdeep produces hashes that are *similar* for *similar* inputs — two documents that share 80% of their text will have ssdeep hashes with measurable similarity. A JavaScript port of ssdeep is available and could replace SHA-256 in a Phase 2 iteration.

### Domain Sensitivity Configuration

The sensitivity level of a domain is configured by the admin in the AISentinel dashboard. The configuration syncs to the extension via `chrome.storage.sync`. The structure is straightforward:

```javascript
{
  sensitiveDomains: [
    { pattern: "jira.acme.com",              level: "CRITICAL", label: "Engineering Tracker" },
    { pattern: "salesforce.com",             level: "CRITICAL", label: "CRM"                },
    { pattern: "*.acme.com",                 level: "HIGH",     label: "Internal Tools"     },
    { pattern: "github.com/acme-org/*",      level: "HIGH",     label: "Private Repos"      },
    { pattern: "notion.so",                  level: "MEDIUM",   label: "Notes"              },
    { pattern: "confluence.acme.com",        level: "MEDIUM",   label: "Wiki"               },
  ]
}
```

Patterns support simple wildcards (`*`) which are converted to regex at runtime. The domain-matching function checks the current page URL against every pattern and returns the highest matching sensitivity level.

---

## File: `extension/clipboard/domain-classifier.js`

```javascript
// domain-classifier.js
// Determines the sensitivity level of a URL based on admin configuration.
// Used both by the tracker (on copy) and enforcer (for UI decisions).

'use strict';

// Default sensitivity for domains not in the admin list
export const DEFAULT_SENSITIVITY = 'NONE';

// The configured list is loaded from chrome.storage.sync
let sensitiveDomainsConfig = [];

export function loadDomainConfig() {
  chrome.storage.sync.get(['sensitiveDomains'], (data) => {
    sensitiveDomainsConfig = data.sensitiveDomains || [];
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.sensitiveDomains) {
      sensitiveDomainsConfig = changes.sensitiveDomains.newValue || [];
    }
  });
}

/**
 * Convert a simple wildcard pattern to a RegExp.
 * e.g. "*.acme.com" → /^[^.]+\.acme\.com$/
 *      "github.com/acme-org/*" → /^github\.com\/acme-org\/.*$/
 * @param {string} pattern
 * @returns {RegExp}
 */
function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars
    .replace(/\\\*/g, '.*');               // unescape our * wildcard
  return new RegExp(`^${escaped}$`);
}

/**
 * Classify the sensitivity of a full URL.
 * Returns the highest-sensitivity match if multiple patterns match.
 * @param {string} url - Full URL string (e.g. "https://jira.acme.com/browse/SEC-123")
 * @returns {{ level: string, label: string }|null}
 */
export function classifyUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const hostAndPath = hostname + pathname;

    const SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    let bestMatch = null;

    for (const entry of sensitiveDomainsConfig) {
      const regex = patternToRegex(entry.pattern);
      if (regex.test(hostname) || regex.test(hostAndPath)) {
        const current = SEVERITY_ORDER[entry.level] || 0;
        const best = SEVERITY_ORDER[bestMatch?.level] || 0;
        if (current > best) {
          bestMatch = { level: entry.level, label: entry.label };
        }
      }
    }

    return bestMatch;
  } catch (_e) {
    return null;
  }
}
```

---

## File: `extension/clipboard/clipboard-tracker.js`

This content script runs on ALL pages. It listens for copy events, hashes the selection, and registers it with the background service worker. It is intentionally minimal to avoid impacting page performance.

```javascript
// clipboard-tracker.js
// Injected into ALL URLs to observe copy events.
// NEVER stores the actual copied text — only a SHA-256 hash.

'use strict';

import { loadDomainConfig, classifyUrl } from './domain-classifier.js';

loadDomainConfig();

/**
 * Compute SHA-256 hash of a string using the Web Crypto API.
 * Returns a hex string.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Listen for copy events at the document level (capture phase so
// we see it before any page script that might clear the selection)
document.addEventListener('copy', async (event) => {
  // Get the selected text at the moment of copy
  const selectedText = window.getSelection()?.toString() || '';

  // Ignore trivially short selections (< 20 chars) — not worth tracking
  if (selectedText.length < 20) return;

  // Classify the current page
  const classification = classifyUrl(window.location.href);

  // If this page has no sensitivity classification, don't bother registering
  // the clipboard entry — it's not a source we care about
  if (!classification || classification.level === 'NONE') return;

  try {
    const hash = await sha256(selectedText.trim());

    // Register this clipboard entry with the background worker
    // We send metadata only — NOT the actual text
    chrome.runtime.sendMessage({
      type: 'CLIPBOARD_COPY_REGISTERED',
      payload: {
        hash,
        // Store just the first 8 chars of the source URL path for debugging
        // without leaking the full sensitive URL
        sourceUrlPreview: window.location.origin + window.location.pathname.slice(0, 20),
        sourceDomain: window.location.hostname,
        sensitivity: classification.level,
        sensitivityLabel: classification.label,
        textLength: selectedText.length,
        timestamp: Date.now(),
      },
    });
  } catch (_e) {
    // Web Crypto can fail in very old contexts — fail silently
  }
}, true); // useCapture: true
```

---

## File: `extension/clipboard/clipboard-registry.js`

This module runs inside the background service worker. It maintains the in-memory registry of recently copied content. Because service workers can be suspended, we persist the registry to `session storage` (a Chrome MV3 API available in background service workers as of Chrome 102).

```javascript
// clipboard-registry.js
// Manages the in-memory (+ session-storage backed) clipboard origin registry.
// Runs in the background service worker.

'use strict';

const REGISTRY_KEY = 'clipboardRegistry';
const MAX_ENTRIES = 50;
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * @typedef {Object} ClipboardEntry
 * @property {string} hash
 * @property {string} sourceUrlPreview
 * @property {string} sourceDomain
 * @property {string} sensitivity       - CRITICAL | HIGH | MEDIUM | LOW
 * @property {string} sensitivityLabel  - Human-readable label
 * @property {number} textLength
 * @property {number} timestamp
 */

/**
 * Load the registry from session storage (survives service worker suspend/wake).
 * @returns {Promise<Map<string, ClipboardEntry>>}
 */
async function loadRegistry() {
  try {
    const result = await chrome.storage.session.get([REGISTRY_KEY]);
    const entries = result[REGISTRY_KEY] || [];
    // Filter out expired entries on load
    const now = Date.now();
    const valid = entries.filter(e => (now - e.timestamp) < TTL_MS);
    return new Map(valid.map(e => [e.hash, e]));
  } catch (_e) {
    return new Map();
  }
}

/**
 * Persist the registry back to session storage.
 * @param {Map<string, ClipboardEntry>} registry
 */
async function saveRegistry(registry) {
  try {
    const entries = Array.from(registry.values());
    await chrome.storage.session.set({ [REGISTRY_KEY]: entries });
  } catch (_e) {
    // Fail silently — registry is best-effort
  }
}

// ── PUBLIC API ──────────────────────────────────────────────────

/**
 * Register a new clipboard entry.
 * Implements LRU eviction when the registry is full.
 * @param {ClipboardEntry} entry
 */
export async function registerEntry(entry) {
  const registry = await loadRegistry();

  // If already registered (same hash), update timestamp (LRU refresh)
  if (registry.has(entry.hash)) {
    registry.get(entry.hash).timestamp = entry.timestamp;
    await saveRegistry(registry);
    return;
  }

  // Evict oldest entry if at capacity
  if (registry.size >= MAX_ENTRIES) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, val] of registry) {
      if (val.timestamp < oldestTime) {
        oldestTime = val.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) registry.delete(oldestKey);
  }

  registry.set(entry.hash, entry);
  await saveRegistry(registry);
}

/**
 * Look up a clipboard entry by hash.
 * Returns null if not found or expired.
 * @param {string} hash
 * @returns {Promise<ClipboardEntry|null>}
 */
export async function lookupEntry(hash) {
  const registry = await loadRegistry();
  const entry = registry.get(hash);
  if (!entry) return null;
  if ((Date.now() - entry.timestamp) > TTL_MS) {
    registry.delete(hash);
    await saveRegistry(registry);
    return null;
  }
  return entry;
}
```

---

## File: `extension/clipboard/clipboard-enforcer.js`

This content script runs only on AI platform pages. It listens for paste events, hashes the pasted text, queries the background for lineage, and triggers the appropriate policy action.

```javascript
// clipboard-enforcer.js
// Runs on AI platform pages (chatgpt.com, claude.ai, gemini.google.com).
// Intercepts paste events and enforces clipboard lineage policies.

'use strict';

// Action to take based on sensitivity level
const SENSITIVITY_ACTIONS = {
  CRITICAL: 'block_with_jit',       // Show JIT overlay, prevent default
  HIGH:     'warn_with_jit',        // Show JIT overlay, allow override
  MEDIUM:   'log_and_notify',       // Log silently, send to backend
  LOW:      'log_only',             // Log only
  NONE:     'pass',                 // No action
};

/**
 * Hash function — same as in clipboard-tracker.js.
 * Duplicated here to keep content scripts self-contained
 * (no module imports between ISOLATED world scripts).
 */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Query the background service worker for clipboard lineage of a given hash.
 * Returns the ClipboardEntry or null.
 */
function lookupClipboard(hash) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'CLIPBOARD_LOOKUP', hash },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response?.entry || null);
        }
      }
    );
  });
}

// ── PASTE INTERCEPTION ─────────────────────────────────────────

document.addEventListener('paste', async (event) => {
  // Read clipboard text from the event (not from navigator.clipboard,
  // which requires an async permission prompt)
  const pastedText = event.clipboardData?.getData('text/plain') || '';

  // Short pastes are not a lineage risk
  if (pastedText.length < 20) return;

  const hash = await sha256(pastedText.trim());
  const entry = await lookupClipboard(hash);

  if (!entry) return; // Unknown origin — no action

  const action = SENSITIVITY_ACTIONS[entry.sensitivity] || 'pass';

  if (action === 'pass') return;

  // For all non-pass actions: log the lineage event to backend
  chrome.runtime.sendMessage({
    type: 'CLIPBOARD_PASTE_DETECTED',
    payload: {
      hash,
      pasteLength: pastedText.length,
      sourceDomain: entry.sourceDomain,
      sensitivity: entry.sensitivity,
      sensitivityLabel: entry.sensitivityLabel,
      platform: getPlatformName(),
      action,
      timestamp: new Date().toISOString(),
    },
  });

  if (action === 'block_with_jit' || action === 'warn_with_jit') {
    // Prevent the paste from completing
    event.preventDefault();
    event.stopImmediatePropagation();

    // Trigger the JIT overlay (Feature 5) with clipboard context
    window.dispatchEvent(new CustomEvent('__aisentinel_jit_trigger', {
      detail: {
        triggerType: 'clipboard_lineage',
        sensitivity: entry.sensitivity,
        sourceLabel: entry.sensitivityLabel,
        sourceDomain: entry.sourceDomain,
        canOverride: action === 'warn_with_jit', // CRITICAL = no override
        pastedText,                               // Passed to JIT for display
        onOverride: () => {
          // Re-insert the pasted text after user confirms in JIT overlay
          const activeEl = document.activeElement;
          if (activeEl) {
            // Insert text at current cursor position
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(activeEl, pastedText);
              activeEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        },
      }
    }));
  }
}, true); // useCapture so we intercept before the AI platform handles it

function getPlatformName() {
  const host = window.location.hostname;
  if (host.includes('chatgpt') || host.includes('openai')) return 'chatgpt';
  if (host.includes('claude')) return 'claude';
  if (host.includes('gemini')) return 'gemini';
  return 'unknown';
}
```

---

## Background Service Worker Message Handler Addition

Add these cases to your main `background.js` message handler:

```javascript
// In background.js, inside chrome.runtime.onMessage.addListener:

import { registerEntry, lookupEntry } from './clipboard/clipboard-registry.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // ── Clipboard Lineage Messages ─────────────────────────────────

  if (message.type === 'CLIPBOARD_COPY_REGISTERED') {
    registerEntry(message.payload)
      .catch(() => {}); // Best-effort, no error propagation needed
    return false; // Synchronous return (no sendResponse needed)
  }

  if (message.type === 'CLIPBOARD_LOOKUP') {
    // Must return true to keep the message channel open for async response
    lookupEntry(message.hash)
      .then(entry => sendResponse({ entry }))
      .catch(() => sendResponse({ entry: null }));
    return true; // Async response
  }

  if (message.type === 'CLIPBOARD_PASTE_DETECTED') {
    // Forward to your existing event backend logging pipeline
    // This mirrors the event logging you do for prompt captures
    logClipboardEvent(message.payload);
    return false;
  }
});
```

---

## Backend Schema Addition: `clipboard_events`

```sql
CREATE TABLE clipboard_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),

    -- Source metadata (no actual text stored here either)
    source_domain   VARCHAR(255) NOT NULL,
    source_label    VARCHAR(255),      -- e.g. "Engineering Tracker"
    sensitivity     VARCHAR(20) NOT NULL,

    -- Paste context
    paste_length    INTEGER,
    paste_platform  VARCHAR(100),      -- chatgpt | claude | etc.
    action_taken    VARCHAR(50),       -- block_with_jit | warn_with_jit | log_only

    -- Compliance: was it overridden?
    jit_override    BOOLEAN DEFAULT FALSE,
    jit_reason      TEXT,              -- Employee's typed justification

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clipboard_org_time ON clipboard_events(org_id, created_at DESC);
CREATE INDEX idx_clipboard_sensitivity ON clipboard_events(org_id, sensitivity);
```

---

## Updated Manifest Permissions Required

```json
{
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The `<all_urls>` host permission is required for `clipboard-tracker.js` to inject into all pages. This will appear in the Chrome Web Store review process — include a clear privacy policy explaining that you collect only hashes (not text content) from copy events.
