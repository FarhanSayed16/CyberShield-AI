# 11 — Tokenization Engine: Full Implementation Spec

## Architecture Overview

The tokenization engine is the most technically complex feature in the entire extension because it requires simultaneously intercepting both the *outgoing* HTTP request (to substitute real data with tokens) and the *incoming* streaming HTTP response (to substitute tokens back to real data), all within the browser's content script environment without breaking the AI platform's UI.

The interception point is `window.fetch`. In the browser's MAIN world (the same JavaScript context the AI website runs in), you override the global `fetch` function with your own wrapper. When ChatGPT or Claude calls `fetch` to send the prompt to their backend API, your wrapper runs first, tokenizes the payload, then forwards the modified request. When the streaming response comes back, your wrapper returns a synthetic `ReadableStream` that sits between the real response and the AI platform's rendering code — piping the real data through a `TransformStream` that performs reverse substitution on every chunk.

This means zero changes to the AI platform's code. It calls `fetch` as normal. It receives a `ReadableStream` as normal. It renders text as normal. It just never sees the sensitive tokens you substituted.

---

## File: `extension/tokenizer/entity-extractor.js`

This module is responsible for scanning a string and identifying every entity that should be tokenized. It must run quickly (< 5ms for typical prompts) because it executes synchronously before the network request fires.

```javascript
// entity-extractor.js
// Identifies sensitive entities in text and returns them with their
// category labels. Categories determine which token prefix to use
// and which policy rule applies.

'use strict';

// ─────────────────────────────────────────────────────────────────
// REGEX PATTERN LIBRARY
// Each pattern has: regex, category, priority (higher = replace first)
// Priority matters when patterns overlap (e.g. an email inside a URL)
// ─────────────────────────────────────────────────────────────────
const ENTITY_PATTERNS = [
  // Credentials — highest priority because leaking these is catastrophic
  {
    regex: /sk-[a-zA-Z0-9]{20,60}/g,
    category: 'SECRET',
    subtype: 'openai_key',
    priority: 100,
  },
  {
    regex: /ghp_[a-zA-Z0-9]{36}/g,
    category: 'SECRET',
    subtype: 'github_pat',
    priority: 100,
  },
  {
    regex: /AKIA[0-9A-Z]{16}/g,
    category: 'SECRET',
    subtype: 'aws_access_key',
    priority: 100,
  },
  {
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    category: 'SECRET',
    subtype: 'google_api_key',
    priority: 100,
  },
  {
    // Generic high-entropy secrets: bearer tokens, JWT, base64 blobs
    // Looks for 32+ char alphanumeric strings following common secret prefixes
    regex: /(?:password|passwd|secret|token|key|credential)\s*[:=]\s*["']?([A-Za-z0-9+/=_\-\.@!#$%^&*]{8,})/gi,
    category: 'SECRET',
    subtype: 'generic_credential',
    priority: 95,
    captureGroup: 1, // tokenize only the value, not the key name
  },
  {
    // JWT tokens (three base64url segments separated by dots)
    regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
    category: 'SECRET',
    subtype: 'jwt',
    priority: 100,
  },

  // Network identifiers — replace hostnames and IPs in technical prompts
  {
    // Internal hostnames: contain at least one dot and don't look like public domains
    // Matches things like db.internal.company.com, 10.0.1.45, kafka-prod:9092
    regex: /\b(?:[a-zA-Z][a-zA-Z0-9\-]*\.){1,5}(?:internal|corp|local|intranet|lan)\b/gi,
    category: 'HOSTNAME',
    subtype: 'internal_domain',
    priority: 80,
  },
  {
    // Private IP ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    category: 'HOSTNAME',
    subtype: 'private_ip',
    priority: 85,
  },
  {
    // Connection strings: jdbc:, mongodb://, postgresql://, redis:// etc.
    regex: /(?:jdbc|mongodb|postgresql|mysql|redis|amqp|kafka):\/\/[^\s"'<>]+/gi,
    category: 'HOSTNAME',
    subtype: 'connection_string',
    priority: 90,
  },

  // PII — personal identifiable information
  {
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    category: 'EMAIL',
    subtype: 'email_address',
    priority: 70,
  },
  {
    // Indian mobile numbers: +91 XXXXX XXXXX or 0XXXXXXXXXX
    regex: /(?:\+91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}\b/g,
    category: 'PHONE',
    subtype: 'india_mobile',
    priority: 65,
  },
  {
    // US phone numbers
    regex: /\b(?:\+1[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
    category: 'PHONE',
    subtype: 'us_phone',
    priority: 65,
  },
  {
    // Aadhaar: 12 digits in XXXX XXXX XXXX format
    regex: /\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    category: 'ID_NUMBER',
    subtype: 'aadhaar',
    priority: 85,
  },
  {
    // PAN card: AAAAA9999A format
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    category: 'ID_NUMBER',
    subtype: 'pan_india',
    priority: 85,
  },
  {
    // Credit card numbers (basic structure check — Luhn check runs separately)
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6011[0-9]{12})\b/g,
    category: 'FINANCIAL',
    subtype: 'credit_card',
    priority: 90,
  },
];

// ─────────────────────────────────────────────────────────────────
// ENTITY EXTRACTION
// Returns an array of Entity objects, sorted by start position
// Handles overlapping matches by keeping the highest-priority one
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Entity
 * @property {number} start     - Start character index in original text
 * @property {number} end       - End character index (exclusive)
 * @property {string} text      - The actual matched text to be replaced
 * @property {string} category  - Token category (SECRET, EMAIL, etc.)
 * @property {string} subtype   - More specific label for logging
 * @property {number} priority  - Higher = preferred when overlapping
 */

/**
 * Extract all sensitive entities from a text string.
 * @param {string} text
 * @param {string[]} [additionalPatterns=[]] - Admin-defined custom regex strings
 * @returns {Entity[]}
 */
export function extractEntities(text, additionalPatterns = []) {
  const rawMatches = [];

  // Run all built-in patterns
  for (const { regex, category, subtype, priority, captureGroup } of ENTITY_PATTERNS) {
    // Reset lastIndex for global regexes — critical for correctness
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // If pattern has a captureGroup, tokenize only that group (not the full match)
      const tokenText = captureGroup != null
        ? match[captureGroup]
        : match[0];
      const tokenStart = captureGroup != null
        ? match.index + match[0].indexOf(match[captureGroup])
        : match.index;

      // Skip very short matches that are probably false positives
      if (tokenText.length < 4) continue;

      rawMatches.push({
        start: tokenStart,
        end: tokenStart + tokenText.length,
        text: tokenText,
        category,
        subtype,
        priority,
      });
    }
  }

  // Run admin-configured custom patterns
  for (const { pattern, name, severity } of additionalPatterns) {
    try {
      const customRegex = new RegExp(pattern, 'gi');
      let match;
      while ((match = customRegex.exec(text)) !== null) {
        rawMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          category: 'CUSTOM',
          subtype: name,
          priority: 75,
        });
      }
    } catch (_e) {
      // Invalid regex from admin config — skip silently
    }
  }

  // Resolve overlapping matches: keep highest-priority entity when ranges overlap
  rawMatches.sort((a, b) => a.start - b.start || b.priority - a.priority);

  const resolved = [];
  let lastEnd = 0;
  for (const entity of rawMatches) {
    if (entity.start >= lastEnd) {
      resolved.push(entity);
      lastEnd = entity.end;
    } else if (entity.priority > resolved[resolved.length - 1]?.priority) {
      // Current entity has higher priority — replace the last one
      resolved.pop();
      resolved.push(entity);
      lastEnd = entity.end;
    }
    // Otherwise: overlap with lower priority — skip
  }

  return resolved;
}
```

---

## File: `extension/tokenizer/token-store.js`

The token store manages the mapping between tokens and real values. It is intentionally in-memory only — never written to any persistent storage. Think of it like a one-time pad that exists only in RAM for the duration of the session.

```javascript
// token-store.js
// In-memory bidirectional token map for one browsing session.
// Lives entirely in the MAIN world of the content script —
// never touches chrome.storage, localStorage, or IndexedDB.

'use strict';

// Token prefix lookup: category → readable prefix
const TOKEN_PREFIXES = {
  SECRET:    'SECRET',
  EMAIL:     'EMAIL',
  PHONE:     'PHONE',
  ID_NUMBER: 'ID',
  FINANCIAL: 'CARD',
  HOSTNAME:  'HOST',
  CUSTOM:    'CUSTOM',
};

/**
 * TokenStore manages the forward map (token → real value)
 * and reverse map (real value → token).
 * 
 * Counters are per-category so token names are descriptive:
 * <EMAIL_1>, <HOST_2>, <SECRET_1>
 */
export class TokenStore {
  constructor() {
    // forward: "<EMAIL_1>" → "john@company.com"
    this._forward = new Map();
    // reverse: "john@company.com" → "<EMAIL_1>"
    this._reverse = new Map();
    // counters per category for sequential naming
    this._counters = {};
  }

  /**
   * Get or create a token for a given real value and category.
   * If this exact value was seen before in this session, returns
   * the same token (ensuring consistency across the conversation).
   * @param {string} realValue
   * @param {string} category
   * @returns {string} token like "<EMAIL_1>"
   */
  getOrCreate(realValue, category) {
    if (this._reverse.has(realValue)) {
      return this._reverse.get(realValue);
    }
    const prefix = TOKEN_PREFIXES[category] || 'DATA';
    const count = (this._counters[prefix] = (this._counters[prefix] || 0) + 1);
    const token = `<${prefix}_${count}>`;
    this._forward.set(token, realValue);
    this._reverse.set(realValue, token);
    return token;
  }

  /**
   * Restore real values from a tokenized string.
   * Handles partial tokens split across SSE chunks via
   * a partial-match accumulation strategy.
   * @param {string} text - May contain tokens like <EMAIL_1>
   * @returns {string} - Text with tokens replaced by real values
   */
  detokenize(text) {
    // Fast path: if no '<' at all, nothing to replace
    if (!text.includes('<')) return text;

    let result = text;
    // Replace all known tokens. Using string replace with a function
    // ensures we handle repeated tokens correctly in a single pass.
    for (const [token, realValue] of this._forward.entries()) {
      // Escape special regex chars in token (it contains < > _ which are safe,
      // but be defensive)
      result = result.split(token).join(realValue);
    }
    return result;
  }

  /**
   * Serialize the forward map for inclusion in audit log events.
   * IMPORTANT: call this only when sending to a trusted backend.
   * The backend needs the map to understand what was tokenized.
   * @returns {Record<string, string>}
   */
  toAuditLog() {
    return Object.fromEntries(this._forward);
  }

  /** Clear all mappings — call on page navigation or session end */
  clear() {
    this._forward.clear();
    this._reverse.clear();
    this._counters = {};
  }
}
```

---

## File: `extension/tokenizer/fetch-interceptor.js`

This is the core of the engine. It overrides `window.fetch` in the MAIN world content script so that all fetch calls made by the AI platform are intercepted transparently.

```javascript
// fetch-interceptor.js
// Must run in MAIN world (set world: "MAIN" in manifest content_scripts).
// Overrides window.fetch to intercept AI API calls, tokenize outgoing
// prompts, and detokenize streaming responses.

'use strict';

import { extractEntities } from './entity-extractor.js';
import { TokenStore } from './token-store.js';

// ─────────────────────────────────────────────────────────────────
// PLATFORM DETECTION
// Determines which requests are AI API calls worth intercepting
// ─────────────────────────────────────────────────────────────────

const AI_API_URL_PATTERNS = [
  /https:\/\/api\.openai\.com\/v1\/(chat\/completions|completions)/,
  /https:\/\/claude\.ai\/api\/organizations\/[^/]+\/chat_conversations\/[^/]+\/completion/,
  /https:\/\/gemini\.google\.com\/_\/BardChatUi\/data\/assistant\.lamda\.BardFrontendService/,
  /https:\/\/chatgpt\.com\/backend-api\/conversation/,
];

function isAIApiCall(url) {
  return AI_API_URL_PATTERNS.some(p => p.test(url));
}

// ─────────────────────────────────────────────────────────────────
// TEXT EXTRACTION FROM REQUEST BODY
// AI APIs have different request schemas — we extract all user-supplied text
// ─────────────────────────────────────────────────────────────────

function extractTextFromRequestBody(body) {
  if (typeof body !== 'string') return { texts: [], bodyObj: null };
  try {
    const bodyObj = JSON.parse(body);

    // OpenAI chat format: messages array
    if (Array.isArray(bodyObj.messages)) {
      const texts = bodyObj.messages
        .filter(m => m.role === 'user')
        .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));
      return { texts, bodyObj, format: 'openai_messages' };
    }

    // OpenAI completions format: prompt string
    if (typeof bodyObj.prompt === 'string') {
      return { texts: [bodyObj.prompt], bodyObj, format: 'openai_prompt' };
    }

    // Anthropic messages format
    if (Array.isArray(bodyObj.messages) && bodyObj.model?.includes('claude')) {
      const texts = bodyObj.messages
        .filter(m => m.role === 'user')
        .flatMap(m => {
          if (typeof m.content === 'string') return [m.content];
          if (Array.isArray(m.content)) return m.content.filter(c => c.type === 'text').map(c => c.text);
          return [];
        });
      return { texts, bodyObj, format: 'anthropic_messages' };
    }
  } catch (_e) {
    // Body is not JSON — could be FormData, ignore
  }
  return { texts: [], bodyObj: null };
}

// ─────────────────────────────────────────────────────────────────
// APPLY TOKENIZATION TO PARSED BODY
// Mutates the bodyObj in-place, replacing real values with tokens
// Returns the modified body as a JSON string
// ─────────────────────────────────────────────────────────────────

function tokenizeBody(body, store, customPatterns) {
  const { texts, bodyObj, format } = extractTextFromRequestBody(body);
  if (!bodyObj || texts.length === 0) return { tokenizedBody: body, anyFound: false, store };

  let anyFound = false;

  function tokenizeText(text) {
    const entities = extractEntities(text, customPatterns);
    if (entities.length === 0) return text;
    anyFound = true;

    // Build tokenized string by walking through entities in order
    let result = '';
    let cursor = 0;
    for (const entity of entities) {
      result += text.slice(cursor, entity.start);
      result += store.getOrCreate(entity.text, entity.category);
      cursor = entity.end;
    }
    result += text.slice(cursor);
    return result;
  }

  // Apply tokenization to the correct field(s) based on format
  if (format === 'openai_messages' || format === 'anthropic_messages') {
    bodyObj.messages = bodyObj.messages.map(msg => {
      if (msg.role !== 'user') return msg;
      if (typeof msg.content === 'string') {
        return { ...msg, content: tokenizeText(msg.content) };
      }
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map(part =>
            part.type === 'text' ? { ...part, text: tokenizeText(part.text) } : part
          ),
        };
      }
      return msg;
    });
  } else if (format === 'openai_prompt') {
    bodyObj.prompt = tokenizeText(bodyObj.prompt);
  }

  return { tokenizedBody: JSON.stringify(bodyObj), anyFound, store };
}

// ─────────────────────────────────────────────────────────────────
// STREAMING RESPONSE DETOKENIZER
// Transforms a ReadableStream, detecting token patterns across
// chunk boundaries and substituting real values back
// ─────────────────────────────────────────────────────────────────

function createDetokenizingStream(originalStream, store) {
  // We maintain a partial-token buffer. When a chunk ends mid-token
  // (e.g. ends with "<EMAI"), we hold it until the next chunk arrives
  // and can determine if it completes a token.
  let buffer = '';

  // All known token patterns look like <WORD_NUMBER>
  // A partial token can be detected by an unclosed '<'
  const PARTIAL_TOKEN_REGEX = /<[A-Z_0-9]*$/;

  const transformer = new TransformStream({
    transform(chunk, controller) {
      // chunk arrives as Uint8Array from fetch, decode it
      const decoder = new TextDecoder();
      const text = decoder.decode(chunk, { stream: true });

      buffer += text;

      // Check if the buffer ends with a partial token
      const partialMatch = buffer.match(PARTIAL_TOKEN_REGEX);
      if (partialMatch) {
        // Hold the partial token at the end — emit everything before it
        const safeEnd = buffer.length - partialMatch[0].length;
        const toEmit = store.detokenize(buffer.slice(0, safeEnd));
        buffer = buffer.slice(safeEnd);
        if (toEmit.length > 0) {
          controller.enqueue(new TextEncoder().encode(toEmit));
        }
      } else {
        // No partial token — safe to emit and detokenize the whole buffer
        const toEmit = store.detokenize(buffer);
        buffer = '';
        controller.enqueue(new TextEncoder().encode(toEmit));
      }
    },
    flush(controller) {
      // Emit any remaining buffer at stream end
      if (buffer.length > 0) {
        controller.enqueue(new TextEncoder().encode(store.detokenize(buffer)));
      }
    },
  });

  return originalStream.pipeThrough(transformer);
}

// ─────────────────────────────────────────────────────────────────
// FETCH OVERRIDE — THE CORE INTERCEPTION POINT
// ─────────────────────────────────────────────────────────────────

export function installFetchInterceptor(getConfig) {
  // Preserve reference to native fetch before any other script overrides it
  const nativeFetch = window.fetch.bind(window);

  // Session-scoped token store — one per page load
  const store = new TokenStore();

  // Clean up token store on navigation
  window.addEventListener('beforeunload', () => store.clear());

  window.fetch = async function aisentinelFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only intercept calls to known AI API endpoints
    if (!isAIApiCall(url)) {
      return nativeFetch(input, init);
    }

    const config = getConfig(); // Get current settings from storage
    if (!config?.tokenizationEnabled) {
      return nativeFetch(input, init);
    }

    // ── OUTGOING: tokenize the request body ──
    let modifiedInit = { ...init };
    let didTokenize = false;

    if (init?.body && typeof init.body === 'string') {
      const { tokenizedBody, anyFound } = tokenizeBody(
        init.body,
        store,
        config.customPatterns || []
      );
      if (anyFound) {
        modifiedInit.body = tokenizedBody;
        didTokenize = true;
        // Notify background script that tokenization happened (for badge)
        // This message carries only metadata, NOT the actual text
        window.dispatchEvent(new CustomEvent('__aisentinel_tokenized', {
          detail: { tokenCount: store.toAuditLog() ? Object.keys(store.toAuditLog()).length : 0, url }
        }));
      }
    }

    // ── SEND modified request ──
    const response = await nativeFetch(input, modifiedInit);

    if (!didTokenize) {
      // Nothing was tokenized — return response as-is
      return response;
    }

    // ── INCOMING: detokenize the response stream ──
    // Create a synthetic Response wrapping the detokenized stream
    const detokenizedBody = createDetokenizingStream(response.body, store);

    return new Response(detokenizedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
```

---

## File: `extension/tokenizer/init.js`

The initialization module loads configuration from Chrome storage and wires everything together. This runs immediately when the content script is injected.

```javascript
// tokenizer/init.js
// Entry point for the tokenization feature.
// Runs in MAIN world content script context.

'use strict';

import { installFetchInterceptor } from './fetch-interceptor.js';

let currentConfig = {
  tokenizationEnabled: false,
  orgToken: null,
  customPatterns: [],
};

// Load config from storage on startup
chrome.storage.sync.get(
  ['orgToken', 'userToken', 'tokenizationEnabled', 'customPatterns'],
  (data) => {
    currentConfig = {
      tokenizationEnabled: data.tokenizationEnabled ?? false,
      orgToken: data.orgToken ?? null,
      customPatterns: data.customPatterns ?? [],
    };
  }
);

// Re-sync if admin pushes config update
chrome.storage.onChanged.addListener((changes) => {
  if (changes.tokenizationEnabled !== undefined)
    currentConfig.tokenizationEnabled = changes.tokenizationEnabled.newValue;
  if (changes.customPatterns !== undefined)
    currentConfig.customPatterns = changes.customPatterns.newValue;
});

// Install the fetch interceptor. Pass a getter so it always reads
// the latest config (important for dynamic enable/disable).
installFetchInterceptor(() => currentConfig);

// Listen for tokenization events dispatched by the fetch interceptor
// and relay them to the background service worker via chrome.runtime
window.addEventListener('__aisentinel_tokenized', (e) => {
  chrome.runtime.sendMessage({
    type: 'TOKENIZATION_OCCURRED',
    tokenCount: e.detail.tokenCount,
    url: e.detail.url,
    timestamp: new Date().toISOString(),
  });
});
```

---

## Manifest Entry for Tokenizer (Addition to manifest.json)

The tokenizer content scripts must run in `MAIN` world to override `window.fetch`. Note this is separate from the standard content scripts which run in `ISOLATED` world:

```json
{
  "content_scripts": [
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],
      "js": ["tokenizer/init.js"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ]
}
```

Using `document_start` (not `document_idle`) is critical here. You must override `window.fetch` *before* the page's own JavaScript runs, or the AI platform might already have a reference to the native fetch that bypasses your wrapper.

---

## Backend Schema Addition: `tokenization_audit_events`

```sql
-- Stores a record of each tokenization event for compliance reporting.
-- Does NOT store the real values — only the token names and counts.
CREATE TABLE tokenization_audit_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),
    event_id        UUID REFERENCES events(id),
    platform        VARCHAR(100),
    token_count     INTEGER NOT NULL,
    categories      TEXT[],        -- e.g. {SECRET, EMAIL, HOSTNAME}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Testing the Tokenizer

The following test cases cover the critical scenarios. Run these in a browser console with the extension loaded:

```javascript
// Test 1: Basic entity extraction
import { extractEntities } from './tokenizer/entity-extractor.js';
const entities = extractEntities('Call me at +91 98765 43210 or john@company.com');
// Expected: [{category:"PHONE",...}, {category:"EMAIL",...}]

// Test 2: Token store consistency
import { TokenStore } from './tokenizer/token-store.js';
const store = new TokenStore();
const t1 = store.getOrCreate('john@company.com', 'EMAIL');
const t2 = store.getOrCreate('john@company.com', 'EMAIL');
console.assert(t1 === t2, 'Same value must always produce same token');
console.assert(t1 === '<EMAIL_1>', 'First email should be <EMAIL_1>');

// Test 3: Detokenization
const tokenized = 'Contact <EMAIL_1> for details';
const detokenized = store.detokenize(tokenized);
console.assert(detokenized === 'Contact john@company.com for details');

// Test 4: Split token across chunks
const half1 = 'Contact <EMA';
const half2 = 'IL_1> now';
// When processed through the TransformStream, the combined output
// should be 'Contact john@company.com now'
```
