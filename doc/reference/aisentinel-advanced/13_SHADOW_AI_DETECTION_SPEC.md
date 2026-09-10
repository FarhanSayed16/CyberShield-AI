# 13 — Dynamic Shadow AI UI Detection: Full Implementation Spec

## Why Signal Composition Beats Simple Matching

Before diving into code, it is worth understanding *why* a scoring approach — combining many weak signals — outperforms any single strong signal. This is the same insight behind spam filters, fraud detection systems, and intrusion detection. No single signal is reliable enough alone, but the combination is very reliable.

Consider: a page that has a large textarea *and* establishes a WebSocket connection *and* renders Markdown *and* has a URL path containing "/chat" — that is almost certainly an AI interface. Each signal alone produces too many false positives. A textarea appears on every contact form. A WebSocket appears on every real-time dashboard. Markdown rendering appears on technical documentation sites. But all four together appear almost exclusively on AI chat interfaces.

The architecture works in two stages. The **Observer** runs passively on every page, collecting signals over time and building a confidence score. The **Classifier** periodically reads the score and decides whether to apply policies. This separation means the observation logic never blocks the UI thread, and the classification only runs when needed.

---

## File: `extension/shadow-detector/signal-collectors.js`

Each signal collector is an independent unit that observes one specific behavioral indicator. They communicate through a shared `SignalBus` — a simple event emitter that decouples detection from policy enforcement.

```javascript
// signal-collectors.js
// Each collector observes one aspect of the page and emits scored signals.
// Collectors are designed to have < 1ms overhead in steady state.

'use strict';

// ─────────────────────────────────────────────────────────────────
// SIGNAL BUS
// Simple in-memory pub/sub. All collectors emit here.
// The classifier subscribes to accumulate scores.
// ─────────────────────────────────────────────────────────────────

const listeners = [];

export const SignalBus = {
  emit(signal) {
    for (const fn of listeners) fn(signal);
  },
  subscribe(fn) {
    listeners.push(fn);
  },
};

// A Signal object looks like:
// { type: string, weight: number, evidence: string }
// weight: how much this contributes to the AI confidence score (0–40)
// evidence: human-readable description for admin reporting

// ─────────────────────────────────────────────────────────────────
// COLLECTOR 1: Network Pattern Detector
// Observes fetch() and XHR calls for AI API URL patterns and
// SSE (Server-Sent Events) response types.
// Weight: very high (40) because SSE streaming is extremely distinctive.
// ─────────────────────────────────────────────────────────────────

export function installNetworkPatternCollector() {
  // Known AI API path patterns — partial match is enough
  const AI_PATH_PATTERNS = [
    /\/v1\/chat\/completions/,
    /\/v1\/completions/,
    /\/api\/generate/,
    /\/api\/chat/,
    /\/stream$/,
    /\/conversation/,
    /run\/predict/,    // Gradio pattern
    /\/run\/predict/,  // Hugging Face Spaces pattern
  ];

  const originalFetch = window.fetch;
  window.fetch = async function shadowDetectorFetch(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const response = await originalFetch.apply(this, args);

    // Check if this is an AI-like API call
    const isAiPath = AI_PATH_PATTERNS.some(p => p.test(url));
    const contentType = response.headers?.get('content-type') || '';
    const isSSE = contentType.includes('text/event-stream');
    const isStream = contentType.includes('stream');

    if (isSSE) {
      SignalBus.emit({
        type: 'SSE_STREAM_DETECTED',
        weight: 40,
        evidence: `SSE stream response from ${new URL(url, location.href).hostname}`,
      });
    } else if (isAiPath) {
      SignalBus.emit({
        type: 'AI_API_PATH',
        weight: 25,
        evidence: `API call to AI-like path: ${url.slice(0, 60)}`,
      });
    }

    return response;
  };

  // Also intercept WebSocket connections
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function shadowDetectorWS(url, ...rest) {
    const ws = new OriginalWebSocket(url, ...rest);
    let messageCount = 0;
    let smallMessageCount = 0;

    ws.addEventListener('message', (event) => {
      messageCount++;
      // Rapid small messages are a strong indicator of token streaming
      if (typeof event.data === 'string' && event.data.length < 200) {
        smallMessageCount++;
        if (smallMessageCount > 5 && smallMessageCount / messageCount > 0.7) {
          SignalBus.emit({
            type: 'WEBSOCKET_STREAMING',
            weight: 35,
            evidence: `WebSocket with ${smallMessageCount} small messages (streaming pattern)`,
          });
        }
      }
    });

    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
}

// ─────────────────────────────────────────────────────────────────
// COLLECTOR 2: DOM Structure Analyzer
// Looks for the characteristic layout of AI chat interfaces:
// [large text input] + [streaming output container]
// ─────────────────────────────────────────────────────────────────

export function installDOMStructureCollector() {
  let analyzed = false;

  function analyzeDOM() {
    if (analyzed) return;

    let score = 0;
    const evidence = [];

    // Signal: Large editable text area (chat input)
    // We define "large" as min-height > 40px or rows > 2
    const textareas = document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]');
    const largeInputs = Array.from(textareas).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 200 && rect.height > 40;
    });
    if (largeInputs.length > 0) {
      score += 20;
      evidence.push(`Large text input element (${largeInputs.length} found)`);
    }

    // Signal: Submit button adjacent to the text input
    const submitButtons = document.querySelectorAll(
      'button[type="submit"], button[aria-label*="send" i], button[aria-label*="submit" i], button[data-testid*="send" i]'
    );
    if (submitButtons.length > 0 && largeInputs.length > 0) {
      score += 15;
      evidence.push('Submit button adjacent to text input');
    }

    // Signal: Large output container that grows over time (will be checked by mutation observer)
    const outputContainers = document.querySelectorAll(
      '[class*="message" i], [class*="response" i], [class*="output" i], [class*="assistant" i], [data-message-role="assistant"]'
    );
    if (outputContainers.length > 0) {
      score += 15;
      evidence.push(`AI-like output containers (${outputContainers.length} found)`);
    }

    // Signal: Markdown rendering elements (code blocks, headers from parsed Markdown)
    const codeBlocks = document.querySelectorAll('pre code, .hljs, .highlight');
    const markdownHeaders = document.querySelectorAll('[class*="markdown" i] h1, [class*="markdown" i] h2, [class*="prose" i] h1');
    if (codeBlocks.length > 0 || markdownHeaders.length > 0) {
      score += 10;
      evidence.push('Markdown-rendered content detected');
    }

    if (score >= 20) {
      SignalBus.emit({
        type: 'DOM_AI_PATTERN',
        weight: Math.min(score, 40),
        evidence: evidence.join('; '),
      });
      analyzed = true;
    }
  }

  // Initial analysis after DOM is stable
  if (document.readyState === 'complete') {
    analyzeDOM();
  } else {
    window.addEventListener('load', analyzeDOM);
  }

  // Re-analyze after major DOM changes (SPAs load UI asynchronously)
  let mutationDebounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounce);
    mutationDebounce = setTimeout(analyzeDOM, 500);
  });
  observer.observe(document.body, { childList: true, subtree: false });
}

// ─────────────────────────────────────────────────────────────────
// COLLECTOR 3: JavaScript Environment Analyzer
// Checks for AI framework signatures in window object and scripts
// ─────────────────────────────────────────────────────────────────

export function installJSEnvironmentCollector() {
  // Check after page has fully loaded so all scripts have executed
  window.addEventListener('load', () => {
    const evidence = [];
    let weight = 0;

    // Check window for known AI UI library globals
    const AI_GLOBALS = [
      { name: 'marked', label: 'Marked.js (Markdown renderer)' },
      { name: 'hljs', label: 'Highlight.js (code syntax)' },
      { name: 'Gradio', label: 'Gradio (ML UI framework)' },
      { name: '__GRADIO_INTERFACE__', label: 'Gradio interface' },
      { name: 'streamlit', label: 'Streamlit app' },
    ];

    for (const { name, label } of AI_GLOBALS) {
      if (window[name] !== undefined) {
        weight += 10;
        evidence.push(label);
      }
    }

    // Check for React or Svelte with AI-related component names in __reactFiber
    // This is heuristic and fragile — lower weight
    const fiberKeys = Object.keys(window).filter(k => k.startsWith('__reactFiber'));
    if (fiberKeys.length > 0) {
      // React app — not definitive, but combined with other signals is meaningful
      weight += 5;
      evidence.push('React application detected');
    }

    // Check loaded script URLs for AI-related hostnames
    const scripts = Array.from(document.scripts);
    const aiScriptPatterns = [
      /huggingface\.co/,
      /gradio\.app/,
      /openai\.com/,
      /anthropic\.com/,
      /langchain/,
    ];
    for (const script of scripts) {
      if (aiScriptPatterns.some(p => p.test(script.src))) {
        weight += 15;
        evidence.push(`AI provider script: ${script.src.slice(0, 50)}`);
        break; // One match is enough
      }
    }

    if (weight >= 10) {
      SignalBus.emit({
        type: 'JS_ENV_AI_PATTERN',
        weight: Math.min(weight, 25),
        evidence: evidence.join('; '),
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// COLLECTOR 4: URL Pattern Analyzer
// Low-weight signal but easy to collect — checks URL path for AI patterns
// ─────────────────────────────────────────────────────────────────

export function installURLPatternCollector() {
  const AI_URL_PATTERNS = [
    /\/(chat|playground|generate|completions|inference|assistant|copilot)\b/i,
    /\?model=/,
    /\/spaces\//,   // Hugging Face Spaces
    /\/demos?\//,   // ML demo URLs
  ];

  const url = window.location.href;
  const matchedPatterns = AI_URL_PATTERNS.filter(p => p.test(url));

  if (matchedPatterns.length > 0) {
    SignalBus.emit({
      type: 'URL_AI_PATTERN',
      weight: 10 * matchedPatterns.length,
      evidence: `URL matches ${matchedPatterns.length} AI pattern(s): ${url.slice(0, 80)}`,
    });
  }
}
```

---

## File: `extension/shadow-detector/classifier.js`

The classifier accumulates signals from the `SignalBus` and decides whether to apply policies to the current page.

```javascript
// classifier.js
// Accumulates weighted signals and triggers policy application
// when the confidence score crosses defined thresholds.

'use strict';

import { SignalBus } from './signal-collectors.js';

const POLICY_THRESHOLD = 60;     // Apply safety policies
const REPORT_THRESHOLD = 75;     // Report as unknown AI tool to admin

// Known platforms that are already handled by explicit content scripts
// (we don't need to dynamically detect these — we already cover them)
const KNOWN_PLATFORMS = new Set([
  'chat.openai.com',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
]);

// Don't waste cycles on obviously irrelevant pages
const EXCLUDED_DOMAINS = new Set([
  'google.com', 'youtube.com', 'github.com', 'twitter.com',
  'stackoverflow.com', 'reddit.com', 'linkedin.com',
]);

export class ShadowAIClassifier {
  constructor() {
    this.score = 0;
    this.signals = [];
    this.policiesApplied = false;
    this.reported = false;
    this.hostname = window.location.hostname;

    // Bail out immediately for known platforms and excluded domains
    if (KNOWN_PLATFORMS.has(this.hostname)) {
      this.disabled = true;
      return;
    }
    if (EXCLUDED_DOMAINS.has(this.hostname.replace('www.', ''))) {
      this.disabled = true;
      return;
    }

    // Subscribe to the signal bus
    SignalBus.subscribe(this._onSignal.bind(this));
  }

  _onSignal(signal) {
    if (this.disabled) return;

    this.signals.push(signal);
    this.score += signal.weight;

    this._evaluate();
  }

  _evaluate() {
    if (this.score >= POLICY_THRESHOLD && !this.policiesApplied) {
      this.policiesApplied = true;
      this._applyPolicies();
    }

    if (this.score >= REPORT_THRESHOLD && !this.reported) {
      this.reported = true;
      this._reportUnknownAI();
    }
  }

  /**
   * Apply the standard AISentinel policies to this page.
   * Dispatches a custom event that the main content.js listener handles —
   * this keeps the classifier decoupled from the specific policy UI.
   */
  _applyPolicies() {
    window.dispatchEvent(new CustomEvent('__aisentinel_shadow_ai_detected', {
      detail: {
        score: this.score,
        signals: this.signals,
        hostname: this.hostname,
      },
    }));

    // Tell background to start treating this tab like an AI tab
    chrome.runtime.sendMessage({
      type: 'SHADOW_AI_PAGE_DETECTED',
      payload: {
        url: window.location.href,
        hostname: this.hostname,
        score: this.score,
        signals: this.signals.map(s => ({ type: s.type, weight: s.weight })),
      },
    });
  }

  /**
   * Report an unknown AI tool to the admin dashboard.
   * Only fires once per page load, and only for high-confidence detections.
   */
  _reportUnknownAI() {
    chrome.runtime.sendMessage({
      type: 'UNKNOWN_AI_TOOL_DISCOVERED',
      payload: {
        url: window.location.href,
        hostname: this.hostname,
        score: this.score,
        topSignals: this.signals
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map(s => s.evidence),
        discoveredAt: new Date().toISOString(),
      },
    });
  }
}
```

---

## File: `extension/shadow-detector/init.js`

The initialization module wires up all collectors and the classifier for pages where dynamic detection is active.

```javascript
// shadow-detector/init.js
// Runs on ALL_URLS to detect unknown AI interfaces.
// Must be in MAIN world to intercept fetch/WebSocket.

'use strict';

import {
  installNetworkPatternCollector,
  installDOMStructureCollector,
  installJSEnvironmentCollector,
  installURLPatternCollector,
} from './signal-collectors.js';
import { ShadowAIClassifier } from './classifier.js';

// Create the classifier first (subscribes to SignalBus)
const classifier = new ShadowAIClassifier();

// If classifier is disabled (known platform), skip everything
if (!classifier.disabled) {
  // Install all signal collectors
  installURLPatternCollector();     // Synchronous — runs immediately
  installDOMStructureCollector();   // Async — waits for DOM
  installJSEnvironmentCollector();  // Async — waits for window.load
  installNetworkPatternCollector(); // Async — observes future requests
}

// When shadow AI is detected, activate the standard prompt monitoring
// as if this were a known AI platform
window.addEventListener('__aisentinel_shadow_ai_detected', () => {
  // Dynamically activate the same prompt interception used for known platforms
  // by importing and running the main content.js logic
  import('../content.js').then(module => {
    module.activateForPlatform('shadow_ai', window.location.hostname);
  }).catch(() => {});
});
```

---

## Backend Schema Addition: `discovered_ai_tools`

This table allows admins to see what unknown AI tools were discovered and decide whether to formally add them to the known platform list or block them.

```sql
CREATE TABLE discovered_ai_tools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),

    hostname        VARCHAR(255) NOT NULL,
    full_url        TEXT,
    confidence_score INTEGER NOT NULL,

    top_signals     JSONB,    -- [{type: "SSE_STREAM_DETECTED", weight: 40, evidence: "..."}, ...]

    -- Admin review fields
    status          VARCHAR(50) DEFAULT 'pending',   -- pending | approved | blocked | ignored
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    admin_note      TEXT,

    first_seen_at   TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
    detection_count INTEGER DEFAULT 1,

    UNIQUE(org_id, hostname)
);

CREATE INDEX idx_discovered_tools_org ON discovered_ai_tools(org_id, status);
```

---

## Dashboard Addition: Discovered AI Tools Page

In the admin dashboard, add a new **"Shadow AI"** section showing:

A table of discovered unknown AI tools with columns for hostname, confidence score, first seen date, number of employees who used it, and admin review status. Admins can mark tools as "approved" (automatically added to the safe list), "blocked" (extension will prevent usage), or "ignored" (stop reporting this one). This table is what transforms shadow AI from a threat into a managed inventory, which is exactly the story compliance teams want to tell auditors.
