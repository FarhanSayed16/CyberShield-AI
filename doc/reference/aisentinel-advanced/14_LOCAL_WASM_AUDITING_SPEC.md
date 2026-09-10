# 14 — Local WebAssembly AI Auditing: Full Implementation Spec

## Understanding the Runtime Options Before Choosing One

Before writing a single line of code, you need to understand the three execution environments available for running ML models inside a Chrome extension, because the wrong choice will either crash under memory constraints or produce unacceptably slow inference. Each environment has hard tradeoffs.

**Web Workers** are the simplest option — background threads that run JavaScript independently of the main thread. They have access to the full JavaScript heap, they can import scripts, and they never block the UI. The limitation is that they are terminated when the browser decides the background service worker is idle, which in Chrome's MV3 architecture means they can die after 30 seconds of inactivity. Loading a 67MB ONNX model takes 2–3 seconds, so if your worker gets killed between inferences, users will experience unpredictable latency spikes.

**Offscreen Documents** (Chrome MV3 API, available since Chrome 109) solve the persistence problem. An offscreen document is an invisible HTML page that the extension maintains in the background. Unlike service workers, it is not subject to the 30-second termination rule. You load the model into the offscreen document once, and it stays resident in memory for the entire browser session. The offscreen document communicates with the service worker via `chrome.runtime.sendMessage`, adding about 1–2ms of inter-process communication overhead per inference, which is completely acceptable.

**WebGPU** (available in Chrome 113+) is the GPU-accelerated option. For models larger than 100MB or for complex transformer architectures that benefit from parallelism, WebGPU can provide 5–10x speedup over CPU inference. However, WebGPU is only available in the offscreen document (not in service workers), it requires the user's system to have a compatible GPU with updated drivers, and it adds significant complexity to your error handling (you need CPU fallback paths). For the models we're using (quantized DistilBERT, ~67MB), CPU WebAssembly is fast enough — 80–150ms per inference — and far more reliable across a diverse enterprise hardware fleet.

**The decision:** Use an **offscreen document** running **Transformers.js** with **WASM backend** (CPU). Upgrade to WebGPU selectively in a Phase 2 iteration after you have telemetry on inference latency across your customer base.

---

## The Model Choice: What You're Running Locally

The right model for this use case is a **quantized DistilBERT fine-tuned for zero-shot text classification**, served through Transformers.js. DistilBERT is a distilled (smaller, faster) version of BERT that retains about 97% of the performance at 40% of the size and 60% of the inference time. The zero-shot classification pipeline means you do not need a custom-trained model for MVP — you can provide classification labels as natural language strings at inference time, and the model will assign probabilities accordingly.

The specific model is `Xenova/distilbert-base-uncased-mnli` (hosted on Hugging Face), which Transformers.js can download and cache in the browser's Cache API. In quantized (int8) form it is approximately 67MB. The first time a user triggers an inference, it downloads this model and caches it. Subsequent uses load from the local cache in under 200ms.

For production, you will want to fine-tune a smaller model on labeled enterprise prompt data. A fine-tuned `Xenova/distilbert-base-uncased` with a custom classifier head trained on 10,000 labeled prompts (safe vs. sensitive categories) will outperform zero-shot on your specific domain and can be reduced to around 25MB with quantization.

The classification labels we use for zero-shot:

```javascript
const SENSITIVITY_LABELS = [
  'contains personal identifying information',
  'contains API keys or credentials',
  'contains internal business strategy or financial data',
  'contains source code with secrets',
  'is a normal, safe technical or creative request',
];
```

The model assigns a probability to each label. You take the argmax (highest probability label) and optionally compute an entropy measure across the distribution to assess confidence.

---

## File: `extension/local-model/offscreen.html`

The offscreen document is a minimal HTML page. It exists purely as a JavaScript execution host — no visible UI, no DOM manipulation needed.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <!-- 
    This page is never visible to the user.
    It exists to host the Transformers.js model inference runtime
    as an offscreen document (Chrome MV3).
    Model inference runs here to avoid blocking the service worker
    and to maintain the model resident in memory between inferences.
  -->
</head>
<body>
  <script src="model-worker.js" type="module"></script>
</body>
</html>
```

---

## File: `extension/local-model/model-worker.js`

This script runs inside the offscreen document. It owns the model lifecycle: initial load, caching, inference, and graceful degradation if the model fails to load.

```javascript
// model-worker.js
// Runs inside the offscreen document.
// Manages the Transformers.js pipeline for local AI auditing.
// Communicates with the background service worker via chrome.runtime.onMessage.

'use strict';

// Transformers.js is loaded from a bundled copy (see note on bundling below)
// In development, you can load from CDN:
// import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// In production, bundle with webpack/rollup and import locally:
import { pipeline, env } from './lib/transformers.min.js';

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

// Tell Transformers.js to use local cache (browser Cache API)
// and not try to load from the CDN on every inference
env.localModelPath = '/models/';
env.allowRemoteModels = true; // Allow initial download; false after caching
env.useBrowserCache = true;   // Cache model in browser's Cache API

const MODEL_NAME = 'Xenova/distilbert-base-uncased-mnli';

// Classification labels — what we're asking the model to classify against
const SENSITIVITY_LABELS = [
  'contains personal identifying information',
  'contains API keys or credentials',
  'contains internal business strategy or financial data',
  'contains source code with secrets',
  'is a safe technical or creative request with no sensitive information',
];

// The "safe" label — if this is highest, the prompt is clean
const SAFE_LABEL = 'is a safe technical or creative request with no sensitive information';

// Confidence threshold: if highest label score < this, we say "uncertain"
// rather than making a low-confidence classification
const MIN_CONFIDENCE = 0.35;

// ─────────────────────────────────────────────────────────────────
// MODEL LIFECYCLE
// ─────────────────────────────────────────────────────────────────

let classifierPipeline = null;
let modelLoadState = 'unloaded'; // unloaded | loading | ready | failed
let loadError = null;

/**
 * Initialize the classification pipeline.
 * Downloads and caches the model on first call.
 * Subsequent calls return immediately from cache.
 * @returns {Promise<void>}
 */
async function loadModel() {
  if (modelLoadState === 'ready') return;
  if (modelLoadState === 'loading') {
    // Wait for the in-progress load to complete
    while (modelLoadState === 'loading') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  modelLoadState = 'loading';

  try {
    // Notify background that model is loading (for popup status display)
    chrome.runtime.sendMessage({ type: 'LOCAL_MODEL_LOADING' });

    classifierPipeline = await pipeline(
      'zero-shot-classification',
      MODEL_NAME,
      {
        // Use WASM backend (CPU) — most compatible across enterprise hardware
        backend: 'wasm',
        // Quantized model — smaller download, faster inference, minor accuracy tradeoff
        quantized: true,
        // Progress callback for loading UI
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            chrome.runtime.sendMessage({
              type: 'LOCAL_MODEL_DOWNLOAD_PROGRESS',
              loaded: progress.loaded,
              total: progress.total,
              percent: Math.round((progress.loaded / progress.total) * 100),
            });
          }
        },
      }
    );

    modelLoadState = 'ready';
    chrome.runtime.sendMessage({ type: 'LOCAL_MODEL_READY' });

  } catch (err) {
    modelLoadState = 'failed';
    loadError = err.message;
    chrome.runtime.sendMessage({
      type: 'LOCAL_MODEL_FAILED',
      error: err.message,
    });
  }
}

// Start loading immediately when offscreen document is created
// This way the model is warm before the first inference is needed
loadModel();

// ─────────────────────────────────────────────────────────────────
// INFERENCE
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AuditResult
 * @property {'safe'|'sensitive'|'critical'|'uncertain'} verdict
 * @property {string} topLabel   - The winning classification label
 * @property {number} confidence - Score for the winning label (0–1)
 * @property {string[]} triggered - List of non-safe labels with score > 0.3
 * @property {number} inferenceMs - How long inference took in milliseconds
 */

/**
 * Classify a prompt text for sensitivity.
 * @param {string} text
 * @returns {Promise<AuditResult>}
 */
async function classifyPrompt(text) {
  const startMs = performance.now();

  // Ensure model is loaded
  if (modelLoadState !== 'ready') {
    await loadModel();
  }

  // If model failed to load, return a graceful degradation result
  // that tells the caller to fall back to regex-based DLP
  if (modelLoadState === 'failed') {
    return {
      verdict: 'uncertain',
      topLabel: null,
      confidence: 0,
      triggered: [],
      inferenceMs: 0,
      fallbackReason: 'model_unavailable',
    };
  }

  try {
    // Truncate very long prompts to 512 tokens (DistilBERT's context window)
    // Rough heuristic: 1 token ≈ 4 characters
    const truncatedText = text.slice(0, 2048);

    const output = await classifierPipeline(truncatedText, SENSITIVITY_LABELS, {
      // multi_label: false means we get a proper distribution summing to 1
      // multi_label: true would allow multiple labels to score independently
      multi_label: false,
    });

    const inferenceMs = Math.round(performance.now() - startMs);

    // output.labels is sorted by score descending
    // output.scores is the corresponding probability array
    const labelScorePairs = output.labels.map((label, i) => ({
      label,
      score: output.scores[i],
    }));

    const topResult = labelScorePairs[0];
    const isSafe = topResult.label === SAFE_LABEL;
    const isLowConfidence = topResult.score < MIN_CONFIDENCE;

    // Find all non-safe labels with meaningful probability
    const triggered = labelScorePairs
      .filter(ls => ls.label !== SAFE_LABEL && ls.score > 0.3)
      .map(ls => ls.label);

    let verdict;
    if (isLowConfidence) {
      verdict = 'uncertain';
    } else if (isSafe) {
      verdict = 'safe';
    } else if (topResult.score > 0.75) {
      // High confidence in a sensitive label
      const isCredential = topResult.label.includes('API keys') || topResult.label.includes('credentials');
      verdict = isCredential ? 'critical' : 'sensitive';
    } else {
      verdict = 'sensitive';
    }

    return {
      verdict,
      topLabel: topResult.label,
      confidence: topResult.score,
      triggered,
      inferenceMs,
    };

  } catch (err) {
    return {
      verdict: 'uncertain',
      topLabel: null,
      confidence: 0,
      triggered: [],
      inferenceMs: Math.round(performance.now() - startMs),
      fallbackReason: `inference_error: ${err.message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// Receives inference requests from the background service worker
// ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'LOCAL_AUDIT_REQUEST') {
    const { requestId, text } = message;

    classifyPrompt(text)
      .then(result => {
        sendResponse({
          requestId,
          result,
          modelVersion: MODEL_NAME,
        });
      })
      .catch(err => {
        sendResponse({
          requestId,
          result: { verdict: 'uncertain', fallbackReason: err.message },
          modelVersion: MODEL_NAME,
        });
      });

    // Return true to signal that sendResponse will be called asynchronously
    return true;
  }

  if (message.type === 'LOCAL_MODEL_STATUS_REQUEST') {
    sendResponse({
      state: modelLoadState,
      error: loadError,
    });
    return false;
  }
});
```

---

## File: `extension/local-model/offscreen-manager.js`

This module runs in the background service worker and manages the lifecycle of the offscreen document, routes inference requests, and handles the fallback to server-side DLP when the local model is unavailable.

```javascript
// offscreen-manager.js
// Runs in the background service worker.
// Creates and manages the offscreen document that hosts the local model.
// Provides a clean async API for the rest of the extension to request local audits.

'use strict';

const OFFSCREEN_URL = chrome.runtime.getURL('local-model/offscreen.html');
const OFFSCREEN_REASON = 'WORKERS'; // Required by Chrome API

let offscreenCreating = false;

/**
 * Ensure the offscreen document exists.
 * Chrome may close it under memory pressure; this recreates it if needed.
 */
async function ensureOffscreenDocument() {
  // Check if it already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [OFFSCREEN_URL],
  });

  if (existingContexts.length > 0) return;

  // Prevent race condition if two requests arrive simultaneously
  if (offscreenCreating) {
    while (offscreenCreating) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return;
  }

  offscreenCreating = true;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [OFFSCREEN_REASON],
      justification: 'Run local ML model for privacy-preserving prompt classification',
    });
  } finally {
    offscreenCreating = false;
  }
}

// Request ID counter for matching async responses
let requestCounter = 0;
const pendingRequests = new Map();

// Listen for inference results from the offscreen document
chrome.runtime.onMessage.addListener((message) => {
  if (message.requestId && pendingRequests.has(message.requestId)) {
    const { resolve } = pendingRequests.get(message.requestId);
    pendingRequests.delete(message.requestId);
    resolve(message.result);
  }
});

/**
 * Run local AI audit on a prompt text.
 * Returns the audit result or a fallback "uncertain" result if the model
 * is unavailable (e.g., Chrome memory pressure killed the offscreen doc).
 *
 * @param {string} text - The prompt text to audit
 * @param {number} [timeoutMs=3000] - Max time to wait for inference
 * @returns {Promise<AuditResult>}
 */
export async function runLocalAudit(text, timeoutMs = 3000) {
  try {
    await ensureOffscreenDocument();
  } catch (_e) {
    // Failed to create offscreen document — return graceful fallback
    return { verdict: 'uncertain', fallbackReason: 'offscreen_unavailable' };
  }

  const requestId = `req_${++requestCounter}_${Date.now()}`;

  return new Promise((resolve) => {
    // Set up timeout so a slow/dead offscreen doesn't hang everything
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve({ verdict: 'uncertain', fallbackReason: 'inference_timeout' });
    }, timeoutMs);

    pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
    });

    chrome.runtime.sendMessage({
      type: 'LOCAL_AUDIT_REQUEST',
      requestId,
      text,
    });
  });
}

/**
 * Preload the model in the offscreen document so the first real
 * inference doesn't have a cold-start delay.
 * Call this at extension startup.
 */
export async function preloadModel() {
  try {
    await ensureOffscreenDocument();
    // The offscreen document starts loading the model automatically on creation
    // This function just ensures the document exists
  } catch (_e) {
    // Best-effort preload — fail silently
  }
}
```

---

## Integrating Local Audit Into the Event Pipeline

The local audit result augments the server-side DLP scan. Here is how the two work together in the content script event flow:

```javascript
// In background.js event handler — called when a PROMPT_CAPTURED message arrives

import { runLocalAudit } from './local-model/offscreen-manager.js';

async function handlePromptCapture(payload) {
  // Run local model and server DLP in parallel
  // Local model: semantic sensitivity classification (never sends text to server)
  // Server DLP: regex patterns, custom org patterns, compliance logging
  const [localResult, serverResult] = await Promise.allSettled([
    runLocalAudit(payload.prompt_text, 2500),  // 2.5s timeout
    sendEventToBackend(payload),                // Server DLP + logging
  ]);

  const audit = localResult.status === 'fulfilled' ? localResult.value : null;
  const serverEvent = serverResult.status === 'fulfilled' ? serverResult.value : null;

  // Combine results: if local model says critical but server says clean,
  // trust the local model (it has semantic understanding the regex lacks)
  const combinedRiskScore = computeCombinedRisk(audit, serverEvent);

  // If local audit says critical AND server also flags it, trigger JIT overlay
  if (audit?.verdict === 'critical' && (serverEvent?.risk_score || 0) > 40) {
    triggerJITOverlay({
      reason: 'local_model_critical',
      localVerdict: audit.verdict,
      localLabel: audit.topLabel,
      serverFindings: serverEvent?.findings || [],
      promptText: payload.prompt_text,
    });
  }

  return { audit, serverEvent, combinedRiskScore };
}

function computeCombinedRisk(localAudit, serverEvent) {
  const localScore = {
    safe: 0,
    uncertain: 20,
    sensitive: 60,
    critical: 90,
  }[localAudit?.verdict || 'uncertain'];

  const serverScore = serverEvent?.risk_score || 0;

  // Take the maximum — if either method says it's risky, treat it as risky
  return Math.max(localScore, serverScore);
}
```

---

## Bundling Transformers.js for the Extension

Transformers.js cannot be loaded directly from a CDN in an MV3 extension because of the extension's Content Security Policy. You must bundle it locally:

```bash
# In extension/local-model/ directory
npm init -y
npm install @xenova/transformers@2.17.2

# bundle with rollup
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs

# rollup.config.js:
# export default {
#   input: 'model-worker.js',
#   output: { file: 'dist/model-worker-bundle.js', format: 'iife' },
#   plugins: [nodeResolve(), commonjs()],
# };

npx rollup -c
```

The bundled output will be around 200KB of JavaScript plus the WASM file (~2MB) that Transformers.js ships with. Add these to your extension directory and reference the bundled file in offscreen.html.

---

## Backend Schema Addition: `local_audit_results`

```sql
-- Stores metadata about local model inference results for telemetry.
-- Text never stored here — only the classification outcome.
CREATE TABLE local_audit_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL,

    verdict         VARCHAR(20) NOT NULL,   -- safe | sensitive | critical | uncertain
    top_label       TEXT,
    confidence      NUMERIC(4,3),           -- 0.000–1.000
    inference_ms    INTEGER,
    model_version   VARCHAR(100),
    fallback_reason TEXT,                   -- null if inference succeeded

    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```
