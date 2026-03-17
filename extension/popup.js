const DEFAULT_API_URL = 'http://localhost:8000/api';
const DEFAULT_API_KEY = 'dev-key';

async function getApiConfig() {
  const result = await chrome.storage.local.get(['apiBaseUrl', 'apiKey']);
  return {
    apiUrl: result.apiBaseUrl || DEFAULT_API_URL,
    apiKey: result.apiKey || DEFAULT_API_KEY
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const blockToggle = document.getElementById('block-toggle');
  const statusIcon = document.getElementById('popup-status-icon');
  const statusText = document.getElementById('popup-status-text');
  const statusSubtext = document.getElementById('popup-status-subtext');
  const threatCount = document.getElementById('popup-threat-count');
  const lastScanTime = document.getElementById('popup-last-scan');
  
  // Load saved state
  chrome.storage.local.get(['safetySettings'], (result) => {
    if (result.safetySettings) {
      blockToggle.checked = result.safetySettings.blockHighRisk;
      if (!result.safetySettings.blockHighRisk) {
        statusIcon.textContent = '⏸';
        statusText.textContent = 'Protection Paused';
        statusSubtext.textContent = 'Real-time scanning disabled';
        document.querySelector('.status-card').style.background = 'rgba(239, 68, 68, 0.1)';
        document.querySelector('.status-card').style.borderColor = 'rgba(239, 68, 68, 0.2)';
        statusIcon.style.color = '#EF4444';
        statusText.style.color = '#EF4444';
      }
    }
  });
  
  // Save state on change
  blockToggle.addEventListener('change', (e) => {
    const isProtected = e.target.checked;
    chrome.storage.local.set({ safetySettings: { blockHighRisk: isProtected } });
    
    if (isProtected) {
      statusIcon.textContent = '✓';
      statusText.textContent = 'Browser is Protected';
      statusSubtext.textContent = 'Real-time scanning enabled';
      document.querySelector('.status-card').style.background = 'rgba(16, 185, 129, 0.1)';
      document.querySelector('.status-card').style.borderColor = 'rgba(16, 185, 129, 0.2)';
      statusIcon.style.color = '#10B981';
      statusText.style.color = '#10B981';
    } else {
      statusIcon.textContent = '⏸';
      statusText.textContent = 'Protection Paused';
      statusSubtext.textContent = 'Real-time scanning disabled';
      document.querySelector('.status-card').style.background = 'rgba(239, 68, 68, 0.1)';
      document.querySelector('.status-card').style.borderColor = 'rgba(239, 68, 68, 0.2)';
      statusIcon.style.color = '#EF4444';
      statusText.style.color = '#EF4444';
    }
  });

  // API Config Logic
  const apiUrlInput = document.getElementById('api-url-input');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiBtn = document.getElementById('save-api-btn');
  const saveApiMsg = document.getElementById('save-api-msg');

  getApiConfig().then(config => {
    apiUrlInput.value = config.apiUrl;
    apiKeyInput.value = config.apiKey;
  });

  saveApiBtn.addEventListener('click', () => {
    const apiBaseUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
    const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;
    
    chrome.storage.local.set({ apiBaseUrl, apiKey }, () => {
      saveApiMsg.style.display = 'block';
      setTimeout(() => saveApiMsg.style.display = 'none', 2000);
      fetchLiveStats(); // Refresh stats with new config
    });
  });

// Fetch live stats from backend
  fetchLiveStats();

  // ── Tab Management ────────────────────────
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.style.display = 'none');
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';

      if (targetId === 'tab-network') {
        fetchNetworkLogs();
      }
    });
  });

  document.getElementById('refresh-network-btn').addEventListener('click', fetchNetworkLogs);
});

async function fetchLiveStats() {
  const threatCount = document.getElementById('popup-threat-count');
  const lastScanTime = document.getElementById('popup-last-scan');
  
  try {
    const { apiUrl, apiKey } = await getApiConfig();
    const response = await fetch(`${apiUrl}/stats`, {
      headers: { 'X-API-Key': apiKey }
    });
    
    if (response.ok) {
      const data = await response.json();
      threatCount.textContent = `${data.total_threats} threats detected`;
      
      // Show most recent timestamp
      if (data.last_24h && data.last_24h.timestamps.length > 0) {
        const lastTs = data.last_24h.timestamps[data.last_24h.timestamps.length - 1];
        const d = new Date(lastTs);
        lastScanTime.textContent = `Last activity: ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } else {
        lastScanTime.textContent = 'No recent scans';
      }
    } else {
      threatCount.textContent = 'Backend offline';
      lastScanTime.textContent = '';
    }
  } catch (err) {
    threatCount.textContent = 'Unable to connect';
    lastScanTime.textContent = 'Start backend server';
  }
}

function fetchNetworkLogs() {
  const container = document.getElementById('network-log-container');
  container.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748B;">Loading logs...</div>';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ action: "getNetworkLogs", tabId }, (response) => {
      const logs = response && response.logs ? response.logs : [];
      if (logs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748B;">No recent requests found for this tab.</div>';
        return;
      }

      container.innerHTML = '';
      logs.forEach(log => {
        const el = document.createElement('div');
        el.className = 'network-log';
        
        const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let flagsHtml = '';
        if (log.flags.length > 0) {
           flagsHtml = `<div style="margin-top: 4px; color: #EF4444;">${log.flags.join(', ')}</div>`;
        }
        
        el.innerHTML = `
          <div class="log-url">${log.hostname}</div>
          <div class="log-meta">
            <span>${log.type}</span>
            <span>${timeStr}</span>
          </div>
          <div style="margin-top: 6px;">
            <span class="log-risk risk-${log.risk.replace(/\s+/g, '')}">${log.risk}</span>
          </div>
          ${flagsHtml}
        `;
        container.appendChild(el);
      });
    });
  });
}
