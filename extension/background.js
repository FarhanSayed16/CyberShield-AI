// Background Service Worker — Threat Explainer + AI Workplace Guard

const SCAN_COOLDOWN_MS = 8000;

const lastScanByTab = {};
const lastScanByUrl = {};
let rateLimitedUntil = 0;
let cachedPolicy = null;

const AI_TAB_URL_PATTERNS = [
  'https://chat.openai.com/*',
  'https://chatgpt.com/*',
  'https://*.chatgpt.com/*',
  'https://claude.ai/*',
  'https://gemini.google.com/*',
  'https://www.google.com/*',
  'https://google.com/*',
];

/**
 * Unified config (chrome.storage.local).
 * apiBase = origin (e.g. http://localhost:8000) — no trailing /api.
 * Threat routes use `${apiOrigin}/api/...` via apiUrl.
 */
async function getApiConfig() {
  const result = await chrome.storage.local.get([
    'apiBase',
    'apiBaseUrl',
    'orgToken',
    'userToken',
    'dashboardBaseUrl',
    'apiKey',
  ]);

  let apiOrigin = (result.apiBase || '').replace(/\/$/, '');
  if (!apiOrigin && result.apiBaseUrl) {
    apiOrigin = String(result.apiBaseUrl).replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  const apiUrl = apiOrigin ? `${apiOrigin}/api` : '';

  return {
    apiOrigin,
    apiUrl,
    orgToken: result.orgToken || '',
    userToken: result.userToken || '',
    dashboardBaseUrl: (result.dashboardBaseUrl || '').replace(/\/$/, ''),
    apiKey: result.apiKey || '',
  };
}

function authHeaders(config, { json = true } = {}) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (config.orgToken) {
    headers['X-Org-Token'] = config.orgToken;
    if (config.userToken) headers['X-User-Token'] = config.userToken;
  } else if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }
  return headers;
}

function isConfigured(config) {
  return Boolean(config.apiOrigin && (config.orgToken || config.apiKey));
}

function canScan(tabId, url) {
  const now = Date.now();
  if (now < rateLimitedUntil) return false;
  if (tabId != null && lastScanByTab[tabId] && (now - lastScanByTab[tabId]) < SCAN_COOLDOWN_MS) {
    return false;
  }
  if (url && lastScanByUrl[url] && (now - lastScanByUrl[url]) < SCAN_COOLDOWN_MS) {
    return false;
  }
  return true;
}

function markScan(tabId, url) {
  const now = Date.now();
  if (tabId != null) lastScanByTab[tabId] = now;
  if (url) lastScanByUrl[url] = now;
}

function noteRateLimit(response) {
  if (response && response.status === 429) {
    const retry = parseInt(response.headers.get('Retry-After') || '30', 10);
    rateLimitedUntil = Date.now() + Math.max(retry, 10) * 1000;
    return true;
  }
  return false;
}

function resolveTier(tier) {
  if (!tier || tier === 'auto') return 'auto';
  if (String(tier).startsWith('tier')) return String(tier);
  return 'tier' + tier;
}

// Known-safe domains that should NOT trigger auto-scan
const SAFE_DOMAINS = [
  'google.com', 'www.google.com', 'google.co.in',
  'github.com', 'stackoverflow.com',
  'youtube.com', 'www.youtube.com',
  'wikipedia.org', 'en.wikipedia.org',
  'microsoft.com', 'learn.microsoft.com',
  'developer.mozilla.org',
  'localhost', '127.0.0.1',
  'chrome.google.com',
  'accounts.google.com',
];

function isSafeDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch { return false; }
}

// Create context menu + Guard alarms
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scanSelectedText",
    title: "Scan with CyberSentinel AI",
    contexts: ["selection", "link"]
  });
  chrome.alarms.create('policyRefresh', { periodInMinutes: 15 });
  chrome.alarms.create('ingestRetry', { periodInMinutes: 1 });
  chrome.alarms.create('enforcementPoll', { periodInMinutes: 1 });
  getApiConfig().then((cfg) => {
    if (cfg.orgToken && cfg.apiOrigin) fetchPolicy(cfg.apiOrigin, cfg.orgToken);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'policyRefresh') {
    getApiConfig().then((cfg) => {
      if (cfg.orgToken && cfg.apiOrigin) fetchPolicy(cfg.apiOrigin, cfg.orgToken);
    });
  }
  if (alarm.name === 'ingestRetry') flushQueue();
  if (alarm.name === 'enforcementPoll') pollEnforcement();
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scanSelectedText") {
    const textToScan = info.selectionText || info.linkUrl;
    const type = info.linkUrl ? 'url' : 'text';
    
    // Inject scanning UI into the active page
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "showScanOverlay", 
        data: textToScan,
        type: type
      });
      
      // Hit the API
      analyzeThreat(textToScan, type, tab.id);
    }
  }
});

// Handle messages from content script (Quickball buttons & auto-scan) + Guard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ── AI Workplace Guard message types ──
  if (request.type === 'GET_POLICY') {
    getApiConfig().then(async (data) => {
      if (!cachedPolicy && data.orgToken && data.apiOrigin) {
        await fetchPolicy(data.apiOrigin, data.orgToken);
      }
      if (!cachedPolicy) {
        const stored = await chrome.storage.local.get('cs_policy');
        cachedPolicy = stored.cs_policy;
      }
      sendResponse({
        policy: cachedPolicy || { features: {}, jit_mode: 'off', anonymize_mode: 'off' },
      });
    });
    return true;
  }

  if (request.type === 'INGEST_EVENT') {
    getApiConfig().then(async (data) => {
      if (!data.orgToken || !data.userToken || !data.apiOrigin) {
        sendResponse({ ok: false, reason: 'not_configured' });
        return;
      }
      const payload = { ...request.payload, user_token: data.userToken };
      const config = { apiBase: data.apiOrigin, orgToken: data.orgToken };
      const result = await postEvent(config, payload);
      if (!result.ok) {
        const { cs_ingest_queue = [] } = await chrome.storage.local.get('cs_ingest_queue');
        const sid = payload.client_submit_id;
        const alreadyQueued = sid && cs_ingest_queue.some((q) => q.payload?.client_submit_id === sid);
        if (!alreadyQueued) {
          cs_ingest_queue.push({ config, payload, at: Date.now() });
          await chrome.storage.local.set({ cs_ingest_queue: cs_ingest_queue.slice(-50) });
        }
        sendResponse({ ok: false, reason: 'network_error', queued: true });
        return;
      }
      sendResponse({
        ok: true,
        event_id: result.event_id,
        duplicate: result.duplicate,
        body: result.body,
      });
    });
    return true;
  }

  if (request.type === 'POLL_ENFORCEMENT') {
    pollEnforcement();
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'UPDATE_EVENT_RESPONSE') {
    getApiConfig().then(async (data) => {
      if (!data.orgToken || !data.userToken || !request.eventId) {
        sendResponse({ ok: false });
        return;
      }
      const ok = await patchEventResponse(
        { apiBase: data.apiOrigin, orgToken: data.orgToken },
        request.eventId,
        request.response_text,
        data.userToken
      );
      sendResponse({ ok });
    });
    return true;
  }

  if (request.action === "manualScanFromQuickball") {
    const tabId = sender.tab.id;
    chrome.tabs.sendMessage(tabId, { action: "showScanOverlay" });
    const pageTier = resolveTier(request.tier || 'auto');
    analyzeThreatWithTier(request.url, "url", tabId, pageTier);
  } else if (request.action === "pageTextForScan") {
    // Auto-scan: content script extracted page text, analyze it
    const tabId = sender.tab.id;
    if (request.text && request.text.length > 20) {
      analyzeThreat(request.text.substring(0, 5000), "text", tabId);
    }
  } else if (request.action === "scanExternalLink") {
    // Background link scanning from content script
    const tabId = sender.tab.id;
    analyzeThreat(request.url, "url", tabId);
  } else if (request.action === "manualTextScan") {
    // Manual text/URL/prompt scan from Quickball scan input
    const tabId = sender.tab.id;
    const typeMap = { "url": "url", "text": "text", "prompt": "prompt" };
    const inputType = typeMap[request.scanType] || "text";
    const tierStr = resolveTier(request.tier || 'auto');
    analyzeThreatWithTier(request.content, inputType, tabId, tierStr);
  } else if (request.action === "manualFileScan") {
    // File upload for deepfake detection
    const tabId = sender.tab.id;
    const fileTierStr = resolveTier(request.tier || 'auto');
    analyzeThreatWithTier(request.fileData, "image", tabId, fileTierStr);
  } else if (request.action === "askAiAssistant") {
    const tabId = sender.tab.id;
    getApiConfig().then((config) => {
      if (!config.apiUrl || !isConfigured(config)) return;
      fetch(`${config.apiUrl}/chat`, {
          method: 'POST',
          headers: authHeaders(config),
          body: JSON.stringify({ prompt: request.query, url_context: request.url })
      })
      .then(res => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
      })
      .then(data => {
          chrome.tabs.sendMessage(tabId, { action: "aiAssistantResponse", response: data.response });
      })
      .catch(err => {
          console.error("Chat Error:", err);
          chrome.tabs.sendMessage(tabId, { action: "aiAssistantResponse", response: "⚠️ CyberSentinel AI engines are currently offline." });
      });
    });
  } else if (request.action === "generateThreatReport") {
    const tabId = sender.tab.id;
    chrome.tabs.captureVisibleTab(null, {format: "png"}, (dataUrl) => {
        if (chrome.runtime.lastError) {
             chrome.tabs.sendMessage(tabId, { action: "toast", title: "Capture Failed", message: chrome.runtime.lastError.message, type: "error" });
             return;
        }
        
        // POST dataUrl to /api/report
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        getApiConfig().then((config) => {
          if (!config.apiUrl || !isConfigured(config)) return;
          fetch(`${config.apiUrl}/report`, {
              method: 'POST',
              headers: authHeaders(config),
              body: JSON.stringify({ url: request.url, screenshot_base64: base64Data })
          })
          .then(res => res.json())
          .then(data => {
               chrome.tabs.sendMessage(tabId, { action: "toast", title: "Report Generated 📸", message: data.message, type: "success" });
          })
          .catch(err => {
               console.error("Report Error:", err);
               chrome.tabs.sendMessage(tabId, { action: "toast", title: "Report Failed", message: "Failed to upload threat report.", type: "error" });
          });
        });
    });
  } else if (request.action === "scanHistory") {
    // 1. Fetch history from Chrome
    chrome.history.search({ text: '', maxResults: parseInt(request.limit) || 50 }, (results) => {
        // Extract unique, valid HTTP/HTTPS URLs filtering out safe domains to avoid noise
        const targetUrls = new Set();
        results.forEach(r => {
            if (r.url && r.url.startsWith('http') && !isSafeDomain(r.url)) {
                targetUrls.add(r.url);
            }
        });

        const urlsToScan = Array.from(targetUrls).slice(0, 50);
        
        if (urlsToScan.length === 0) {
            sendResponse({ results: [] });
            return;
        }

        // 2. Send batch request
        getApiConfig().then((config) => {
            if (!config.apiUrl || !isConfigured(config)) {
                sendResponse({ results: [], error: 'not_configured' });
                return;
            }
            fetch(`${config.apiUrl}/analyze/batch`, {
                method: 'POST',
                headers: authHeaders(config),
                body: JSON.stringify({ urls: urlsToScan, source: 'history_audit' })
            })
            .then(res => res.json())
            .then(data => sendResponse(data))
            .catch(err => {
                console.error("Batch History Sync Error:", err);
                sendResponse({ error: err.message, results: [] });
            });
        });
    });
    // Return true to indicate we will sendResponse asynchronously
    return true; 
  }
});

// Real-time URL navigation check — pre-navigate
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0 && !details.url.includes('chrome://') && !details.url.includes('chrome-extension://') && !isSafeDomain(details.url)) {
    if (!canScan(details.tabId, details.url)) return;
    chrome.storage.local.get(['safetySettings'], (result) => {
      const settings = result.safetySettings || { blockHighRisk: true };
      if (settings.blockHighRisk) {
        analyzeURLQuick(details.url, details.tabId);
      }
    });
  }
});

// Auto-scan page text after page finishes loading
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && !details.url.includes('chrome://') && !details.url.includes('chrome-extension://') && !isSafeDomain(details.url)) {
    if (!canScan(details.tabId, details.url + '#page-text')) return;
    // Tell content script to extract visible text and send it back
    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, { action: "extractAndScanPageText" }).catch(() => {});
    }, 1500); // Wait for page to settle
  }
});

// Talk to FastAPI Backend — URL quick check
async function analyzeURLQuick(url, tabId) {
  if (!canScan(tabId, url)) return;
  markScan(tabId, url);
  try {
    const config = await getApiConfig();
    const { apiUrl } = config;
    if (!apiUrl || !isConfigured(config)) {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: "Extension not configured — set API URL + org token under Config.",
      }).catch(() => {});
      return;
    }
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify({ source: 'extension', type: 'url', content: url })
    });

    if (noteRateLimit(response)) {
      chrome.tabs.sendMessage(tabId, {
        action: "toast",
        title: "Rate limited",
        message: "Too many scans — backing off briefly.",
        type: "warning"
      }).catch(() => {});
      return;
    }
    
    const domainReputation = await checkDomainReputation(url);

    if (response.ok) {
      const data = await response.json();
      
      if (domainReputation && domainReputation.risk === 'High') {
          data.explanation += ` \n\nDomain Intelligence indicates the domain was registered recently (${domainReputation.age}) and has a poor reputation score (${domainReputation.vt_score}).`;
          data.risk_score = Math.min(100, data.risk_score + 25);
      }
      
      // ALWAYS update the quickball UI with the scan result
      chrome.tabs.sendMessage(tabId, { action: "updateScanOverlay", result: data }).catch(() => {});
      
      if (data.threat_level === 'High Risk' || data.risk_score >= 80) {
        chrome.tabs.sendMessage(tabId, { action: "showWarningBlocker", data: data }).catch(() => {});
      } else if (data.threat_level === 'Safe') {
        const hostname = new URL(url).hostname;
        // The content script handles frequency limiting internally
        chrome.tabs.sendMessage(tabId, { 
          action: "toast", 
          title: "Page Scanned — Safe", 
          message: `${hostname} verified by CyberSentinel.`, 
          type: "success" 
        }).catch(() => {});
      }
    } else {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: `Analyze failed (HTTP ${response.status}).`,
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Quick analyze failed:", error);
    chrome.tabs.sendMessage(tabId, {
      action: "scanOverlayError",
      error: "Failed to reach CyberSentinel AI engine.",
    }).catch(() => {});
  }
}

async function analyzeThreat(content, type, tabId) {
  const scanKey = `${type}:${String(content).slice(0, 200)}`;
  if (!canScan(tabId, scanKey)) return;
  markScan(tabId, scanKey);
  try {
    const config = await getApiConfig();
    const { apiUrl } = config;
    if (!apiUrl || !isConfigured(config)) {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: "Extension not configured — set API URL + org token under Config.",
      }).catch(() => {});
      return;
    }
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify({ source: 'extension', type: type, content: content })
    });

    if (noteRateLimit(response)) {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: "Too many requests — please wait and try again."
      }).catch(() => {});
      return;
    }
    
    if (response.ok) {
      const data = await response.json();
      
      if (type === 'url') {
        const domainReputation = await checkDomainReputation(content);
        if (domainReputation && domainReputation.risk === 'High') {
            data.explanation += ` \n\nDomain Intelligence: Age is ${domainReputation.age}. VirusTotal flags: ${domainReputation.vt_score}.`;
        }
      }

      // Send result back to content script to update UI
      chrome.tabs.sendMessage(tabId, {
        action: "updateScanOverlay",
        result: data
      });
    } else {
      throw new Error("HTTP " + response.status);
    }
  } catch (error) {
    chrome.tabs.sendMessage(tabId, {
      action: "scanOverlayError",
      error: "Failed to reach CyberSentinel AI engine."
    });
  }
}

// Analyze with explicit tier selection (from Quickball scan controls)
async function analyzeThreatWithTier(content, type, tabId, tier) {
  // Manual scans always allowed but still respect global 429 backoff
  if (Date.now() < rateLimitedUntil) {
    chrome.tabs.sendMessage(tabId, {
      action: "scanOverlayError",
      error: "Too many requests — please wait and try again."
    }).catch(() => {});
    return;
  }
  try {
    const config = await getApiConfig();
    const { apiUrl } = config;
    if (!apiUrl || !isConfigured(config)) {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: "Extension not configured — open the extension popup → Config and set API URL (http://localhost:8000), org token, and user token.",
      }).catch(() => {});
      return;
    }
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify({ source: 'extension', type: type, content: content, tier: tier })
    });

    if (noteRateLimit(response)) {
      chrome.tabs.sendMessage(tabId, {
        action: "scanOverlayError",
        error: "Too many requests — please wait and try again."
      }).catch(() => {});
      return;
    }
    
    if (response.ok) {
      const data = await response.json();
      chrome.tabs.sendMessage(tabId, { action: "updateScanOverlay", result: data }).catch(() => {});
    } else {
      throw new Error("HTTP " + response.status);
    }
  } catch (error) {
    console.error("Tier analyze failed:", error);
    chrome.tabs.sendMessage(tabId, {
      action: "scanOverlayError",
      error: "Failed to reach CyberSentinel AI engine."
    });
  }
}

// Mocking Domain Intelligence API
async function checkDomainReputation(url) {
    try {
        const config = await getApiConfig();
    const { apiUrl } = config;
    if (!apiUrl || !isConfigured(config)) return;
        const response = await fetch(`${apiUrl}/analyze/domain?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: authHeaders(config, { json: false })
        });
        if (!response.ok) throw new Error("API Failed");
        return await response.json();
    } catch(err) {
        console.error("Domain Intelligence error:", err);
        return {
            age: 'Unknown',
            risk: 'Low',
            vt_score: 'N/A'
        };
    }
}

// ── B3. Network Traffic Monitor ─────────────────────────────────────
const networkLogs = {}; // Key: tabId, Value: array of requests

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only care about main frame and xmlhttprequest/scripts to avoid noise
    if (!['main_frame', 'sub_frame', 'xmlhttprequest', 'script'].includes(details.type)) return;
    
    const tabId = details.tabId;
    if (tabId === -1) return;
    
    if (!networkLogs[tabId]) networkLogs[tabId] = [];
    
    try {
        const urlObj = new URL(details.url);
        const isSuspiciousPort = urlObj.port && !['80', '443'].includes(urlObj.port);
        const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(urlObj.hostname);
        const isKnownTracker = /analytics|track|telemetry/i.test(urlObj.hostname);
        
        let risk = 'Safe';
        let flags = [];
        if (isSuspiciousPort) { risk = 'High'; flags.push(`Unusual Port: ${urlObj.port}`); }
        if (isIpAddress) { risk = 'Suspicious'; flags.push('Direct IP connection'); }
        if (isKnownTracker) { risk = 'Suspicious'; flags.push('Tracker/Telemetry'); }
        if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') return;
        
        // Add to logs, keeping max 50 per tab
        networkLogs[tabId].unshift({
            url: details.url,
            hostname: urlObj.hostname,
            type: details.type,
            risk: risk,
            flags: flags,
            timestamp: Date.now()
        });
        
        if (networkLogs[tabId].length > 50) {
            networkLogs[tabId].pop();
        }
    } catch(e) {}
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
    delete networkLogs[tabId];
});

// Expose internal handler mapping for getNetworkLogs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNetworkLogs") {
        const tabId = request.tabId;
        sendResponse({ logs: networkLogs[tabId] || [] });
        return true;
    }
});

// ── AI Workplace Guard helpers ──────────────────────────────────────────

async function fetchPolicy(apiBase, orgToken) {
  try {
    const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/policies/cache`, {
      headers: { 'X-Org-Token': orgToken },
    });
    if (r.ok) {
      cachedPolicy = await r.json();
      await chrome.storage.local.set({ cs_policy: cachedPolicy });
    }
  } catch (_e) {
    const stored = await chrome.storage.local.get('cs_policy');
    cachedPolicy = stored.cs_policy || null;
  }
  return cachedPolicy;
}

async function flushQueue() {
  const { cs_ingest_queue = [] } = await chrome.storage.local.get('cs_ingest_queue');
  if (!cs_ingest_queue.length) return;
  const remaining = [];
  const seenSubmitIds = new Set();
  for (const item of cs_ingest_queue) {
    const sid = item.payload?.client_submit_id;
    if (sid && seenSubmitIds.has(sid)) continue;
    if (sid) seenSubmitIds.add(sid);
    const result = await postEvent(item.config, item.payload);
    if (!result.ok) remaining.push(item);
  }
  await chrome.storage.local.set({ cs_ingest_queue: remaining });
}

async function postEvent(config, payload) {
  const url = `${config.apiBase.replace(/\/$/, '')}/api/events`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Token': config.orgToken,
      },
      body: JSON.stringify(payload),
    });
    let body = {};
    try {
      body = await r.json();
    } catch (_e) {
      body = {};
    }
    return {
      ok: r.ok,
      status: r.status,
      event_id: body.event_id,
      duplicate: Boolean(body.duplicate),
      body,
    };
  } catch (_e) {
    return { ok: false };
  }
}

async function patchEventResponse(config, eventId, responseText, userToken) {
  const url = `${config.apiBase.replace(/\/$/, '')}/api/events/${eventId}/response`;
  try {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Token': config.orgToken,
      },
      body: JSON.stringify({ user_token: userToken, response_text: responseText }),
    });
    return r.ok;
  } catch (_e) {
    return false;
  }
}

function blackoutPage(message) {
  const id = 'cybersentinel-org-blackout';
  if (document.getElementById(id)) return;
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', 'alert');
  el.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:600 18px/1.5 system-ui,sans-serif;';
  el.textContent =
    message || 'AI access paused by your organization. Contact your manager or IT if you need help.';
  document.documentElement.appendChild(el);
}

async function runEnforcementAction(action) {
  const tabs = await chrome.tabs.query({ url: AI_TAB_URL_PATTERNS });
  const msg = 'AI access paused by your organization security team. Contact your manager.';

  if (action === 'close_ai_tabs') {
    const ids = tabs.map((t) => t.id).filter(Boolean);
    if (ids.length) await chrome.tabs.remove(ids);
    return;
  }

  if (action === 'blackout_screen') {
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: blackoutPage,
          args: [msg],
        });
      } catch (_e) {
        /* tab may not allow scripting */
      }
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'APPLY_BLACKOUT', message: msg });
      } catch (_e2) {
        /* content script may be absent */
      }
    }
  }
}

async function pollEnforcement() {
  const data = await getApiConfig();
  if (!data.orgToken || !data.userToken || !data.apiOrigin) return;
  const apiBase = data.apiOrigin;
  try {
    const r = await fetch(`${apiBase}/api/enforcement/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Token': data.orgToken,
      },
      body: JSON.stringify({ user_token: data.userToken }),
    });
    if (!r.ok) return;
    const body = await r.json();
    for (const item of body.actions || []) {
      await runEnforcementAction(item.action);
      await fetch(`${apiBase}/api/enforcement/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Token': data.orgToken,
        },
        body: JSON.stringify({
          user_token: data.userToken,
          action_id: item.id,
          success: true,
        }),
      });
    }
  } catch (_e) {
    /* silent */
  }
}
