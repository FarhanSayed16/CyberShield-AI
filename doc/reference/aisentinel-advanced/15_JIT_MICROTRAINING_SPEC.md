# 15 — Just-In-Time (JIT) Micro-Training Overlay: Full Implementation Spec

## The Design Philosophy Before Any Code

The JIT overlay is the one feature in the entire extension where the design *philosophy* matters more than the implementation details. Get the design wrong and you build resentment; get it right and you build a security culture. So before any code, let's think carefully about what makes this feature work psychologically.

The failure mode of most security friction is what behavioral economists call "alarm fatigue" — when warnings are too frequent, too harsh, or too uniform, humans learn to dismiss them without reading. The classic example is car alarm sounds: everyone ignores them because they fire constantly for no real reason. A security overlay that blocks work every time someone types a company name in a prompt will be disabled, uninstalled, or worked around within a week. The design must be *calibrated*.

Three principles govern the JIT overlay design.

**Principle 1 — Proportional friction.** The level of disruption must match the level of risk. A CRITICAL finding (API key in a prompt) gets a hard stop requiring the employee to type a justification. A MEDIUM finding (an email address in an example) gets a 3-second educational tooltip that doesn't block submission. LOW findings get nothing visible — just a silent log entry. Most employees will almost never see the hard overlay; only genuinely risky actions trigger it.

**Principle 2 — Instructive, not accusatory.** Every message in the overlay is framed as information rather than accusation. Not "You are about to leak confidential data" but "This prompt appears to contain a credential. Credentials sent to AI tools may be logged by the provider." The employee is treated as an intelligent adult who made an oversight, not a security threat. This framing both reduces resentment and — crucially — is more legally defensible if challenged by an employee union or labor board.

**Principle 3 — Adaptive behavior.** The first time an employee sees a warning for a given finding type, they get full educational context — what was detected, why it's risky, and what the safe alternative is. The second time, they get a shorter version. The fifth time, they get "You've seen this before. Confirm or cancel." This respects that experienced users do not need to be re-educated, while ensuring first-timers get genuine learning.

---

## The Four Overlay States

The overlay has four distinct visual states, each triggered by a different risk level:

**State 1 — Silent Toast (LOW risk):** A small, non-blocking notification that appears in the corner of the screen for 4 seconds then disappears. The employee can keep working without any interaction required. It says something like "FYI: This prompt may contain email addresses." No block, no friction.

**State 2 — Education Banner (MEDIUM risk):** A non-blocking yellow banner that appears above the submit button for the current conversation. It explains what was detected with a link to the security policy. The employee can dismiss it by clicking X or proceed by clicking Submit (which was never blocked). It logs that the warning was seen.

**State 3 — Confirmation Overlay (HIGH risk):** A modal overlay that blurs the AI chat page. The employee must actively click "I've reviewed this" to proceed. No typing required — just reading and clicking. The overlay auto-dismisses after 15 seconds if the employee does nothing (a timeout-based escape that prevents complete workflow blocking while still introducing conscious deliberation).

**State 4 — Justification Overlay (CRITICAL risk):** A modal overlay with no auto-dismiss, no bypass button. The employee must type at least 20 characters of justification in a text box and click "Submit with explanation." The justification is logged as part of the compliance audit trail. They can also click "Cancel and review my prompt" which closes the overlay without submitting.

---

## The Adaptive Learning State

Each employee has a per-finding-type counter stored in `chrome.storage.local`. The counter tracks how many times they have seen each type of warning. The overlay component reads this counter and adjusts its verbosity accordingly:

When the counter is 0 (first time), the full educational message is shown including background explanation, risk description, and suggested alternatives. When the counter is 1–4, a shorter summary is shown. When the counter is 5 or more, only the core message and action buttons are shown. This counter never resets automatically — employees who have learned the lesson don't keep getting re-taught it.

---

## File: `extension/jit/jit-overlay.css`

The overlay is injected as a Shadow DOM to guarantee that the AI platform's CSS cannot interfere with it. All styles are self-contained.

```css
/* jit-overlay.css — injected into Shadow DOM */
/* This is the complete styling for all four overlay states */

:host {
  /* The shadow host itself is a fixed overlay that covers the viewport */
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483647; /* Max z-index to sit above everything */
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* The semi-transparent backdrop blur */
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* The card container */
.card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 460px;
  max-width: calc(100vw - 40px);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* Severity-colored header strip */
.card-header {
  padding: 20px 24px 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.card-header.severity-critical { background: #fff1f0; border-bottom: 2px solid #ff4d4f; }
.card-header.severity-high     { background: #fff7e6; border-bottom: 2px solid #fa8c16; }
.card-header.severity-medium   { background: #fffbe6; border-bottom: 2px solid #fadb14; }

/* Icon */
.icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.severity-critical .icon { background: #fff1f0; }
.severity-high .icon     { background: #fff7e6; }
.severity-medium .icon   { background: #fffbe6; }

/* Title and subtitle */
.title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
  line-height: 1.3;
}
.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

/* Body content */
.card-body {
  padding: 16px 24px;
}

/* Detected data highlight box */
.detection-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
}
.severity-critical .detection-box { border-left-color: #ff4d4f; }
.severity-high .detection-box     { border-left-color: #fa8c16; }
.severity-medium .detection-box   { border-left-color: #fadb14; }

.detection-box .finding-label {
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

/* Educational text */
.education-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 14px;
}

/* Suggestion box */
.suggestion {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: #166534;
  margin-bottom: 16px;
  line-height: 1.5;
}
.suggestion strong { display: block; margin-bottom: 3px; }

/* Justification textarea */
.justification-area {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  color: #111827;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s;
}
.justification-area:focus {
  border-color: #3b5bdb;
  box-shadow: 0 0 0 3px rgba(59, 91, 219, 0.1);
}
.justification-area::placeholder { color: #9ca3af; }
.char-count {
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
  margin-top: 4px;
  margin-bottom: 14px;
}
.char-count.insufficient { color: #ef4444; }

/* Footer with action buttons */
.card-footer {
  padding: 0 24px 20px;
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, transform 0.1s;
  width: 100%;
}
.btn:hover  { opacity: 0.9; }
.btn:active { transform: scale(0.98); }

.btn-danger   { background: #ff4d4f; color: #fff; }
.btn-warning  { background: #fa8c16; color: #fff; }
.btn-primary  { background: #3b5bdb; color: #fff; }
.btn-ghost    {
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* Countdown timer strip */
.countdown-bar {
  height: 3px;
  background: #e5e7eb;
  overflow: hidden;
}
.countdown-bar-fill {
  height: 100%;
  background: #3b5bdb;
  transition: width 1s linear;
}

/* Toast notification (State 1) */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  max-width: 320px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: slideInRight 0.2s ease-out;
  z-index: 2147483647;
}
@keyframes slideInRight {
  from { transform: translateX(30px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

---

## File: `extension/jit/jit-overlay.js`

This is the main overlay component. It creates a Shadow DOM container, injects styles and markup, handles all user interactions, and dispatches the outcome back to the caller.

```javascript
// jit-overlay.js
// Creates and manages the JIT overlay UI.
// Called by content scripts when a policy trigger fires.
// Returns a Promise that resolves to {decision: 'proceed'|'cancel', justification?: string}

'use strict';

// ─────────────────────────────────────────────────────────────────
// EDUCATIONAL CONTENT LIBRARY
// Maps finding types to human-readable explanations and suggestions
// ─────────────────────────────────────────────────────────────────

const EDUCATION_CONTENT = {
  API_KEY: {
    icon: '🔑',
    title: 'API Key or Credential Detected',
    short: 'An API key appears to be in your prompt.',
    full: `API keys are like passwords for your systems. When sent to an AI provider, they may be logged in server access logs, used in abuse detection systems, or retained as training data in some configurations. A leaked API key can lead to unauthorized API usage, unexpected billing, or data breaches.`,
    suggestion: 'Remove the key from your prompt. Instead, describe what the key format looks like, or ask the AI to generate a placeholder key for documentation purposes.',
  },
  SECRET: {
    icon: '🔐',
    title: 'Credential or Secret Detected',
    short: 'A password or secret appears to be in your prompt.',
    full: `Passwords and secrets sent to AI tools may be retained in conversation logs. Even if the provider has strong data policies, your security team cannot control or audit that data once it leaves your organization.`,
    suggestion: 'Replace the actual credential with a placeholder like [PASSWORD_HERE] or describe the format without including the real value.',
  },
  EMAIL: {
    icon: '✉️',
    title: 'Email Addresses Detected',
    short: 'Email addresses were found in this prompt.',
    full: `Under GDPR and India's DPDP Act, email addresses are personal data. Sharing them with AI providers may constitute data processing that requires a legal basis and potentially a Data Processing Agreement with the provider.`,
    suggestion: 'Replace real email addresses with example ones like user@example.com, or ask your admin if this provider is covered under your organization's DPA.',
  },
  FINANCIAL: {
    icon: '💳',
    title: 'Financial Data Detected',
    short: 'This prompt appears to contain financial information.',
    full: `Payment card numbers and financial account details are regulated under PCI-DSS and potentially other frameworks. Sending them to AI tools is almost certainly a compliance violation.`,
    suggestion: 'Never send real financial data to AI tools. Use synthetic or masked versions for testing.',
  },
  HOSTNAME: {
    icon: '🖥️',
    title: 'Internal Infrastructure Details Detected',
    short: 'Internal hostnames or connection strings were found.',
    full: `Internal server hostnames, database connection strings, and IP addresses map your internal network topology. This information could help an attacker who gains access to AI provider logs target your infrastructure.`,
    suggestion: 'Replace specific hostnames with generic labels like db.internal or use fictional domains like db.example-corp.com.',
  },
  CLIPBOARD_LINEAGE: {
    icon: '📋',
    title: 'Sensitive Copied Content Detected',
    short: 'This text was copied from a sensitive internal source.',
    full: `You recently copied this content from {sourceLabel} ({sourceDomain}), which is classified as sensitive by your organization's security policy. Pasting it into an AI tool may expose confidential information to an external service.`,
    suggestion: 'Consider whether the AI genuinely needs this specific data, or whether you can rephrase your question without including the sensitive content.',
  },
  DEFAULT: {
    icon: '⚠️',
    title: 'Potentially Sensitive Content Detected',
    short: 'This prompt may contain sensitive information.',
    full: `Your organization has a policy about the types of data that can be sent to external AI tools. Please review your prompt before proceeding.`,
    suggestion: 'Review the highlighted content and consider whether it is necessary to include.',
  },
};

// ─────────────────────────────────────────────────────────────────
// ADAPTIVE LEARNING STORE
// Tracks how many times each employee has seen each warning type
// ─────────────────────────────────────────────────────────────────

async function getWarningCount(findingType) {
  return new Promise((resolve) => {
    const key = `jit_count_${findingType}`;
    chrome.storage.local.get([key], (data) => resolve(data[key] || 0));
  });
}

async function incrementWarningCount(findingType) {
  const key = `jit_count_${findingType}`;
  const count = await getWarningCount(findingType);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: count + 1 }, resolve);
  });
}

// ─────────────────────────────────────────────────────────────────
// MAIN OVERLAY CLASS
// ─────────────────────────────────────────────────────────────────

export class JITOverlay {
  /**
   * @param {Object} options
   * @param {string}   options.severity         - CRITICAL | HIGH | MEDIUM | LOW
   * @param {string}   options.findingType      - API_KEY | EMAIL | CLIPBOARD_LINEAGE | etc.
   * @param {string[]} options.detectedItems    - Redacted list of what was found
   * @param {boolean}  options.canOverride      - If false, no "proceed" button shown
   * @param {string}   [options.sourceLabel]    - For clipboard lineage: source system name
   * @param {string}   [options.sourceDomain]   - For clipboard lineage: source domain
   * @param {Function} options.onDecision       - Called with {decision, justification}
   */
  constructor(options) {
    this.options = options;
    this.hostEl = null;
    this.shadowRoot = null;
    this.countdownInterval = null;
    this.warningCount = 0;
  }

  async show() {
    // Prevent double-mounting
    if (document.getElementById('__aisentinel_jit_host')) return;

    this.warningCount = await getWarningCount(this.options.findingType);
    await incrementWarningCount(this.options.findingType);

    this._mount();
    this._render();
    this._bindEvents();

    if (this.options.severity === 'HIGH') {
      this._startCountdown(15); // Auto-dismiss in 15s for HIGH (not CRITICAL)
    }
  }

  _mount() {
    // Create the shadow host element
    this.hostEl = document.createElement('div');
    this.hostEl.id = '__aisentinel_jit_host';

    // Attach a Shadow DOM — style isolation from the page
    this.shadowRoot = this.hostEl.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(this.hostEl);
  }

  _render() {
    const { severity, findingType, detectedItems, canOverride, sourceLabel, sourceDomain } = this.options;
    const content = EDUCATION_CONTENT[findingType] || EDUCATION_CONTENT.DEFAULT;
    const isCritical = severity === 'CRITICAL';
    const severityClass = `severity-${severity.toLowerCase()}`;
    const isVerbose = this.warningCount < 2; // Show full education for first two encounters
    const isExperienced = this.warningCount >= 5;

    // Substitute template variables in education text
    let fullText = content.full
      .replace('{sourceLabel}', sourceLabel || 'an internal system')
      .replace('{sourceDomain}', sourceDomain || 'your intranet');

    // Build detected items list
    const detectedHTML = detectedItems.length > 0
      ? `<span class="finding-label">Detected</span>${detectedItems.map(item =>
          `<code style="background:#fee2e2;padding:1px 4px;border-radius:3px;font-size:11px;">${item}</code>`
        ).join(' ')}`
      : `<span class="finding-label">Type</span><strong>${content.title}</strong>`;

    // Render the full HTML structure into shadow DOM
    this.shadowRoot.innerHTML = `
      <style>
        /* Inline the CSS — we can't link to external files from Shadow DOM */
        ${this._getInlineCSS()}
      </style>

      ${isCritical ? '<div class="backdrop"></div>' : ''}

      <div class="card ${severityClass}" role="dialog" aria-modal="true" aria-labelledby="jit-title">
        ${isCritical ? '' : '<div class="countdown-bar"><div class="countdown-bar-fill" id="countdown-fill" style="width:100%"></div></div>'}

        <div class="card-header ${severityClass}">
          <div class="icon">${content.icon}</div>
          <div>
            <p class="title" id="jit-title">${content.title}</p>
            <p class="subtitle">${isExperienced ? content.short : (isCritical ? content.short : content.short)}</p>
          </div>
        </div>

        <div class="card-body">
          <div class="detection-box ${severityClass}">
            ${detectedHTML}
          </div>

          ${isVerbose && !isExperienced ? `
            <p class="education-text">${fullText}</p>
            <div class="suggestion">
              <strong>💡 Safer approach</strong>
              ${content.suggestion}
            </div>
          ` : ''}

          ${isCritical ? `
            <p class="education-text" style="font-size:13px;margin-bottom:8px;">
              Please explain why this data is necessary for this AI request. 
              This will be logged for your security team.
            </p>
            <textarea
              class="justification-area"
              id="justification-input"
              placeholder="Example: This is test/dummy data, not real production credentials..."
              maxlength="500"
            ></textarea>
            <p class="char-count insufficient" id="char-count">
              0 / 20 characters minimum
            </p>
          ` : ''}
        </div>

        <div class="card-footer">
          ${canOverride !== false ? `
            <button class="btn ${isCritical ? 'btn-danger' : 'btn-warning'}" id="btn-proceed" ${isCritical ? 'disabled' : ''}>
              ${isCritical ? '⚠️ Submit with explanation' : '✓ I understand, proceed'}
            </button>
          ` : ''}
          <button class="btn btn-ghost" id="btn-cancel">
            ← Cancel and review my prompt
          </button>
          ${isVerbose ? `
            <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:4px;">
              This warning will become shorter as you become familiar with the policy.
            </p>
          ` : ''}
        </div>
      </div>
    `;
  }

  _bindEvents() {
    const shadow = this.shadowRoot;
    const proceedBtn = shadow.getElementById('btn-proceed');
    const cancelBtn = shadow.getElementById('btn-cancel');
    const justificationInput = shadow.getElementById('justification-input');
    const charCount = shadow.getElementById('char-count');

    // Handle justification typing (for CRITICAL overlays)
    if (justificationInput) {
      justificationInput.addEventListener('input', () => {
        const len = justificationInput.value.trim().length;
        charCount.textContent = `${len} / 20 characters minimum`;
        charCount.className = `char-count ${len >= 20 ? '' : 'insufficient'}`;
        if (proceedBtn) {
          proceedBtn.disabled = len < 20;
        }
      });
    }

    // Proceed button
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (proceedBtn.disabled) return;
        const justification = justificationInput?.value.trim() || null;
        this._resolve('proceed', justification);
      });
    }

    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this._resolve('cancel', null);
    });

    // Backdrop click (for HIGH severity — CRITICAL has no backdrop clickthrough)
    if (this.options.severity !== 'CRITICAL') {
      const backdrop = shadow.querySelector('.backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this._resolve('cancel', null));
      }
    }

    // Keyboard: Escape key to cancel (not for CRITICAL)
    this._escapeHandler = (e) => {
      if (e.key === 'Escape' && this.options.severity !== 'CRITICAL') {
        this._resolve('cancel', null);
      }
    };
    document.addEventListener('keydown', this._escapeHandler);
  }

  _startCountdown(seconds) {
    const fill = this.shadowRoot.getElementById('countdown-fill');
    if (!fill) return;

    let remaining = seconds;
    this.countdownInterval = setInterval(() => {
      remaining--;
      const pct = (remaining / seconds) * 100;
      fill.style.width = `${pct}%`;
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this._resolve('cancel', null); // Auto-dismiss as cancel
      }
    }, 1000);
  }

  _resolve(decision, justification) {
    this._destroy();
    this.options.onDecision({ decision, justification });
  }

  _destroy() {
    clearInterval(this.countdownInterval);
    document.removeEventListener('keydown', this._escapeHandler);
    this.hostEl?.remove();
  }

  // Returns the CSS string to inject into shadow DOM
  // In production, this should be loaded from jit-overlay.css via build tool
  _getInlineCSS() {
    // The full CSS from jit-overlay.css goes here
    // For brevity in this spec, reference the file:
    // Build tool should inline this at bundle time using:
    // import styles from './jit-overlay.css?inline';
    return `/* See jit-overlay.css for full styles */`;
  }
}
```

---

## File: `extension/jit/jit-controller.js`

The controller is the bridge between the event detection system and the overlay UI. It listens for policy trigger events, decides which overlay state to show, and dispatches the outcome.

```javascript
// jit-controller.js
// Listens for JIT trigger events from content.js, clipboard-enforcer.js,
// and shadow-detector. Shows the appropriate overlay state and
// communicates the outcome back to the trigger source.

'use strict';

import { JITOverlay } from './jit-overlay.js';

// Map severity to overlay mode
const SEVERITY_TO_MODE = {
  CRITICAL: 'justification',   // Type a reason + submit
  HIGH:     'confirm',         // Click to confirm, auto-dismiss on timeout
  MEDIUM:   'banner',          // Non-blocking banner (not handled by JITOverlay — inline CSS only)
  LOW:      'toast',           // Non-blocking toast
};

/**
 * Trigger a JIT overlay for a given finding.
 * Returns a Promise resolving to {decision, justification}.
 * The caller uses this to decide whether to allow or block the prompt submission.
 *
 * @param {Object} config
 * @param {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'} config.severity
 * @param {string}   config.findingType         - API_KEY | EMAIL | CLIPBOARD_LINEAGE | etc.
 * @param {string[]} config.detectedItems       - List of redacted findings for display
 * @param {boolean}  [config.canOverride=true]  - Whether proceed is allowed
 * @param {string}   [config.sourceLabel]       - For clipboard: source system label
 * @param {string}   [config.sourceDomain]      - For clipboard: source domain
 * @returns {Promise<{decision: 'proceed'|'cancel', justification: string|null}>}
 */
export function triggerJIT(config) {
  return new Promise((resolve) => {
    const mode = SEVERITY_TO_MODE[config.severity] || 'toast';

    if (mode === 'toast') {
      _showToast(config);
      // Toast doesn't block — resolve proceed immediately
      resolve({ decision: 'proceed', justification: null });
      return;
    }

    // For confirm and justification modes, show the modal overlay
    const overlay = new JITOverlay({
      ...config,
      onDecision: (outcome) => {
        // Log the decision to backend
        chrome.runtime.sendMessage({
          type: 'JIT_DECISION_LOGGED',
          payload: {
            severity: config.severity,
            findingType: config.findingType,
            decision: outcome.decision,
            justification: outcome.justification,
            timestamp: new Date().toISOString(),
          },
        });
        resolve(outcome);
      },
    });

    overlay.show();
  });
}

/**
 * Show a non-blocking toast notification for LOW severity findings.
 * Does not require any user interaction.
 */
function _showToast(config) {
  // Create a minimal toast outside of Shadow DOM (low risk, lightweight)
  const toast = document.createElement('div');
  toast.id = '__aisentinel_toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
    background: #1e293b; color: #f1f5f9; border-radius: 10px;
    padding: 12px 16px; font-family: -apple-system, sans-serif;
    font-size: 13px; max-width: 320px; line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: slideInRight 0.2s ease-out;
  `;
  toast.innerHTML = `
    <style>
      @keyframes slideInRight {
        from { transform: translateX(30px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
    </style>
    <span style="margin-right:8px">ℹ️</span>
    AISentinel: ${config.detectedItems?.length ? `Potential ${config.findingType?.toLowerCase().replace('_', ' ')} in prompt.` : 'Sensitive content may be present.'}
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
```

---

## Integration: Wiring JIT Into the Main Content Script

In `content.js`, after the DLP response comes back from the backend, add this flow:

```javascript
// In content.js — the sendEvent function (from 08_CHROME_EXTENSION_SPEC.md)
// Replace the simple fire-and-forget with a gated flow:

import { triggerJIT } from './jit/jit-controller.js';

async function sendEventGated(promptText) {
  if (!orgToken || !userToken) return;
  if (!promptText || promptText.trim().length < 3) return;

  // STEP 1: Do a fast local DLP check using regex only (< 5ms)
  // This avoids a round-trip for clearly clean prompts
  const quickScan = await localQuickScan(promptText);

  if (quickScan.risk_score === 0) {
    // Clean: send event to backend without any overlay
    sendEventAsync(promptText);
    return;
  }

  // STEP 2: For risky prompts, show JIT overlay BEFORE submitting
  const severity = scoreToseverity(quickScan.risk_score);
  const { decision, justification } = await triggerJIT({
    severity,
    findingType: quickScan.topFinding,
    detectedItems: quickScan.redactedItems,
    canOverride: severity !== 'CRITICAL_NO_OVERRIDE',
  });

  if (decision === 'cancel') {
    // Employee chose to review — do NOT send the event
    return;
  }

  // STEP 3: Employee confirmed — send event with JIT metadata
  sendEventAsync(promptText, {
    jit_override: true,
    jit_severity: severity,
    jit_justification: justification,
  });
}

function scoreToseverity(riskScore) {
  if (riskScore >= 90) return 'CRITICAL';
  if (riskScore >= 60) return 'HIGH';
  if (riskScore >= 30) return 'MEDIUM';
  return 'LOW';
}
```

---

## Backend Schema Addition: `jit_interactions`

```sql
CREATE TABLE jit_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL,
    user_id         UUID REFERENCES users(id),

    severity        VARCHAR(20) NOT NULL,
    finding_type    VARCHAR(100) NOT NULL,
    decision        VARCHAR(20) NOT NULL,    -- 'proceed' | 'cancel'
    justification   TEXT,                   -- Employee's typed reason (CRITICAL only)
    warning_count   INTEGER,                -- How many times employee has seen this type
    auto_dismissed  BOOLEAN DEFAULT FALSE,  -- True if countdown expired without interaction

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jit_org ON jit_interactions(org_id, created_at DESC);
CREATE INDEX idx_jit_user ON jit_interactions(user_id);
CREATE INDEX idx_jit_decision ON jit_interactions(org_id, decision);
```
