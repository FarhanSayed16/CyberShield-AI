// Content Script injected into pages

const OVERLAY_ID = 'cybersentinel-overlay-root';
const DEFAULT_DASHBOARD_BASE = '';
let _dashboardBaseUrl = DEFAULT_DASHBOARD_BASE;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadDashboardBaseUrl() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['dashboardBaseUrl'], (result) => {
        _dashboardBaseUrl = (result.dashboardBaseUrl || DEFAULT_DASHBOARD_BASE).replace(/\/$/, '');
        resolve(_dashboardBaseUrl);
      });
    } catch {
      resolve(_dashboardBaseUrl);
    }
  });
}

function getDashboardBaseUrl() {
  return _dashboardBaseUrl || DEFAULT_DASHBOARD_BASE;
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.dashboardBaseUrl) {
      _dashboardBaseUrl = (changes.dashboardBaseUrl.newValue || DEFAULT_DASHBOARD_BASE).replace(/\/$/, '');
    }
  });
} catch (_) { /* ignore */ }

loadDashboardBaseUrl();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showScanOverlay") {
    updateQuickballState('Scanning...');
    if (window.__csQbApi && window.__csQbApi.showInlineLoading) {
      window.__csQbApi.showInlineLoading();
    }
  } else if (request.action === "updateScanOverlay") {
    updateQuickballWithResult(request.result);
  } else if (request.action === "scanOverlayError") {
    showToast("CyberSentinel Error", request.error, 'error');
    if (window.__csQbApi && window.__csQbApi.scanFailed) {
      window.__csQbApi.scanFailed(request.error || 'Scan failed');
    }
  } else if (request.action === "showWarningBlocker") {
    createFullPageBlocker(request.data);
  } else if (request.action === "aiAssistantResponse") {
    handleAiResponse(request.response);
  } else if (request.action === "toast") {
    showToast(request.title, request.message, request.type);
  } else if (request.action === "extractAndScanPageText") {
    // Auto-scan: extract visible text and send it back to background for phishing analysis
    updateQuickballState('Scanning...');
    const pageText = extractPageText();
    if (pageText && pageText.length > 30) {
      chrome.runtime.sendMessage({ action: "pageTextForScan", text: pageText });
    }
    // Also scan external links on the page
    scanPageLinks();
  }
});

function createOverlay(text, type) {
  // Remove existing
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = OVERLAY_ID;
  
  // Truncate text for display
  const displaySnippet = text.length > 50 ? text.substring(0, 50) + '...' : text;
  
  container.innerHTML = `
    <div class="cs-glass-panel">
      <div class="cs-header">
        <div class="cs-logo">🛡️</div>
        <span>CyberSentinel Scanning...</span>
        <button class="cs-close-btn" id="cs-close-overlay">×</button>
      </div>
      <div class="cs-body">
        <p class="cs-analyzing-text">Analyzing ${type === 'url' ? 'link' : 'text'} for threats</p>
        <p class="cs-snippet">"${escapeHtml(displaySnippet)}"</p>
        <div class="cs-loader-bar">
          <div class="cs-loader-fill"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  
  document.getElementById('cs-close-overlay').addEventListener('click', () => {
    container.remove();
  });
}

function updateOverlayWithResult(result) {
  const container = document.getElementById(OVERLAY_ID);
  if (!container) return;

  const isSafe = result.threat_level === 'Safe';
  const riskColor = 
    isSafe ? '#10B981' : 
    result.risk_score >= 80 ? '#EF4444' : 
    result.risk_score >= 50 ? '#F59E0B' : '#3B82F6';

  const threatLevel = escapeHtml(result.threat_level);
  const threatType = escapeHtml((result.threat_type || '').replace('_', ' '));
  const explanation = escapeHtml(result.explanation || '');
  const indicators = (result.indicators || []).map(ind =>
    `<span class="cs-ind-chip">🔸 ${escapeHtml(ind)}</span>`
  ).join('');
  const actions = (result.recommended_actions || []).map(act =>
    `<div class="cs-act">✓ ${escapeHtml(act)}</div>`
  ).join('');
  const reportUrl = `${getDashboardBaseUrl()}/threats?id=${encodeURIComponent(result.id || '')}`;

  container.innerHTML = `
    <div class="cs-glass-panel" style="border-top: 4px solid ${riskColor}">
      <div class="cs-header">
        <div class="cs-logo">🛡️</div>
        <span>CyberSentinel AI Report</span>
        <button class="cs-close-btn" id="cs-close-overlay">×</button>
      </div>
      <div class="cs-body">
        <div class="cs-result-header">
          <span class="cs-pill" style="background: ${riskColor}33; color: ${riskColor}; border: 1px solid ${riskColor}66;">
            ${threatLevel}
          </span>
          <span class="cs-threat-type">${threatType}</span>
        </div>
        
        <p class="cs-explanation">${explanation}</p>
        
        ${indicators ? `<div class="cs-indicators">${indicators}</div>` : ''}
        
        <div class="cs-actions">${actions}</div>
      </div>
      <div class="cs-footer">
        Score: <strong style="color: ${riskColor}">${Number(result.risk_score) || 0}/100</strong>
        <a href="${escapeHtml(reportUrl)}" target="_blank" class="cs-link">View Full Report</a>
      </div>
    </div>
  `;

  document.getElementById('cs-close-overlay').addEventListener('click', () => {
    container.remove();
  });
}

function updateOverlayWithError(errorMsg) {
  const container = document.getElementById(OVERLAY_ID);
  if (!container) return;
  
  container.innerHTML = `
    <div class="cs-glass-panel" style="border-top: 4px solid #EF4444">
      <div class="cs-header">
        <div class="cs-logo">🛡️</div>
        <span>CyberSentinel Error</span>
        <button class="cs-close-btn" id="cs-close-overlay">×</button>
      </div>
      <div class="cs-body">
        <p style="color: #F87171">${escapeHtml(errorMsg)}</p>
      </div>
    </div>
  `;
  document.getElementById('cs-close-overlay').addEventListener('click', () => container.remove());
}

function createFullPageBlocker(data) {
  // Very invasive full page block for malicious URLs
  const blocker = document.createElement('div');
  blocker.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647; 
    background: #0F172A; color: #F1F5F9; 
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: system-ui, sans-serif; text-align: center; p-6;
  `;
  
  const threatType = escapeHtml((data.threat_type || 'threat').replace('_', ' '));
  const explanation = escapeHtml(data.explanation || '');
  const riskScore = Number(data.risk_score) || 0;

  blocker.innerHTML = `
    <div style="max-width: 600px; padding: 40px; border-radius: 16px; background: #1E293B; border: 1px solid #EF444433; box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25);">
      <div style="font-size: 64px; margin-bottom: 24px;">⛔</div>
      <h1 style="color: #EF4444; font-size: 28px; font-weight: bold; margin-bottom: 16px;">Critical Security Threat Prevented</h1>
      <p style="color: #94A3B8; margin-bottom: 24px;">CyberSentinel AI blocked this page because it was identified as a <strong>${threatType}</strong> site with a risk score of ${riskScore}/100.</p>
      
      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #EF4444; padding: 16px; text-align: left; margin-bottom: 32px; font-size: 14px; border-radius: 4px;">
        <strong>AI Analysis:</strong> ${explanation}
      </div>
      
      <div style="display: flex; gap: 16px; justify-content: center;">
        <button id="cs-blocker-back" style="padding: 12px 24px; border-radius: 8px; border: none; background: #8B5CF6; color: white; font-weight: bold; cursor: pointer;">Go Back to Safety</button>
        <button id="cs-blocker-proceed" style="padding: 12px 24px; border-radius: 8px; border: 1px solid #475569; background: transparent; color: #94A3B8; cursor: pointer;">Proceed Anyway (Unsafe)</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(blocker);
  
  document.getElementById('cs-blocker-back').addEventListener('click', () => {
    window.history.back();
    if(window.history.length <= 1) window.close();
  });
  
  document.getElementById('cs-blocker-proceed').addEventListener('click', () => {
    blocker.remove(); // Let them proceed at their own risk
  });
}

/* Quickball UI lives in quickball.js (Shadow DOM) — see window.__csQbApi */

// Quickball mounted by quickball.js (loaded after this file)

/* =========================================================
   UI STATE MANAGERS & EVENT HANDLERS
   ========================================================= */

// Keyboard Shortcut listener (Ctrl + Shift + S)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
    if (window.__csQbApi) window.__csQbApi.toggleMenu();
  }
});

function showInlineLoading() {
  if (window.__csQbApi) window.__csQbApi.showInlineLoading();
}

function renderInlineResults(result) {
  if (window.__csQbApi) window.__csQbApi.renderInlineResults(result);
}

function renderAdvancedAnalysis(result, container) {
  // Kept for legacy callers; Quickball renders results itself.
  if (!container || !result?.advanced_analysis) return;
  container.innerHTML = '';
}

function updateQuickballState(stateName) {
  if (window.__csQbApi) window.__csQbApi.updateQuickballState(stateName);
}

function updateQuickballWithResult(result) {
  if (!result) return;
  if (window.__csQbApi) window.__csQbApi.updateQuickballWithResult(result);

  const isSafe = result.threat_level === 'Safe';
  const isHighRisk = (result.risk_score || 0) >= 80;
  const label = (result.threat_type || 'threat').replace(/_/g, ' ');
  addTimelineEvent('Analysis complete: ' + label);

  if (!isSafe) {
    showToast('CyberSentinel AI Alert', 'Detected ' + (result.threat_level || '') + ' threat: ' + (result.explanation || ''), isHighRisk ? 'error' : 'warning');
  } else {
    const lastSafeAt = sessionStorage.getItem('cs-last-safe-toast');
    const now = Date.now();
    if (!lastSafeAt || (now - parseInt(lastSafeAt, 10)) > 30000) {
      showToast('Page Scanned — Safe', 'No critical threats detected.', 'success');
      sessionStorage.setItem('cs-last-safe-toast', String(now));
    }
  }

  renderInlineResults(result);
}

function handleAiResponse(text) {
  if (window.__csQbApi) {
    window.__csQbApi.appendChatFromBg(String(text || ''));
    return;
  }
}

function addTimelineEvent(text) {
  if (window.__csQbApi) window.__csQbApi.addTimelineEvent(text);
}

/* =========================================================
   REAL-TIME THREAT TOAST ALERTS
   ========================================================= */
function showToast(title, message, type = 'warning') {
  const container = (window.__csQb && window.__csQb.toast) || document.getElementById('cybersentinel-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'cs-toast';
  
  const color = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#F59E0B';
  const icon = type === 'error' ? '🚨' : type === 'success' ? '✅' : '⚠';
  const duration = type === 'success' ? 4000 : 8000;
  
  toast.style.borderLeftColor = color;

  const ignoreId = `cs-toast-ignore-${Date.now()}`;
  const detailsId = `cs-toast-details-${Date.now()}`;
  toast.innerHTML = `
    <div class="cs-toast-header" style="color:${color}">
      <span>${icon}</span> ${escapeHtml(title)}
    </div>
    <div class="cs-toast-body">${escapeHtml(message)}</div>
    <div class="cs-toast-actions">
      <button class="cs-toast-btn" id="${ignoreId}">Ignore</button>
      <button class="cs-toast-btn cs-toast-btn-primary" style="background:${color}" id="${detailsId}">View Details</button>
    </div>
  `;

  container.appendChild(toast);

  toast.querySelector('#' + detailsId)?.addEventListener('click', () => {
    window.open(getDashboardBaseUrl(), '_blank');
  });

  // Wire Ignore button to Smart Whitelist System
  toast.querySelector('#' + ignoreId)?.addEventListener('click', () => {
    chrome.storage.local.get(['smartWhitelist'], (res) => {
        const wl = res.smartWhitelist || [];
        if (!wl.includes(window.location.hostname)) {
            wl.push(window.location.hostname);
            chrome.storage.local.set({ smartWhitelist: wl });
        }
    });
    toast.remove();
  });

  // Trigger entering animation
  requestAnimationFrame(() => {
    toast.classList.add('cs-toast-show');
  });

  // Auto remove based on severity type
  setTimeout(() => {
    toast.classList.remove('cs-toast-show');
    setTimeout(() => toast.remove(), 400); // Wait for transition
  }, duration);
}

/* =========================================================
   DOM SCANNER: REAL-TIME PAGE RISK SCANNER (MutationObserver)
   ========================================================= */
function startDOMScanner() {
  chrome.storage.local.get(['safetySettings'], (result) => {
    const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
    if (!isProtected) return;

    // Scan existing DOM on load
    scanDOMForThreats(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // ELEMENT_NODE
              scanDOMForThreats(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Add extension health monitor heartbeat and Adaptive Positioning Check
    setInterval(() => {
        if (!chrome.runtime || !chrome.runtime.id) return; // Stop if extension was reloaded

        // Health Dot + Adaptive Positioning (Shadow DOM Quickball)
        const api = window.__csQb;
        if (!api || !api.ball) return;
        const qb = api.ball;
        const dot = api.root.querySelector('.hd');
        if (dot) {
            dot.style.background = '#38BDF8';
            setTimeout(() => { dot.style.background = '#2dd4bf'; }, 1000);
        }

        if (!qb.classList.contains('dragging')) {
            const rect = qb.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            qb.style.visibility = 'hidden';
            const elementHovered = document.elementFromPoint(centerX, centerY);
            qb.style.visibility = 'visible';

            if (elementHovered && (elementHovered.tagName === 'INPUT' || elementHovered.tagName === 'BUTTON' || elementHovered.tagName === 'TEXTAREA')) {
               let currentTop = parseInt(qb.style.top || rect.top, 10);
               qb.style.top = `${Math.max(20, currentTop - 60)}px`;
            }
        }
    }, 5000);
  });
}

function scanDOMForThreats(rootNode) {
  if (!chrome.runtime || !chrome.runtime.id) return;
  
  try {
    chrome.storage.local.get(['smartWhitelist'], (res) => {
        if (chrome.runtime.lastError) return;
        const wl = res.smartWhitelist || [];
        if (wl.includes(window.location.hostname)) return;

      const currentHost = window.location.hostname;
      const isMajorDomain = ['google.com', 'microsoft.com', 'amazon.com', 'facebook.com', 'github.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'apple.com', 'netflix.com'].some(d => currentHost.includes(d));

      // 1. Detect password fields on non-major domains (credential harvesting)
      if (!isMajorDomain) {
        const passwords = rootNode.querySelectorAll ? rootNode.querySelectorAll("input[type='password']") : [];
        if (passwords.length > 0) {
          passwords.forEach(input => {
            if (!input.classList.contains('cs-suspicious-element')) {
              input.classList.add('cs-suspicious-element');
              showToast('Suspicious Login Form', 'CyberSentinel detected a login form on an unverified domain. Be cautious.', 'error');
              addTimelineEvent('Credential harvester form detected');
            }
          });
        }
      }

      // 2. Detect hidden iframes pointing to external domains
      const iframes = rootNode.querySelectorAll ? rootNode.querySelectorAll('iframe') : [];
      iframes.forEach(iframe => {
        if (iframe.classList.contains('cs-scanned')) return;
        iframe.classList.add('cs-scanned');
        const src = iframe.getAttribute('src') || '';
        if (src && !src.includes(currentHost) && !src.startsWith('about:') && !src.startsWith('javascript:')) {
          const style = getComputedStyle(iframe);
          const isHidden = style.display === 'none' || style.visibility === 'hidden' || 
                           parseInt(style.width) <= 1 || parseInt(style.height) <= 1 || 
                           parseFloat(style.opacity) === 0;
          if (isHidden) {
            iframe.classList.add('cs-suspicious-element');
            showToast('Hidden Iframe Detected', `A hidden iframe pointing to an external domain was found: ${new URL(src, window.location.href).hostname}`, 'error');
            addTimelineEvent('Hidden external iframe blocked');
          }
        }
      });

      // 3. Detect form actions pointing to external domains
      const forms = rootNode.querySelectorAll ? rootNode.querySelectorAll('form[action]') : [];
      forms.forEach(form => {
        if (form.classList.contains('cs-scanned')) return;
        form.classList.add('cs-scanned');
        const action = form.getAttribute('action') || '';
        try {
          const actionUrl = new URL(action, window.location.href);
          if (actionUrl.hostname !== currentHost && action !== '' && !action.startsWith('#') && !action.startsWith('javascript:')) {
            form.classList.add('cs-suspicious-element');
            showToast('External Form Submission', `A form on this page submits data to: ${actionUrl.hostname}. Verify this is legitimate.`, 'warning');
            addTimelineEvent(`External form action: ${actionUrl.hostname}`);
          }
        } catch(e) { /* invalid URL, ignore */ }
      });
    });
  } catch (e) {
    // Ignore Extension context invalidated errors
  }
}

/* =========================================================
   PAGE TEXT EXTRACTION FOR AUTO-SCAN
   ========================================================= */
function extractPageText() {
  const title = document.title || '';
  const meta = document.querySelector('meta[name="description"]');
  const metaDesc = meta ? meta.getAttribute('content') || '' : '';
  const bodyText = document.body ? document.body.innerText.substring(0, 3000) : '';
  return `${title}\n${metaDesc}\n${bodyText}`.trim();
}

/* =========================================================
   PAGE LINK SCANNER
   ========================================================= */
function scanPageLinks() {
  if (!chrome.runtime || !chrome.runtime.id) return;
  
  const currentHost = window.location.hostname;
  const allLinks = document.querySelectorAll('a[href]');
  const externalLinks = new Set();
  
  allLinks.forEach(link => {
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      if (url.hostname !== currentHost && url.protocol.startsWith('http') && !link.classList.contains('cs-link-scanned')) {
        link.classList.add('cs-link-scanned');
        externalLinks.add(url.href);
      }
    } catch(e) { /* invalid href */ }
  });
  
  // Only scan first 5 unique external links to avoid API flooding
  const linksToScan = Array.from(externalLinks).slice(0, 5);
  let flaggedCount = 0;
  
  linksToScan.forEach(linkUrl => {
    chrome.runtime.sendMessage({ action: "scanExternalLink", url: linkUrl });
  });
  
  if (linksToScan.length > 0) {
    addTimelineEvent(`Scanning ${linksToScan.length} external links...`);
  }
}

// Start watching the DOM
startDOMScanner();

// ── Bridge for Dashboard (React) ↔ Extension ────────────────────────
window.addEventListener("message", (event) => {
  const dashboardOrigin = getDashboardBaseUrl();
  // Only accept commands from the configured dashboard origin (E4)
  if (!window.location.href.startsWith(dashboardOrigin) || event.origin !== dashboardOrigin) {
    return;
  }
  if (event.data.type === "CYBER_SENTINEL_HISTORY_SCAN") {
    chrome.runtime.sendMessage({ action: "scanHistory", limit: event.data.limit || 50 }, (response) => {
      window.postMessage({ type: "CYBER_SENTINEL_HISTORY_RESULT", data: response }, dashboardOrigin);
    });
  }
});
