// Background Service Worker

// Background Service Worker

const DEFAULT_API_URL = 'http://localhost:8000/api';
const DEFAULT_API_KEY = 'dev-key';

async function getApiConfig() {
  const result = await chrome.storage.local.get(['apiBaseUrl', 'apiKey']);
  return {
    apiUrl: result.apiBaseUrl || DEFAULT_API_URL,
    apiKey: result.apiKey || DEFAULT_API_KEY
  };
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

// Create context menu for scanning selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scanSelectedText",
    title: "Scan with CyberSentinel AI",
    contexts: ["selection", "link"]
  });
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

// Handle messages from content script (Quickball buttons & auto-scan)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "manualScanFromQuickball") {
    const tabId = sender.tab.id;
    chrome.tabs.sendMessage(tabId, { action: "showScanOverlay" });
    const pageTier = "tier" + (request.tier || "3");
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
    const tierStr = "tier" + (request.tier || "3");
    analyzeThreatWithTier(request.content, inputType, tabId, tierStr);
  } else if (request.action === "manualFileScan") {
    // File upload for deepfake detection
    const tabId = sender.tab.id;
    const fileTierStr = "tier" + (request.tier || "3");
    analyzeThreatWithTier(request.fileData, "image", tabId, fileTierStr);
  } else if (request.action === "askAiAssistant") {
    const tabId = sender.tab.id;
    getApiConfig().then(({ apiUrl, apiKey }) => {
      fetch(`${apiUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
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
        getApiConfig().then(({ apiUrl, apiKey }) => {
          fetch(`${apiUrl}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
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
        getApiConfig().then(({ apiUrl, apiKey }) => {
            fetch(`${apiUrl}/analyze/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
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
    // Tell content script to extract visible text and send it back
    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, { action: "extractAndScanPageText" }).catch(() => {});
    }, 1500); // Wait for page to settle
  }
});

// Talk to FastAPI Backend — URL quick check
async function analyzeURLQuick(url, tabId) {
  try {
    const { apiUrl, apiKey } = await getApiConfig();
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ source: 'extension', type: 'url', content: url })
    });
    
    const domainReputation = await checkDomainReputation(url);

    if (response.ok) {
      const data = await response.json();
      
      if (domainReputation.risk === 'High') {
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
    }
  } catch (error) {
    console.error("Quick analyze failed:", error);
  }
}

async function analyzeThreat(content, type, tabId) {
  try {
    const { apiUrl, apiKey } = await getApiConfig();
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ source: 'extension', type: type, content: content })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (type === 'url') {
        const domainReputation = await checkDomainReputation(content);
        if (domainReputation.risk === 'High') {
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
  try {
    const { apiUrl, apiKey } = await getApiConfig();
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ source: 'extension', type: type, content: content, tier: tier })
    });
    
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
        const { apiUrl, apiKey } = await getApiConfig();
        const response = await fetch(`${apiUrl}/analyze/domain?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
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
