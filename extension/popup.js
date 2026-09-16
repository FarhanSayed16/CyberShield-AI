async function getStoredConfig() {
  const result = await chrome.storage.local.get([
    'apiBase',
    'apiBaseUrl',
    'orgToken',
    'userToken',
    'dashboardBaseUrl',
  ]);
  let apiBase = (result.apiBase || '').replace(/\/$/, '');
  if (!apiBase && result.apiBaseUrl) {
    apiBase = String(result.apiBaseUrl).replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return {
    apiBase,
    orgToken: result.orgToken || '',
    userToken: result.userToken || '',
    dashboardBaseUrl: (result.dashboardBaseUrl || '').replace(/\/$/, ''),
  };
}

function setStatus(configured) {
  const statusText = document.getElementById('popup-status-text');
  const statusSub = document.getElementById('popup-status-subtext');
  const card = document.querySelector('.status-card');
  if (configured) {
    statusText.textContent = 'Monitoring active';
    statusText.className = 'status-text';
    statusSub.textContent = 'AI Guard + threat scan ready';
    card.style.background = 'rgba(16, 185, 129, 0.1)';
    card.style.borderColor = 'rgba(16, 185, 129, 0.2)';
  } else {
    statusText.textContent = 'Not configured';
    statusText.className = 'status-text inactive';
    statusSub.textContent = 'Set org & user tokens under Config';
    card.style.background = 'rgba(245, 158, 11, 0.1)';
    card.style.borderColor = 'rgba(245, 158, 11, 0.2)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const blockToggle = document.getElementById('block-toggle');
  const apiBaseInput = document.getElementById('api-base-input');
  const orgTokenInput = document.getElementById('org-token-input');
  const userTokenInput = document.getElementById('user-token-input');
  const dashboardUrlInput = document.getElementById('dashboard-url-input');
  const saveBtn = document.getElementById('save-config-btn');
  const saveMsg = document.getElementById('save-msg');
  const openDashboardLink = document.getElementById('open-dashboard-link');

  chrome.storage.local.get(['safetySettings'], (result) => {
    if (result.safetySettings) {
      blockToggle.checked = result.safetySettings.blockHighRisk;
    }
  });

  blockToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ safetySettings: { blockHighRisk: e.target.checked } });
  });

  getStoredConfig().then((config) => {
    apiBaseInput.value = config.apiBase;
    orgTokenInput.value = config.orgToken;
    userTokenInput.value = config.userToken;
    dashboardUrlInput.value = config.dashboardBaseUrl;
    if (config.dashboardBaseUrl) {
      openDashboardLink.href = config.dashboardBaseUrl;
    } else {
      openDashboardLink.removeAttribute('href');
      openDashboardLink.addEventListener('click', (ev) => {
        ev.preventDefault();
        alert('Set a Dashboard URL under Config first.');
      });
    }
    setStatus(Boolean(config.apiBase && config.orgToken && config.userToken));
    fetchLiveStats(config);
  });

  saveBtn.addEventListener('click', () => {
    const apiBase = apiBaseInput.value.trim().replace(/\/$/, '');
    const orgToken = orgTokenInput.value.trim();
    const userToken = userTokenInput.value.trim();
    const dashboardBaseUrl = dashboardUrlInput.value.trim().replace(/\/$/, '');

    chrome.storage.local.set(
      {
        apiBase,
        orgToken,
        userToken,
        dashboardBaseUrl,
        // Clear legacy API-key defaults so org tokens are preferred
        apiKey: '',
        apiBaseUrl: apiBase ? `${apiBase}/api` : '',
      },
      () => {
        openDashboardLink.href = dashboardBaseUrl || '#';
        saveMsg.style.display = 'block';
        setTimeout(() => {
          saveMsg.style.display = 'none';
        }, 2000);
        setStatus(Boolean(apiBase && orgToken && userToken));
        fetchLiveStats({ apiBase, orgToken, userToken });
        chrome.runtime.sendMessage({ type: 'POLL_ENFORCEMENT' });
      }
    );
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => {
        p.style.display = 'none';
      });
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';
      if (targetId === 'tab-network') fetchNetworkLogs();
    });
  });

  document.getElementById('refresh-network-btn').addEventListener('click', fetchNetworkLogs);
});

async function fetchLiveStats(config) {
  const threatCount = document.getElementById('popup-threat-count');
  if (!config?.apiBase || !config?.orgToken) {
    threatCount.textContent = '';
    return;
  }
  try {
    const response = await fetch(`${config.apiBase.replace(/\/$/, '')}/api/stats`, {
      headers: {
        'X-Org-Token': config.orgToken,
        ...(config.userToken ? { 'X-User-Token': config.userToken } : {}),
      },
    });
    if (response.ok) {
      const data = await response.json();
      threatCount.textContent = `${data.total_threats ?? 0} threats logged`;
    } else {
      threatCount.textContent = 'API reachable — check tokens';
    }
  } catch (_err) {
    threatCount.textContent = 'Unable to reach API';
  }
}

function fetchNetworkLogs() {
  const container = document.getElementById('network-log-container');
  container.innerHTML =
    '<div style="text-align: center; padding: 20px; color: #64748B;">Loading logs...</div>';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ action: 'getNetworkLogs', tabId }, (response) => {
      const logs = response && response.logs ? response.logs : [];
      if (logs.length === 0) {
        container.innerHTML =
          '<div style="text-align: center; padding: 20px; color: #64748B;">No recent requests found for this tab.</div>';
        return;
      }

      container.innerHTML = '';
      logs.forEach((log) => {
        const el = document.createElement('div');
        el.className = 'network-log';
        const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
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
