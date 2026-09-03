// Content Script injected into pages

const OVERLAY_ID = 'cybersentinel-overlay-root';
const DEFAULT_DASHBOARD_BASE = 'http://localhost:5173';
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
  } else if (request.action === "updateScanOverlay") {
    updateQuickballWithResult(request.result);
  } else if (request.action === "scanOverlayError") {
    showToast("CyberSentinel Error", request.error, 'error');
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

function injectQuickball() {
  if (document.getElementById('cybersentinel-quickball')) return;

  // 1. Inject Toast Container
  const toastContainer = document.createElement('div');
  toastContainer.id = 'cybersentinel-toast-container';
  document.body.appendChild(toastContainer);

  // 2. Inject Menu
  const menu = document.createElement('div');
  menu.id = 'cybersentinel-qb-menu';
  menu.innerHTML = `
    <div class="cs-qb-menu-header" style="display:flex; justify-content:space-between; align-items:center;">
        CYBERSENTINEL ACTION CENTER
        <span class="cs-verified-badge" id="cs-qb-domain-badge">Analysing...</span>
    </div>

    <div class="cs-score-meter-container">
        <div class="cs-score-meter-header">
            <span>Page Security Score</span>
            <span id="cs-qb-score-text">100%</span>
        </div>
        <div class="cs-score-meter-bar">
            <div class="cs-score-meter-fill" id="cs-qb-score-fill" style="width: 100%;"></div>
        </div>
    </div>

    <button class="cs-qb-menu-btn cs-qb-menu-btn-primary" id="cs-qb-btn-dashboard"><span>📊</span> Open Dashboard</button>

    <!-- ═══ TIER SELECTION ═══ -->
    <div class="cs-control-group">
      <label class="cs-control-label">⚙ AI Engine Tier</label>
      <select class="cs-tier-select" id="cs-tier-select">
        <option value="auto" selected>Auto — Gemini + optional ML</option>
        <option value="1">Tier 1 — Heuristics / remote ML</option>
        <option value="2">Tier 2 — Enrichment / remote ML</option>
        <option value="3">Tier 3 — Gemini AI</option>
      </select>
    </div>

    <!-- ═══ TEXT/URL SCAN ═══ -->
    <div class="cs-control-group">
      <label class="cs-control-label">🔍 Scan Content</label>
      <select class="cs-scan-type-select" id="cs-scan-type">
        <option value="url">Malicious URL Detection</option>
        <option value="text">Phishing Email / Text</option>
        <option value="prompt">AI Prompt Injection</option>
      </select>
      <div class="cs-scan-input-row">
        <input type="text" class="cs-scan-input" id="cs-scan-input" placeholder="Paste URL or text here...">
        <button class="cs-scan-submit" id="cs-scan-submit">⏎</button>
      </div>
    </div>

    <!-- ═══ FILE UPLOAD (Deepfake) ═══ -->
    <div class="cs-control-group">
      <label class="cs-control-label">📎 Deepfake Detection</label>
      <div class="cs-upload-zone" id="cs-upload-zone">
        <span class="cs-upload-icon" id="cs-upload-icon">🖼️</span>
        <img id="cs-upload-preview" style="display:none; max-width: 100%; max-height: 120px; border-radius: 8px; margin-bottom: 8px; object-fit: contain;">
        <span class="cs-upload-text" id="cs-upload-text">Upload Image or Video</span>
        <span class="cs-upload-hint" id="cs-upload-hint">png, jpg, jpeg, mp4</span>
        <input type="file" id="cs-file-input" accept=".png,.jpg,.jpeg,.mp4" style="display:none;">
      </div>
      <button class="cs-scan-submit-wide" id="cs-upload-submit" style="display:none; width:100%; margin-top:8px;">Send for Analysis ➔</button>
    </div>

    <!-- ═══ LIVE DETECTION TOGGLE ═══ -->
    <div class="cs-live-detection-row">
      <span>🔴 Live Page Detection</span>
      <label class="cs-toggle-switch">
        <input type="checkbox" id="cs-live-toggle" checked>
        <span class="cs-toggle-slider"></span>
      </label>
    </div>

    <!-- ═══ EXISTING ACTION BUTTONS ═══ -->
    <button class="cs-qb-menu-btn" id="cs-qb-btn-scan"><span>🔍</span> Manual Page Scan</button>
    <button class="cs-qb-menu-btn" id="cs-qb-btn-protect"><span>🛡️</span> Toggle Protection</button>
    <button class="cs-qb-menu-btn" id="cs-qb-btn-chat"><span>💬</span> Ask CyberSentinel</button>

    <!-- ═══ INLINE RESULTS PANEL (hidden until scan) ═══ -->
    <div id="cs-inline-results" class="cs-inline-results" style="display:none;">
      <div class="cs-results-header">
        <span class="cs-results-title">📋 Analysis Results</span>
        <button class="cs-results-close" id="cs-results-close">✕</button>
      </div>
      <div id="cs-results-loading" style="display:none;">
        <div class="cs-results-scanning">
          <div class="cs-scan-spinner"></div>
          <span>Analyzing with AI Engine...</span>
        </div>
      </div>
      <div id="cs-results-body" style="display:none;">
        <div class="cs-kpi-row" id="cs-kpi-row"></div>
        <div class="cs-results-explanation" id="cs-results-explanation"></div>
        <div class="cs-results-indicators" id="cs-results-indicators"></div>
        <div class="cs-results-actions" id="cs-results-actions"></div>
        <div id="cs-results-advanced"></div>
        <a class="cs-results-view-full" id="cs-results-view-full" href="#" target="_blank">View Full Report →</a>
      </div>
    </div>

    <div id="cs-advanced-analysis" style="display: none;"></div>

    <div class="cs-soc-timeline" id="cs-soc-timeline">
        <div class="cs-soc-entry"><span class="cs-soc-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span><span class="cs-soc-event">System initialized.</span></div>
    </div>

    <div class="cs-health-monitor">
        <span><span class="cs-health-dot"></span>Engine Online</span>
        <span id="cs-qb-risk-status">Safe</span>
    </div>

    <div id="cybersentinel-ai-panel">
        <div class="cs-ai-chat-history" id="cs-ai-chat-history">
            <div class="cs-msg-ai">Hi! I am CyberSentinel. Ask me anything about this page's safety.</div>
        </div>
        <div class="cs-ai-input-wrap">
            <input type="text" class="cs-ai-input" id="cs-ai-input" placeholder="Ask a question...">
            <button class="cs-ai-send" id="cs-ai-send">➔</button>
        </div>
    </div>
  `;
  document.body.appendChild(menu);

  // 3. Inject Quickball
  const quickball = document.createElement('div');
  quickball.id = 'cybersentinel-quickball';
  quickball.className = 'quickball-safe';
  quickball.innerHTML = `
    <div class="cs-radar-ring" style="display:none;" id="cs-qb-radar"></div>
    <div class="cs-qb-icon">🛡️</div>
  `;
  document.body.appendChild(quickball);

  // Restore Saved Position
  chrome.storage.local.get(['qbPosition'], (result) => {
    if (result.qbPosition) {
      quickball.style.left = result.qbPosition.x + 'px';
      quickball.style.top = result.qbPosition.y + 'px';
    }
  });

  // 4. Drag & Drop Physics
  let isDragging = false;
  let startX, startY, initialX, initialY;

  quickball.addEventListener('mousedown', (e) => {
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = quickball.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
      if (!isDragging) {
        isDragging = true;
        quickball.classList.add('cs-qb-dragging');
        menu.classList.remove('cs-qb-menu-active');
        quickball.classList.remove('cs-qb-menu-open');
      }
      let newX = e.clientX - initialX;
      let newY = e.clientY - initialY;
      newX = Math.max(0, Math.min(newX, window.innerWidth - quickball.offsetWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - quickball.offsetHeight));
      quickball.style.left = `${newX}px`;
      quickball.style.top = `${newY}px`;
    }
  }

  function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (isDragging) {
      quickball.classList.remove('cs-qb-dragging');
      snapToEdge();
      chrome.storage.local.set({ qbPosition: { x: parseInt(quickball.style.left), y: parseInt(quickball.style.top) } });
    } else {
      toggleMenu();
    }
  }

  function snapToEdge() {
    const rect = quickball.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    if (centerX < window.innerWidth / 2) {
      quickball.style.left = '24px';
    } else {
      quickball.style.left = `${window.innerWidth - rect.width - 24}px`;
    }
  }

  function toggleMenu() {
    const rect = quickball.getBoundingClientRect();
    const isShowing = menu.classList.contains('cs-qb-menu-active');
    if (!isShowing) {
      const centerX = rect.left + (rect.width / 2);
      if (centerX < window.innerWidth / 2) {
        menu.style.left = `${rect.right + 16}px`;
      } else {
        menu.style.left = `${rect.left - 320 - 16}px`;
      }
      const menuHeight = menu.offsetHeight || 600;
      let menuTop = rect.top;
      // Use window.innerHeight strictly so it doesn't overflow the viewport
      if (menuTop + menuHeight > window.innerHeight - 24) {
          menuTop = window.innerHeight - menuHeight - 24;
      }
      menuTop = Math.max(24, menuTop);
      menu.style.top = `${menuTop}px`;
      menu.classList.add('cs-qb-menu-active');
      quickball.classList.add('cs-qb-menu-open');
    } else {
      menu.classList.remove('cs-qb-menu-active');
      quickball.classList.remove('cs-qb-menu-open');
    }
  }

  // 5. Close menu on outside click
  document.addEventListener('mousedown', (e) => {
    if (!quickball.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('cs-qb-menu-active');
      quickball.classList.remove('cs-qb-menu-open');
    }
  });

  // ═══════════════════════════════════════════════════
  //  ACTION HANDLERS
  // ═══════════════════════════════════════════════════

  // Dashboard
  document.getElementById('cs-qb-btn-dashboard').addEventListener('click', () => {
    window.open(getDashboardBaseUrl(), '_blank');
    toggleMenu();
  });

  // Manual Page Scan
  document.getElementById('cs-qb-btn-scan').addEventListener('click', () => {
    const tier = document.getElementById('cs-tier-select').value;
    chrome.runtime.sendMessage({ action: "manualScanFromQuickball", url: window.location.href, tier });
    showInlineLoading();
  });

  // Protection Toggle
  const protectBtn = document.getElementById('cs-qb-btn-protect');
  chrome.storage.local.get(['safetySettings'], (result) => {
    const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
    updateProtectButtonText(isProtected);
  });
  protectBtn.addEventListener('click', () => {
    chrome.storage.local.get(['safetySettings'], (result) => {
      const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
      const newState = !isProtected;
      chrome.storage.local.set({ safetySettings: { blockHighRisk: newState } }, () => {
        updateProtectButtonText(newState);
      });
    });
  });
  function updateProtectButtonText(isProtected) {
    if (isProtected) {
      protectBtn.innerHTML = `<span>🛡️</span> Pause Protection`;
      protectBtn.style.color = '#E2E8F0';
    } else {
      protectBtn.innerHTML = `<span style="opacity:0.5">⏸️</span> Resume Protection`;
      protectBtn.style.color = '#EF4444';
    }
  }

  // ═══ TEXT/URL SCAN HANDLER ═══
  document.getElementById('cs-scan-submit').addEventListener('click', () => {
    const content = document.getElementById('cs-scan-input').value.trim();
    if (!content) return;
    const tier = document.getElementById('cs-tier-select').value;
    const scanType = document.getElementById('cs-scan-type').value;
    showInlineLoading();
    addTimelineEvent(`Scanning ${scanType} input...`);
    chrome.runtime.sendMessage({ action: "manualTextScan", content, scanType, tier });
  });
  document.getElementById('cs-scan-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('cs-scan-submit').click();
  });

  // ═══ FILE UPLOAD HANDLER ═══
  const uploadZone = document.getElementById('cs-upload-zone');
  const fileInput = document.getElementById('cs-file-input');
  const uploadPreview = document.getElementById('cs-upload-preview');
  const uploadSubmit = document.getElementById('cs-upload-submit');
  const uploadIcon = document.getElementById('cs-upload-icon');
  const uploadHint = document.getElementById('cs-upload-hint');
  let currentFileBase64 = null;
  let currentFileName = null;

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    currentFileName = file.name;
    document.getElementById('cs-upload-text').innerText = file.name;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      currentFileBase64 = dataUrl.split(',')[1];
      
      if (file.type.startsWith('image/')) {
          uploadPreview.src = dataUrl;
          uploadPreview.style.display = 'block';
          uploadIcon.style.display = 'none';
          uploadHint.style.display = 'none';
      } else {
          uploadPreview.style.display = 'none';
          uploadIcon.style.display = 'block';
          uploadIcon.innerText = '🎥';
      }
      uploadSubmit.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
  
  uploadSubmit.addEventListener('click', () => {
      if (!currentFileBase64) return;
      const tier = document.getElementById('cs-tier-select').value;
      showInlineLoading();
      addTimelineEvent(`Uploading ${currentFileName} for deepfake scan...`);
      chrome.runtime.sendMessage({ action: "manualFileScan", fileData: currentFileBase64, fileName: currentFileName, tier });
  });

  // ═══ LIVE DETECTION TOGGLE ═══
  const liveToggle = document.getElementById('cs-live-toggle');
  chrome.storage.local.get(['safetySettings'], (result) => {
    const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
    liveToggle.checked = isProtected;
  });
  liveToggle.addEventListener('change', () => {
    const newState = liveToggle.checked;
    chrome.storage.local.set({ safetySettings: { blockHighRisk: newState } }, () => {
      updateProtectButtonText(newState);
      addTimelineEvent(newState ? 'Live detection enabled' : 'Live detection paused');
    });
  });

  // ═══ INLINE RESULTS CLOSE ═══
  document.getElementById('cs-results-close').addEventListener('click', () => {
    document.getElementById('cs-inline-results').style.display = 'none';
  });

  // AI Chat Handlers
  const chatBtn = document.getElementById('cs-qb-btn-chat');
  const aiPanel = document.getElementById('cybersentinel-ai-panel');
  const chatInput = document.getElementById('cs-ai-input');
  const chatSend = document.getElementById('cs-ai-send');
  const chatHistory = document.getElementById('cs-ai-chat-history');

  chatBtn.addEventListener('click', () => {
    aiPanel.classList.toggle('cs-panel-active');
  });

  function appendChat(msg, isUser) {
    const div = document.createElement('div');
    div.className = isUser ? 'cs-msg-user' : 'cs-msg-ai';
    div.innerText = msg;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  chatSend.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (!text) return;
    appendChat(text, true);
    chatInput.value = '';
    const typingDiv = document.createElement('div');
    typingDiv.className = 'cs-msg-ai';
    typingDiv.innerText = 'Thinking...';
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    chrome.runtime.sendMessage({ action: "askAiAssistant", query: text, url: window.location.href });
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chatSend.click();
  });
}

// Inject the floating indicator immediately when the script runs
injectQuickball();

/* =========================================================
   UI STATE MANAGERS & EVENT HANDLERS
   ========================================================= */

// Keyboard Shortcut listener (Ctrl + Shift + S)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
    const qb = document.getElementById('cybersentinel-quickball');
    if (qb) {
      qb.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }
  }
});

/* =========================================================
   INLINE RESULTS: Loading + Rendering
   ========================================================= */

function showInlineLoading() {
  const panel = document.getElementById('cs-inline-results');
  const loading = document.getElementById('cs-results-loading');
  const body = document.getElementById('cs-results-body');
  if (!panel) return;
  panel.style.display = 'block';
  loading.style.display = 'block';
  body.style.display = 'none';
}

function renderInlineResults(result) {
  const panel = document.getElementById('cs-inline-results');
  const loading = document.getElementById('cs-results-loading');
  const body = document.getElementById('cs-results-body');
  if (!panel) return;

  panel.style.display = 'block';
  loading.style.display = 'none';
  body.style.display = 'block';

  const isSafe = result.threat_level === 'Safe';
  const isHigh = result.risk_score >= 80;
  const riskColor = isSafe ? '#10B981' : isHigh ? '#EF4444' : '#F59E0B';
  const confidence = result.confidence !== undefined ? Math.round(result.confidence * 100) : '--';

  // KPI Cards
  document.getElementById('cs-kpi-row').innerHTML = `
    <div class="cs-kpi-card" style="border-color: ${riskColor}33;">
      <div class="cs-kpi-value" style="color: ${riskColor};">${Number(result.risk_score) || 0}</div>
      <div class="cs-kpi-label">Risk Score</div>
    </div>
    <div class="cs-kpi-card" style="border-color: ${riskColor}33;">
      <div class="cs-kpi-value" style="color: ${riskColor};">${escapeHtml(result.threat_level)}</div>
      <div class="cs-kpi-label">Threat Level</div>
    </div>
    <div class="cs-kpi-card">
      <div class="cs-kpi-value">${escapeHtml(String(confidence))}%</div>
      <div class="cs-kpi-label">Confidence</div>
    </div>
  `;

  // Explanation
  document.getElementById('cs-results-explanation').innerHTML = `
    <div class="cs-results-type" style="color: ${riskColor};">${escapeHtml((result.threat_type || 'benign').replace('_', ' '))}</div>
    <p>${escapeHtml(result.explanation || 'No detailed explanation available.')}</p>
  `;

  // Indicators
  const indContainer = document.getElementById('cs-results-indicators');
  if (result.indicators && result.indicators.length > 0) {
    indContainer.innerHTML = result.indicators.map(i => `<span class="cs-ind-chip">🔸 ${escapeHtml(i)}</span>`).join('');
    indContainer.style.display = 'flex';
  } else {
    indContainer.style.display = 'none';
  }

  // Actions
  const actContainer = document.getElementById('cs-results-actions');
  if (result.recommended_actions && result.recommended_actions.length > 0) {
    actContainer.innerHTML = `<div class="cs-actions">${result.recommended_actions.map(a => `<div class="cs-act">✓ ${escapeHtml(a)}</div>`).join('')}</div>`;
    actContainer.style.display = 'block';
  } else {
    actContainer.style.display = 'none';
  }

  // Advanced analysis (reuse existing rendering logic)
  const advContainer = document.getElementById('cs-results-advanced');
  if (result.advanced_analysis) {
    renderAdvancedAnalysis(result, advContainer);
  } else {
    advContainer.innerHTML = '';
  }

  // View Full Report link
  const fullLink = document.getElementById('cs-results-view-full');
  fullLink.href = `${getDashboardBaseUrl()}/threats?id=${encodeURIComponent(result.id || '')}`;
}

function renderAdvancedAnalysis(result, container) {
  const adv = result.advanced_analysis;
  let html = '';
  
  if (result.threat_type === 'phishing' && adv.indicators_of_compromise) {
    html += `<div class="cs-adv-section"><div class="cs-adv-title">🚨 Threat Indicators</div><div class="cs-adv-pills">`;
    adv.indicators_of_compromise.forEach(ioc => {
      const sevColor = ioc.severity === 'Critical' ? '#EF4444' : ioc.severity === 'High' ? '#F97316' : '#EAB308';
      html += `<span class="cs-adv-pill" style="border-color:${sevColor}55; color:${sevColor}"><strong style="color:#CBD5E1">${escapeHtml(ioc.type)}:</strong> ${escapeHtml(ioc.value)}</span>`;
    });
    html += `</div></div>`;
    if (adv.mitigation_steps && adv.mitigation_steps.length > 0) {
      html += `<div class="cs-adv-section mt-2"><div class="cs-adv-title" style="color:#10B981">🛡️ Mitigation</div><ul class="cs-adv-list">`;
      adv.mitigation_steps.forEach(step => html += `<li>${escapeHtml(step)}</li>`);
      html += `</ul></div>`;
    }
  } else if (result.threat_type === 'deepfake' && adv.detected_artifacts) {
    if (adv.detected_artifacts.length > 0) {
      html += `<div class="cs-adv-section"><div class="cs-adv-title" style="color:#EF4444">❌ Synthetic Artifacts</div><ul class="cs-adv-list cs-adv-list-bad">`;
      adv.detected_artifacts.forEach(art => html += `<li>${escapeHtml(art)}</li>`);
      html += `</ul></div>`;
    }
    if (adv.authenticity_signals && adv.authenticity_signals.length > 0) {
      html += `<div class="cs-adv-section mt-2"><div class="cs-adv-title" style="color:#10B981">✅ Human Signals</div><ul class="cs-adv-list cs-adv-list-good">`;
      adv.authenticity_signals.forEach(sig => html += `<li>${escapeHtml(sig)}</li>`);
      html += `</ul></div>`;
    }
  } else if (result.threat_type === 'prompt_injection' && adv.malicious_payloads) {
    html += `<div class="cs-adv-section"><div class="cs-adv-title" style="color:#EF4444">☠️ Payloads Blocked</div><div class="cs-adv-code-blocks">`;
    adv.malicious_payloads.forEach(payload => html += `<div class="cs-adv-code-snippet">${escapeHtml(payload)}</div>`);
    html += `</div></div>`;
  }

  container.innerHTML = html;
}

function updateQuickballState(stateName) {
  const quickball = document.getElementById('cybersentinel-quickball');
  if (!quickball) return;
  
  if (stateName === 'Scanning...') {
    quickball.className = 'quickball-scanning';
    document.getElementById('cs-qb-radar').style.display = 'block';
    addTimelineEvent('Scanning current page...');
    document.getElementById('cs-qb-domain-badge').innerText = 'Scanning';
    document.getElementById('cs-qb-domain-badge').style.color = '#38BDF8';
    document.getElementById('cs-qb-domain-badge').style.background = 'rgba(56, 189, 248, 0.1)';
    document.getElementById('cs-qb-domain-badge').style.borderColor = 'rgba(56, 189, 248, 0.3)';
  }
}

function updateQuickballWithResult(result) {
  const quickball = document.getElementById('cybersentinel-quickball');
  if (!quickball) return;
  document.getElementById('cs-qb-radar').style.display = 'none';

  const isSafe = result.threat_level === 'Safe';
  const isHighRisk = result.risk_score >= 80;

  // Change Classes
  if (isSafe) quickball.className = 'quickball-safe';
  else if (isHighRisk) quickball.className = 'quickball-danger';
  else quickball.className = 'quickball-warning';

  // Update Status & Badge
  document.getElementById('cs-qb-risk-status').innerText = result.threat_level;
  document.getElementById('cs-qb-domain-badge').innerText = isSafe ? '✓ Verified' : '⚠ Action Required';
  
  const color = isSafe ? '#10B981' : isHighRisk ? '#EF4444' : '#F59E0B';
  document.getElementById('cs-qb-domain-badge').style.color = color;
  document.getElementById('cs-qb-domain-badge').style.background = `${color}22`;
  document.getElementById('cs-qb-domain-badge').style.borderColor = `${color}55`;

  // Update Score Meter
  document.getElementById('cs-qb-score-text').innerText = `${100 - result.risk_score}%`;
  document.getElementById('cs-qb-score-fill').style.width = `${100 - result.risk_score}%`;
  
  // Render Advanced Analysis JSON Payload (Tier 3)
  const advContainer = document.getElementById('cs-advanced-analysis');
  if (result.advanced_analysis) {
      const adv = result.advanced_analysis;
      let html = '';
      
      // Phishing Payload Rendering
      if (result.threat_type === 'phishing' && adv.indicators_of_compromise) {
          html += `<div class="cs-adv-section"><div class="cs-adv-title">🚨 Threat Indicators</div><div class="cs-adv-pills">`;
          adv.indicators_of_compromise.forEach(ioc => {
              const sevColor = ioc.severity === 'Critical' ? '#EF4444' : ioc.severity === 'High' ? '#F97316' : '#EAB308';
              html += `<span class="cs-adv-pill" style="border-color:${sevColor}55; color:${sevColor}">
                        <strong style="color:#CBD5E1">${escapeHtml(ioc.type)}:</strong> ${escapeHtml(ioc.value)}
                       </span>`;
          });
          html += `</div></div>`;
          
          if (adv.mitigation_steps && adv.mitigation_steps.length > 0) {
              html += `<div class="cs-adv-section mt-2"><div class="cs-adv-title" style="color:#10B981">🛡️ Mitigation Commands</div><ul class="cs-adv-list">`;
              adv.mitigation_steps.forEach(step => html += `<li>${escapeHtml(step)}</li>`);
              html += `</ul></div>`;
          }
      }
      // Deepfake Payload Rendering
      else if (result.threat_type === 'deepfake' && adv.detected_artifacts) {
          if (adv.detected_artifacts.length > 0) {
              html += `<div class="cs-adv-section"><div class="cs-adv-title" style="color:#EF4444">❌ Synthetic Artifacts Found</div><ul class="cs-adv-list cs-adv-list-bad">`;
              adv.detected_artifacts.forEach(art => html += `<li>${escapeHtml(art)}</li>`);
              html += `</ul></div>`;
          }
          if (adv.authenticity_signals && adv.authenticity_signals.length > 0) {
              html += `<div class="cs-adv-section mt-2"><div class="cs-adv-title" style="color:#10B981">✅ Human Signals Detected</div><ul class="cs-adv-list cs-adv-list-good">`;
              adv.authenticity_signals.forEach(sig => html += `<li>${escapeHtml(sig)}</li>`);
              html += `</ul></div>`;
          }
      }
      // Prompt Injection Payload Rendering
      else if (result.threat_type === 'prompt_injection' && adv.malicious_payloads) {
          html += `<div class="cs-adv-section"><div class="cs-adv-title" style="color:#EF4444">☠️ Malicious Payloads Blocked</div><div class="cs-adv-code-blocks">`;
          adv.malicious_payloads.forEach(payload => {
              html += `<div class="cs-adv-code-snippet">${escapeHtml(payload)}</div>`;
          });
          html += `</div></div>`;
      }
      
      // Behavior Anomaly Payload Rendering
      else if (result.threat_type === 'behavior_anomaly' && adv.anomalies_detected) {
          html += `<div class="cs-adv-section"><div class="cs-adv-title" style="color:#F59E0B">⚠️ Baseline Deviations</div><ul class="cs-adv-list cs-adv-list-warn">`;
          adv.anomalies_detected.forEach(anom => html += `<li>${escapeHtml(anom)}</li>`);
          html += `</ul></div>`;
      }
      
      if (html) {
          advContainer.innerHTML = html;
          advContainer.style.display = 'block';
      } else {
          advContainer.style.display = 'none';
      }
  } else {
      advContainer.style.display = 'none';
  }
  
  // Timeline
  addTimelineEvent(`Analysis complete: ${result.threat_type.replace('_', ' ')}`);

  addTimelineEvent(`Analysis complete: ${result.threat_type.replace('_', ' ')}`);

  // Toast alert based on severity
  if (!isSafe) {
    showToast('CyberSentinel AI Alert', `Detected ${result.threat_level} threat: ${result.explanation}`, isHighRisk ? 'error' : 'warning');
  } else {
    // Check if we recently showed a safe heartbeat
    const lastSafeAt = sessionStorage.getItem('cs-last-safe-toast');
    const now = Date.now();
    if (!lastSafeAt || (now - parseInt(lastSafeAt)) > 30000) {
      showToast('Page Scanned — Safe', 'No critical threats detected.', 'success');
      sessionStorage.setItem('cs-last-safe-toast', now.toString());
    }
  }

  // ═══ Populate Inline Results Panel ═══
  renderInlineResults(result);
}

function handleAiResponse(text) {
  // Remove "Thinking..." node
  const chatHistory = document.getElementById('cs-ai-chat-history');
  if (!chatHistory) return;
  
  const thinkingNode = Array.from(chatHistory.children).find(n => n.innerText === 'Thinking...');
  if (thinkingNode) thinkingNode.remove();

  // Parse **bold** safely without injecting raw HTML (S5)
  const div = document.createElement('div');
  div.className = 'cs-msg-ai';
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      const strong = document.createElement('strong');
      strong.textContent = m[1];
      div.appendChild(strong);
    } else if (part) {
      div.appendChild(document.createTextNode(part));
    }
  });
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addTimelineEvent(text) {
  const timeline = document.getElementById('cs-soc-timeline');
  if (!timeline) return;
  
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'cs-soc-entry';
  div.innerHTML = `<span class="cs-soc-time">${escapeHtml(time)}</span><span class="cs-soc-event">${escapeHtml(text)}</span>`;
  timeline.prepend(div);
}

/* =========================================================
   REAL-TIME THREAT TOAST ALERTS
   ========================================================= */
function showToast(title, message, type = 'warning') {
  const container = document.getElementById('cybersentinel-toast-container');
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

  document.getElementById(detailsId).addEventListener('click', () => {
    window.open(getDashboardBaseUrl(), '_blank');
  });

  // Wire Ignore button to Smart Whitelist System
  document.getElementById(ignoreId).addEventListener('click', () => {
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

        // Health Dot
        const dot = document.querySelector('.cs-health-dot');
        if(dot) {
            dot.style.background = '#38BDF8';
            setTimeout(() => dot.style.background = '#10B981', 1000);
        }

        // Adaptive Positioning
        const qb = document.getElementById('cybersentinel-quickball');
        if (qb && !qb.classList.contains('cs-qb-dragging')) {
            const rect = qb.getBoundingClientRect();
            // Check if Quickball center overlaps an input/button
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Temporarily hide quickball to see what's underneath
            qb.style.display = 'none'; 
            const elementHovered = document.elementFromPoint(centerX, centerY);
            qb.style.display = 'flex';
            
            if (elementHovered && (elementHovered.tagName === 'INPUT' || elementHovered.tagName === 'BUTTON')) {
               // Shift Quickball up slightly to get out of the way
               let currentTop = parseInt(qb.style.top || rect.top);
               qb.style.top = `${Math.max(0, currentTop - 60)}px`;
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
