# 08 — Chrome Extension Specification

## Overview

The AISentinel Chrome Extension is the **most important MVP component** for **organizational employee monitoring**. When an company rolls out AISentinel, each employee installs this extension; it captures what they type and submit on ChatGPT, Claude, Gemini, etc., and sends it to the org's AISentinel backend tagged with that employee's identity.

**Who installs it:** Employees (guided by org admin after invite).  
**What it monitors:** AI website prompts only — not general web browsing.  
**Architecture:** Chrome Extension Manifest V3  
**Approach:** Observe-only in MVP (no blocking)  
**Privacy:** Prompts sent to org's AISentinel server only; no third-party SDKs  

Org deployment flow: [`20_ORG_EMPLOYEE_MONITORING.md`](20_ORG_EMPLOYEE_MONITORING.md)

---

## File Structure

```
extension/
├── manifest.json
├── background.js              # Service worker
├── content.js                 # Injected into AI websites
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── utils/
    └── helpers.js
```

---

## `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "AISentinel — AI Usage Monitor",
  "version": "0.1.0",
  "description": "Monitor and protect your company's AI usage. Requires an AISentinel account.",

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],

  "host_permissions": [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://copilot.microsoft.com/*",
    "https://api.aisentinel.io/*"
  ],

  "content_scripts": [
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*"
      ],
      "js": ["utils/helpers.js", "content.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    },
    {
      "matches": ["https://claude.ai/*"],
      "js": ["utils/helpers.js", "content.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    },
    {
      "matches": ["https://gemini.google.com/*"],
      "js": ["utils/helpers.js", "content.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    },
    {
      "matches": ["https://copilot.microsoft.com/*"],
      "js": ["utils/helpers.js", "content.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    }
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    },
    "default_title": "AISentinel"
  }
}
```

---

## `utils/helpers.js`

```javascript
// Shared utilities injected before content.js

window.__AISentinel = window.__AISentinel || {};

window.__AISentinel.PLATFORM_CONFIG = {
  'chat.openai.com': {
    name: 'chatgpt',
    // Selectors for ChatGPT's input area
    inputSelectors: [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      '[contenteditable="true"][data-lexical-editor="true"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send prompt"]',
    ],
  },
  'chatgpt.com': {
    name: 'chatgpt',
    inputSelectors: [
      '#prompt-textarea',
      'textarea[data-id="root"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
    ],
  },
  'claude.ai': {
    name: 'claude',
    inputSelectors: [
      '[contenteditable="true"][data-testid="input-field"]',
      '.ProseMirror',
      'div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[aria-label="Send message"]',
      'button[type="submit"]',
    ],
  },
  'gemini.google.com': {
    name: 'gemini',
    inputSelectors: [
      '.ql-editor',
      'rich-textarea .ql-editor',
      '[contenteditable="true"]',
    ],
    submitSelectors: [
      'button.send-button',
      'button[aria-label="Send message"]',
      'button[mattooltip="Send message"]',
    ],
  },
  'copilot.microsoft.com': {
    name: 'copilot',
    inputSelectors: [
      '#userInput',
      'textarea[name="q"]',
      'cib-text-input textarea',
    ],
    submitSelectors: [
      'button[aria-label="Submit message"]',
      'cib-text-input button[type="submit"]',
    ],
  },
};

window.__AISentinel.getTextFromElement = function(el) {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    return el.value || '';
  }
  if (el.getAttribute('contenteditable')) {
    return el.innerText || el.textContent || '';
  }
  return '';
};

window.__AISentinel.generateSessionId = function() {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};
```

---

## `content.js`

```javascript
(async function() {
  'use strict';

  // ─────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────
  const API_BASE = 'https://api.aisentinel.io';
  const hostname = window.location.hostname;
  const platformConfig = window.__AISentinel?.PLATFORM_CONFIG?.[hostname];

  if (!platformConfig) return; // Unsupported page

  const platform = platformConfig.name;
  let orgToken = null;
  let userToken = null;
  let sessionId = window.__AISentinel.generateSessionId();
  let lastSentText = '';
  let lastSentTime = 0;
  const DEBOUNCE_MS = 500;  // Don't send same text within 500ms

  // ─────────────────────────────────────────────
  // LOAD TOKENS FROM STORAGE
  // ─────────────────────────────────────────────
  function loadTokens() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['orgToken', 'userToken'], (data) => {
        orgToken = data.orgToken || null;
        userToken = data.userToken || null;
        resolve();
      });
    });
  }

  await loadTokens();

  // Re-load if storage changes (user configures extension while on AI site)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.orgToken) orgToken = changes.orgToken.newValue;
    if (changes.userToken) userToken = changes.userToken.newValue;
  });

  // ─────────────────────────────────────────────
  // SEND EVENT TO BACKEND
  // ─────────────────────────────────────────────
  async function sendEvent(promptText) {
    if (!orgToken || !userToken) return;
    if (!promptText || promptText.trim().length < 3) return;

    const trimmed = promptText.trim();
    const now = Date.now();

    // Debounce: don't send duplicate in rapid succession
    if (trimmed === lastSentText && (now - lastSentTime) < DEBOUNCE_MS) return;
    lastSentText = trimmed;
    lastSentTime = now;

    const payload = {
      user_token: userToken,
      platform: platform,
      source: 'extension',
      prompt_text: trimmed,
      prompt_length: trimmed.length,
      page_url: window.location.href,
      session_id: sessionId,
      captured_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Token': orgToken,
        },
        body: JSON.stringify(payload),
        // Use keepalive so request completes even if page navigates
        keepalive: true,
      });

      if (res.ok) {
        const data = await res.json();
        // Notify background script of result (for badge update)
        chrome.runtime.sendMessage({
          type: 'EVENT_SENT',
          risk_score: data.risk_score,
          has_critical: data.has_critical,
          event_id: data.event_id,
        });
      }
    } catch (_e) {
      // Silently fail — never break the user's workflow
    }
  }

  // ─────────────────────────────────────────────
  // GET CURRENT PROMPT TEXT
  // ─────────────────────────────────────────────
  function getCurrentPromptText() {
    for (const selector of platformConfig.inputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = window.__AISentinel.getTextFromElement(el);
        if (text && text.trim().length > 0) return text;
      }
    }
    return '';
  }

  // ─────────────────────────────────────────────
  // INTERCEPT SUBMIT BUTTON CLICKS
  // ─────────────────────────────────────────────
  function hookSubmitButton(btn) {
    if (btn._aisentinel_hooked) return;
    btn._aisentinel_hooked = true;
    btn.addEventListener('click', () => {
      const text = getCurrentPromptText();
      if (text) sendEvent(text);
    }, { capture: true });
  }

  // ─────────────────────────────────────────────
  // INTERCEPT ENTER KEY
  // ─────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    const isInputEl = target.tagName === 'TEXTAREA' ||
                      target.getAttribute('contenteditable') ||
                      target.classList.contains('ql-editor') ||
                      target.classList.contains('ProseMirror');
    if (isInputEl) {
      const text = window.__AISentinel.getTextFromElement(target) || getCurrentPromptText();
      if (text) sendEvent(text);
    }
  }, true);

  // ─────────────────────────────────────────────
  // MUTATION OBSERVER: hook new submit buttons as they appear
  // ─────────────────────────────────────────────
  function scanAndHookButtons() {
    for (const selector of platformConfig.submitSelectors) {
      document.querySelectorAll(selector).forEach(hookSubmitButton);
    }
  }

  const observer = new MutationObserver(scanAndHookButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  scanAndHookButtons(); // Initial scan

})();
```

---

## `background.js`

```javascript
// Service worker — handles badge updates and stats

let todayStats = { prompts: 0, alerts: 0 };

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EVENT_SENT') {
    todayStats.prompts++;
    if (message.has_critical) {
      todayStats.alerts++;
      // Show red badge count
      chrome.action.setBadgeText({ text: String(todayStats.alerts) });
      chrome.action.setBadgeBackgroundColor({ color: '#c92a2a' });
    }
  }
});

// Reset stats at midnight
chrome.alarms.create('resetDailyStats', {
  when: getNextMidnight(),
  periodInMinutes: 60 * 24,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyStats') {
    todayStats = { prompts: 0, alerts: 0 };
    chrome.action.setBadgeText({ text: '' });
  }
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// Make stats available to popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATS') {
    sendResponse(todayStats);
  }
});
```

---

## `popup/popup.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AISentinel</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <div class="logo">🛡️ AISentinel</div>
    <div id="status-badge" class="badge badge-gray">Not configured</div>
  </div>

  <div id="stats-panel" class="stats" style="display:none">
    <div class="stat">
      <span id="prompts-count" class="stat-value">0</span>
      <span class="stat-label">Prompts today</span>
    </div>
    <div class="stat">
      <span id="alerts-count" class="stat-value alerts">0</span>
      <span class="stat-label">Alerts</span>
    </div>
  </div>

  <div class="section">
    <label class="label">Org Token</label>
    <div class="input-row">
      <input type="password" id="org-token" placeholder="aisnl_org_..." class="input" />
    </div>

    <label class="label">Your User Token</label>
    <div class="input-row">
      <input type="password" id="user-token" placeholder="aisnl_usr_..." class="input" />
    </div>

    <button id="save-btn" class="btn btn-primary">Save & Connect</button>
    <button id="clear-btn" class="btn btn-ghost">Disconnect</button>
  </div>

  <div class="footer">
    <a href="https://app.aisentinel.io" target="_blank">Open Dashboard →</a>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

---

## `popup/popup.js`

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const orgInput = document.getElementById('org-token');
  const userInput = document.getElementById('user-token');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusBadge = document.getElementById('status-badge');
  const statsPanel = document.getElementById('stats-panel');

  // Load saved tokens
  chrome.storage.sync.get(['orgToken', 'userToken'], (data) => {
    if (data.orgToken) {
      orgInput.value = data.orgToken;
      userInput.value = data.userToken || '';
      setConnected(true);
    }
  });

  // Load today's stats from background
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
    if (stats) {
      document.getElementById('prompts-count').textContent = stats.prompts;
      document.getElementById('alerts-count').textContent = stats.alerts;
    }
  });

  saveBtn.addEventListener('click', () => {
    const orgToken = orgInput.value.trim();
    const userToken = userInput.value.trim();

    if (!orgToken || !userToken) {
      showMessage('Please enter both tokens.', 'error');
      return;
    }

    if (!orgToken.startsWith('aisnl_org_') || !userToken.startsWith('aisnl_usr_')) {
      showMessage('Invalid token format. Check your AISentinel dashboard.', 'error');
      return;
    }

    chrome.storage.sync.set({ orgToken, userToken }, () => {
      setConnected(true);
      showMessage('Connected! Monitoring active.', 'success');
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.sync.remove(['orgToken', 'userToken'], () => {
      orgInput.value = '';
      userInput.value = '';
      setConnected(false);
    });
  });

  function setConnected(connected) {
    if (connected) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'badge badge-green';
      statsPanel.style.display = 'flex';
    } else {
      statusBadge.textContent = 'Not configured';
      statusBadge.className = 'badge badge-gray';
      statsPanel.style.display = 'none';
    }
  }

  function showMessage(msg, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = msg;
    document.body.insertBefore(div, document.querySelector('.footer'));
    setTimeout(() => div.remove(), 3000);
  }
});
```

---

## `popup/popup.css`

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #212529;
  background: #fff;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #e9ecef;
}

.logo { font-weight: 700; font-size: 15px; }

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
}
.badge-green { background: #d3f9d8; color: #2b8a3e; }
.badge-gray  { background: #f1f3f5; color: #868e96; }

.stats {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e9ecef;
}
.stat {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-right: 1px solid #e9ecef;
}
.stat:last-child { border-right: none; }
.stat-value { display: block; font-size: 22px; font-weight: 700; color: #3b5bdb; }
.stat-value.alerts { color: #c92a2a; }
.stat-label { display: block; font-size: 11px; color: #868e96; margin-top: 2px; }

.section { padding: 14px 16px; }
.label { display: block; font-weight: 500; color: #495057; margin-bottom: 4px; margin-top: 10px; }
.label:first-child { margin-top: 0; }

.input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  color: #495057;
}
.input:focus { outline: none; border-color: #3b5bdb; }

.btn {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  margin-top: 8px;
}
.btn-primary { background: #3b5bdb; color: #fff; }
.btn-primary:hover { background: #364fc7; }
.btn-ghost { background: transparent; color: #868e96; border: 1px solid #dee2e6; }
.btn-ghost:hover { background: #f8f9fa; }

.message {
  margin: 0 16px 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
}
.message.success { background: #d3f9d8; color: #2b8a3e; }
.message.error   { background: #ffe3e3; color: #c92a2a; }

.footer {
  padding: 10px 16px;
  border-top: 1px solid #e9ecef;
  text-align: center;
}
.footer a { color: #3b5bdb; text-decoration: none; font-size: 12px; }
```

---

## Loading the Extension Locally (Development)

```
1. Open Chrome → chrome://extensions
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the /extension folder
5. Extension appears in toolbar
6. Pin it for easy access
```

---

## Platform Selector Maintenance

AI platforms change their UI frequently. When selectors break:

1. Open DevTools on the AI site
2. Inspect the textarea / input element
3. Find a stable selector (prefer `data-testid` or `aria-label`)
4. Update `PLATFORM_CONFIG` in `helpers.js`
5. Re-publish extension

**Known fragile areas:**
- ChatGPT changes `#prompt-textarea` occasionally
- Claude uses ProseMirror which restructures on updates
- Gemini uses Quill editor inside shadow DOM (may need `MAIN` world injection)

---

## Privacy Notes (for User-Facing Communication)

- Extension only activates on supported AI domains (listed in manifest)
- Data is sent only to your organization's AISentinel account
- No data is sent to third parties
- Admin controls data retention (default 90 days)
- Employees can see their own data in the dashboard
- Extension does NOT capture passwords, payment info, or non-AI pages
