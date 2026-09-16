/**
 * CyberSentinel Quickball + Action Center
 * Isolated via Shadow DOM so host-page CSS cannot clip / override layout.
 */
(function () {
  const HOST_ID = 'cybersentinel-root';
  const live = document.getElementById(HOST_ID);
  if (live && live.shadowRoot && live.shadowRoot.getElementById('ball')) return;

  const QB_SIZE = 56;
  const QB_MARGIN = 20;
  const MENU_W = 360;
  const MENU_GAP = 12;

  // Tear down any leftover light-DOM Quickball from older builds
  ['cybersentinel-quickball', 'cybersentinel-qb-menu', 'cybersentinel-toast-container', HOST_ID].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  let iconUrl = '';
  try {
    iconUrl = chrome.runtime.getURL('icons/icon48.png');
  } catch (_) {
    iconUrl = '';
  }

  const style = document.createElement('style');
  style.textContent = `
:host, * { box-sizing: border-box; }
button, input, select, summary { font: inherit; }

#toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 3;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
}
.cs-toast {
  pointer-events: auto;
  width: 320px;
  background: rgba(15, 23, 42, 0.96);
  border-left: 4px solid #EF4444;
  border: 1px solid #334155;
  border-left-width: 4px;
  border-radius: 8px;
  padding: 12px 16px;
  color: #F1F5F9;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,.5);
  transform: translateX(120%);
  opacity: 0;
  transition: transform .35s cubic-bezier(.16,1,.3,1), opacity .35s;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.cs-toast.cs-toast-show { transform: translateX(0); opacity: 1; }
.cs-toast-header { font-weight: 700; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.cs-toast-body { font-size: 13px; color: #CBD5E1; margin-bottom: 12px; line-height: 1.4; }
.cs-toast-actions { display: flex; justify-content: flex-end; gap: 8px; }
.cs-toast-btn {
  background: transparent; border: 1px solid #475569; color: #94A3B8;
  padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;
}
.cs-toast-btn:hover { background: #334155; color: #fff; }
.cs-toast-btn-primary { color: #fff; border: none; }

#ball {
  position: fixed; width: ${QB_SIZE}px; height: ${QB_SIZE}px;
  border-radius: 50%; z-index: 2; pointer-events: auto;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; user-select: none;
  color: #5eead4;
  background: linear-gradient(160deg, #0f1c2e, #0b1220);
  border: 2px solid rgba(45,212,191,.55);
  box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 16px rgba(45,212,191,.2);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
#ball:hover { transform: scale(1.06); }
#ball.dragging { cursor: grabbing; transition: none; opacity: .92; }
#ball.open { border-color: #38bdf8; box-shadow: 0 8px 28px rgba(0,0,0,.5), 0 0 0 3px rgba(56,189,248,.22); }
#ball.safe { border-color: rgba(45,212,191,.6); color: #5eead4; }
#ball.warn { border-color: rgba(245,158,11,.85); color: #fbbf24; }
#ball.danger { border-color: rgba(239,68,68,.9); color: #fca5a5; }
#ball.scanning { border-color: rgba(56,189,248,.9); color: #7dd3fc; }
#ball.scanning .ico { animation: spin 1.2s linear infinite; }
#ball .ring {
  position: absolute; inset: -5px; border-radius: 50%; pointer-events: none;
  border: 1.5px solid rgba(45,212,191,.35);
  animation: ring 2.6s ease-out infinite;
}
#ball .ico { width: 26px; height: 26px; display: grid; place-items: center; pointer-events: none; }
#ball .radar {
  display: none; position: absolute; inset: 8px; border-radius: 50%;
  border: 1px solid rgba(56,189,248,.5); animation: ping 1.6s ease-out infinite;
}
#ball.scanning .radar { display: block; }

@keyframes ring {
  0% { transform: scale(.92); opacity: .65; }
  70% { transform: scale(1.15); opacity: 0; }
  100% { opacity: 0; }
}
@keyframes ping {
  to { transform: scale(2.4); opacity: 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }

#panel {
  position: fixed; width: ${MENU_W}px; z-index: 1; pointer-events: auto;
  display: none; flex-direction: column;
  /* FIXED height so the middle pane can scroll (height:auto + max-height clips without scroll) */
  height: min(520px, calc(100vh - 40px));
  max-height: calc(100vh - 40px);
  background: #0b1220;
  color: #e2e8f0;
  border: 1px solid rgba(148,163,184,.22);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0,0,0,.55);
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  overflow: hidden;
}
#panel.show { display: flex; }

.hdr {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(148,163,184,.18);
  background: #0f172a;
}
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.mark {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(145deg, #0f766e, #164e63);
  box-shadow: 0 0 0 1px rgba(45,212,191,.35);
  display: grid; place-items: center; overflow: hidden;
}
.mark img { width: 100%; height: 100%; object-fit: cover; display: block; }
.btitle { font-size: 13px; font-weight: 700; color: #f8fafc; line-height: 1.2; }
.bsub { font-size: 10px; color: #94a3b8; letter-spacing: .06em; text-transform: uppercase; margin-top: 1px; }
.hdr-right { display: flex; align-items: center; gap: 6px; }
.badge {
  font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  padding: 4px 8px; border-radius: 999px; white-space: nowrap;
  color: #2dd4bf; background: rgba(45,212,191,.12); border: 1px solid rgba(45,212,191,.3);
}
.xbtn {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; color: #94a3b8; cursor: pointer;
}
.xbtn:hover { background: rgba(255,255,255,.06); color: #f1f5f9; }

.tabs {
  flex: 0 0 auto;
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 4px; padding: 8px 10px;
  border-bottom: 1px solid rgba(148,163,184,.14);
  background: #0b1220;
}
.tab {
  border: 1px solid rgba(71,85,105,.7);
  background: rgba(30,41,59,.45);
  color: #94a3b8;
  border-radius: 8px;
  padding: 8px 6px;
  font-size: 11px; font-weight: 650;
  cursor: pointer;
}
.tab.on {
  color: #ecfeff;
  background: rgba(15,118,110,.45);
  border-color: rgba(45,212,191,.45);
}

.body {
  flex: 1 1 auto;
  min-height: 0 !important;
  height: 0; /* force flex child to take remaining space and scroll */
  overflow-x: hidden;
  overflow-y: scroll; /* always show scroll track so overflow is obvious */
  padding: 12px 14px 16px;
  display: block;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}
.body::-webkit-scrollbar { width: 8px; }
.body::-webkit-scrollbar-track { background: rgba(15,23,42,.8); }
.body::-webkit-scrollbar-thumb {
  background: rgba(148,163,184,.45); border-radius: 8px;
}
.body::-webkit-scrollbar-thumb:hover { background: rgba(45,212,191,.5); }
.pane { display: none; }
.pane.on { display: block; padding-bottom: 8px; }

.score {
  border: 1px solid rgba(71,85,105,.75);
  background: rgba(15,23,42,.55);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.score-top {
  display: flex; justify-content: space-between;
  font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 6px;
}
.bar { height: 6px; background: #1e293b; border-radius: 4px; overflow: hidden; }
.fill { height: 100%; width: 100%; border-radius: 4px; background: linear-gradient(90deg,#14b8a6,#2dd4bf); transition: width .8s ease; }
.fill.warn { background: linear-gradient(90deg,#f59e0b,#fbbf24); }
.fill.danger { background: linear-gradient(90deg,#ef4444,#f87171); }

.btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 42px; padding: 10px 12px; margin: 0 0 8px;
  border-radius: 10px; cursor: pointer;
  border: 1px solid rgba(71,85,105,.8);
  background: rgba(30,41,59,.7); color: #e2e8f0;
  font-size: 13px; font-weight: 600;
}
.btn:hover { border-color: rgba(45,212,191,.4); background: rgba(45,212,191,.1); color: #ccfbf1; }
.btn.primary {
  background: linear-gradient(135deg,#0f766e,#155e75);
  border-color: rgba(45,212,191,.45); color: #ecfeff; font-weight: 700;
}
.btn.primary:hover { background: linear-gradient(135deg,#0d9488,#0e7490); }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.row2 .btn { margin: 0; font-size: 12px; min-height: 40px; }

.live {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; margin-bottom: 10px;
  border-radius: 12px;
  border: 1px solid rgba(71,85,105,.75);
  background: rgba(15,23,42,.55);
  font-size: 12px; color: #cbd5e1;
}
.live-l { display: inline-flex; align-items: center; gap: 8px; }
.dot {
  width: 7px; height: 7px; border-radius: 50%; background: #2dd4bf;
  box-shadow: 0 0 0 3px rgba(45,212,191,.2);
}
.switch { position: relative; width: 36px; height: 20px; display: inline-block; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0; border-radius: 20px; background: #334155; cursor: pointer;
}
.slider::before {
  content: ""; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px;
  border-radius: 50%; background: #fff; transition: .2s;
}
.switch input:checked + .slider { background: #0d9488; }
.switch input:checked + .slider::before { transform: translateX(16px); }

.lbl {
  display: block; margin: 10px 0 4px;
  font-size: 10px; font-weight: 700; letter-spacing: .05em;
  text-transform: uppercase; color: #94a3b8;
}
.lbl:first-child { margin-top: 0; }
.field, .sel {
  width: 100%; min-height: 40px; line-height: 1.35;
  padding: 10px 12px; margin: 0 0 8px;
  border-radius: 8px; border: 1px solid #334155;
  background: #0f172a; color: #e2e8f0; font-size: 12px; outline: none;
}
.sel {
  appearance: none; -webkit-appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}
.field:focus, .sel:focus { border-color: #2dd4bf; }
.inline { display: flex; gap: 8px; align-items: stretch; margin-bottom: 8px; }
.inline .field { flex: 1; min-width: 0; margin: 0; }
.go {
  flex: 0 0 44px; min-height: 40px; border-radius: 8px; cursor: pointer;
  border: 1px solid rgba(45,212,191,.4);
  background: linear-gradient(135deg,#0f766e,#155e75); color: #fff; font-weight: 700;
}
.upload {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 14px 10px; margin-bottom: 8px; text-align: center; cursor: pointer;
  border: 1.5px dashed #475569; border-radius: 10px; background: rgba(15,23,42,.45);
  color: #cbd5e1; font-size: 12px;
}
.upload:hover { border-color: rgba(45,212,191,.45); }
.upload .hint { font-size: 10px; color: #94a3b8; }
.preview { display: none; max-width: 100%; max-height: 72px; border-radius: 8px; object-fit: contain; }

.results {
  display: none; margin-top: 10px; padding: 10px 12px;
  border-radius: 10px; border: 1px solid rgba(45,212,191,.28); background: rgba(15,23,42,.9);
}
.results.show { display: block; }
.results-h {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #1e293b;
  font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #5eead4;
}
.spin-row { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 0; color: #94a3b8; font-size: 12px; }
.spin {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #334155; border-top-color: #2dd4bf; animation: spin .8s linear infinite;
}
.kpis { display: flex; gap: 6px; margin-bottom: 8px; }
.kpi {
  flex: 1; text-align: center; padding: 8px;
  border-radius: 8px; border: 1px solid #1e293b; background: rgba(30,41,59,.5);
}
.kpi .v { font-size: 14px; font-weight: 700; }
.kpi .l { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.explain { font-size: 12px; color: #cbd5e1; line-height: 1.45; margin-bottom: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chip {
  font-size: 11px; color: #94a3b8; background: rgba(255,255,255,.05);
  border: 1px solid #334155; padding: 2px 8px; border-radius: 4px;
}
.full {
  display: block; text-align: center; text-decoration: none;
  color: #5eead4; font-size: 12px; font-weight: 600; padding: 6px;
  border-radius: 6px; background: rgba(45,212,191,.08); border: 1px solid rgba(45,212,191,.22);
}

.chat {
  display: flex; flex-direction: column; gap: 8px; min-height: 220px;
}
.chat-log {
  flex: 1; min-height: 160px; max-height: 240px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px; padding-right: 2px;
}
.msg-ai, .msg-user {
  max-width: 88%; padding: 8px 12px; font-size: 12px; line-height: 1.4;
  word-break: break-word; white-space: pre-wrap;
}
.msg-ai {
  align-self: flex-start;
  background: rgba(45,212,191,.12); border: 1px solid rgba(45,212,191,.25);
  border-radius: 12px 12px 12px 0; color: #e2e8f0;
}
.msg-user {
  align-self: flex-end; background: #334155; border-radius: 12px 12px 0 12px; color: #fff;
}
.chat-in { display: flex; gap: 6px; }
.chat-in .field { margin: 0; flex: 1; }

.ftr {
  flex: 0 0 auto;
  border-top: 1px solid rgba(148,163,184,.18);
  padding: 10px 14px 12px; background: #0f172a;
}
.health {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; color: #94a3b8; margin-bottom: 6px;
}
.health .hd {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #2dd4bf; margin-right: 4px;
}
.link {
  background: none; border: none; color: #5eead4; font-size: 12px; font-weight: 600;
  cursor: pointer; padding: 0; text-align: left;
}
.link:hover { color: #99f6e4; text-decoration: underline; }

.timeline {
  margin-top: 10px; max-height: 72px; overflow-y: auto;
  font-size: 11px; color: #94a3b8;
}
.tl-row { display: flex; gap: 8px; margin-bottom: 4px; }
.tl-t { color: #64748b; font-family: ui-monospace, monospace; white-space: nowrap; }
.tl-e { color: #e2e8f0; }
`;

  root.appendChild(style);

  const toast = document.createElement('div');
  toast.id = 'toast';
  root.appendChild(toast);

  const ball = document.createElement('div');
  ball.id = 'ball';
  ball.className = 'safe';
  ball.setAttribute('role', 'button');
  ball.setAttribute('aria-label', 'Open CyberSentinel Action Center');
  ball.title = 'CyberSentinel — drag to move, click to open';
  ball.innerHTML = `
    <div class="radar" id="radar"></div>
    <div class="ring" aria-hidden="true"></div>
    <div class="ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M12 3l7 3v5.5c0 4.4-2.9 8.4-7 9.5-4.1-1.1-7-5.1-7-9.5V6l7-3z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
        <path d="M9.2 12.2l1.8 1.8 3.8-3.8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
  root.appendChild(ball);

  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <div class="hdr">
      <div class="brand">
        <span class="mark" aria-hidden="true">${
          iconUrl
            ? `<img src="${iconUrl}" alt="">`
            : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 3l7 3v5.5c0 4.4-2.9 8.4-7 9.5-4.1-1.1-7-5.1-7-9.5V6l7-3z" stroke="#5eead4" stroke-width="1.75" stroke-linejoin="round"/><path d="M9.2 12.2l1.8 1.8 3.8-3.8" stroke="#5eead4" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        }</span>
        <div>
          <div class="btitle">CyberSentinel</div>
          <div class="bsub">Action Center · v1.2.1</div>
        </div>
      </div>
      <div class="hdr-right">
        <span class="badge" id="badge">Ready</span>
        <button type="button" class="xbtn" id="btn-close" aria-label="Close">✕</button>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button type="button" class="tab on" data-tab="main" role="tab">Protect</button>
      <button type="button" class="tab" data-tab="tools" role="tab">Tools</button>
      <button type="button" class="tab" data-tab="chat" role="tab">Ask AI</button>
    </div>

    <div class="body">
      <div class="pane on" id="pane-main" role="tabpanel">
        <div class="score">
          <div class="score-top"><span>Page security</span><span id="score-text">100%</span></div>
          <div class="bar"><div class="fill" id="score-fill"></div></div>
        </div>
        <button type="button" class="btn primary" id="btn-scan">⌕ Scan this page</button>
        <div class="row2">
          <button type="button" class="btn" id="btn-protect">🛡 Pause</button>
          <button type="button" class="btn" id="btn-open-chat">💬 Ask AI</button>
        </div>
        <button type="button" class="btn" id="btn-open-tools" style="margin-top:0">Tools — URL · text · deepfake →</button>
        <div class="live">
          <span class="live-l"><span class="dot"></span> Live page detection</span>
          <label class="switch">
            <input type="checkbox" id="live-toggle" checked>
            <span class="slider"></span>
          </label>
        </div>
        <div class="results" id="results">
          <div class="results-h">
            <span>Results</span>
            <button type="button" class="xbtn" id="results-close" aria-label="Dismiss" style="width:24px;height:24px">✕</button>
          </div>
          <div id="results-loading" class="spin-row" style="display:none">
            <div class="spin"></div><span>Analyzing…</span>
          </div>
          <div id="results-body" style="display:none">
            <div class="kpis" id="kpi-row"></div>
            <div class="explain" id="results-explanation"></div>
            <div class="chips" id="results-indicators"></div>
            <div id="results-actions"></div>
            <div id="results-advanced"></div>
            <a class="full" id="results-full" href="#" target="_blank" rel="noopener">Full report →</a>
          </div>
        </div>
        <div class="timeline" id="timeline">
          <div class="tl-row"><span class="tl-t"></span><span class="tl-e">Ready</span></div>
        </div>
      </div>

      <div class="pane" id="pane-tools" role="tabpanel">
        <label class="lbl" for="tier-select">AI engine tier</label>
        <select class="sel" id="tier-select">
          <option value="auto" selected>Auto — Gemini + optional ML</option>
          <option value="1">Tier 1 — Heuristics / remote ML</option>
          <option value="2">Tier 2 — Enrichment / remote ML</option>
          <option value="3">Tier 3 — Gemini AI</option>
        </select>

        <label class="lbl" for="scan-type">Paste to scan</label>
        <select class="sel" id="scan-type">
          <option value="url">Malicious URL</option>
          <option value="text">Phishing email / text</option>
          <option value="prompt">AI prompt injection</option>
        </select>
        <div class="inline">
          <input class="field" id="scan-input" type="text" placeholder="Paste URL or text…" autocomplete="off">
          <button type="button" class="go" id="scan-submit" title="Scan">→</button>
        </div>

        <label class="lbl">Deepfake check</label>
        <div class="upload" id="upload-zone">
          <span id="upload-icon">⬆</span>
          <img class="preview" id="upload-preview" alt="">
          <span id="upload-text">Drop image or video</span>
          <span class="hint" id="upload-hint">png · jpg · jpeg · mp4</span>
          <input type="file" id="file-input" accept=".png,.jpg,.jpeg,.mp4" style="display:none">
        </div>
        <button type="button" class="btn primary" id="upload-submit" style="display:none">Analyze media →</button>
      </div>

      <div class="pane" id="pane-chat" role="tabpanel">
        <div class="chat">
          <div class="chat-log" id="chat-log">
            <div class="msg-ai">Ask about this page’s safety — phishing, deepfakes, or prompt risks.</div>
          </div>
          <div class="chat-in">
            <input class="field" id="chat-input" type="text" placeholder="Ask CyberSentinel…">
            <button type="button" class="go" id="chat-send">→</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ftr">
      <div class="health">
        <span><span class="hd"></span>Engine online</span>
        <span id="risk-status">Safe</span>
      </div>
      <button type="button" class="link" id="btn-dashboard">Open dashboard ↗</button>
    </div>
  `;
  root.appendChild(panel);

  // Expose for legacy helpers in content.js
  window.__csQb = {
    root,
    host,
    ball,
    panel,
    toast,
    $(id) {
      return root.getElementById(id);
    },
  };

  const $ = (id) => root.getElementById(id);
  const nowTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function placeBall(x, y) {
    const maxX = Math.max(QB_MARGIN, window.innerWidth - QB_SIZE - QB_MARGIN);
    const maxY = Math.max(QB_MARGIN, window.innerHeight - QB_SIZE - QB_MARGIN);
    const cx = Math.min(maxX, Math.max(QB_MARGIN, x));
    const cy = Math.min(maxY, Math.max(QB_MARGIN, y));
    ball.style.left = `${cx}px`;
    ball.style.top = `${cy}px`;
    return { x: cx, y: cy };
  }

  function defaultPos() {
    return {
      x: window.innerWidth - QB_SIZE - QB_MARGIN,
      y: window.innerHeight - QB_SIZE - QB_MARGIN,
    };
  }

  chrome.storage.local.get(['qbPosition'], (res) => {
    const p = res.qbPosition;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) placeBall(p.x, p.y);
    else {
      const d = defaultPos();
      placeBall(d.x, d.y);
    }
  });

  function snapEdge() {
    const r = ball.getBoundingClientRect();
    const x =
      r.left + r.width / 2 < window.innerWidth / 2
        ? QB_MARGIN
        : window.innerWidth - QB_SIZE - QB_MARGIN;
    placeBall(x, r.top);
  }

  function positionPanel() {
    const r = ball.getBoundingClientRect();
    const preferRight = r.left + r.width / 2 < window.innerWidth / 2;
    let left = preferRight ? r.right + MENU_GAP : r.left - MENU_W - MENU_GAP;
    left = Math.min(Math.max(QB_MARGIN, left), window.innerWidth - MENU_W - QB_MARGIN);

    // Explicit height is required for middle .body to scroll
    const h = Math.min(520, window.innerHeight - QB_MARGIN * 2);
    panel.style.height = `${h}px`;
    panel.style.maxHeight = `${h}px`;
    panel.style.left = `${left}px`;

    let top = r.top + r.height / 2 - h / 2;
    top = Math.min(Math.max(QB_MARGIN, top), window.innerHeight - h - QB_MARGIN);
    panel.style.top = `${top}px`;
    panel.classList.add('show');

    const body = root.querySelector('.body');
    if (body) body.scrollTop = 0;
  }

  function setTab(name) {
    root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
    root.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === `pane-${name}`));
    const body = root.querySelector('.body');
    if (body) body.scrollTop = 0;
  }

  function openMenu() {
    positionPanel();
    ball.classList.add('open');
    setTab('main');
  }

  function closeMenu() {
    panel.classList.remove('show');
    ball.classList.remove('open');
  }

  function toggleMenu(forceClose) {
    if (forceClose || panel.classList.contains('show')) closeMenu();
    else openMenu();
  }

  let dragging = false;
  let sx, sy, ix, iy;
  ball.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = false;
    const r = ball.getBoundingClientRect();
    sx = e.clientX;
    sy = e.clientY;
    ix = r.left;
    iy = r.top;
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragging = true;
        ball.classList.add('dragging');
        closeMenu();
      }
      if (!dragging) return;
      placeBall(ix + dx, iy + dy);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (dragging) {
        ball.classList.remove('dragging');
        snapEdge();
        chrome.storage.local.set({
          qbPosition: {
            x: parseInt(ball.style.left, 10),
            y: parseInt(ball.style.top, 10),
          },
        });
      } else toggleMenu();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  $('btn-close').addEventListener('click', () => closeMenu());
  document.addEventListener(
    'mousedown',
    (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(ball) && !path.includes(panel)) closeMenu();
    },
    true
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    const r = ball.getBoundingClientRect();
    placeBall(r.left, r.top);
    if (panel.classList.contains('show')) positionPanel();
  });

  root.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
  });
  $('btn-open-tools').addEventListener('click', () => setTab('tools'));
  $('btn-open-chat').addEventListener('click', () => setTab('chat'));

  function dashUrl() {
    try {
      if (typeof getDashboardBaseUrl === 'function') {
        const u = getDashboardBaseUrl();
        if (u) return u;
      }
    } catch (_) {}
    return 'http://localhost:5173';
  }

  $('btn-dashboard').addEventListener('click', () => {
    window.open(dashUrl(), '_blank');
    closeMenu();
  });

  $('btn-scan').addEventListener('click', () => {
    const tier = $('tier-select').value;
    chrome.runtime.sendMessage({
      action: 'manualScanFromQuickball',
      url: window.location.href,
      tier,
    });
    showInlineLoading();
    setTab('main');
  });

  const protectBtn = $('btn-protect');
  function updateProtectButtonText(isProtected) {
    protectBtn.textContent = isProtected ? '🛡 Pause' : '⏸ Resume';
    protectBtn.style.color = isProtected ? '' : '#F87171';
  }
  chrome.storage.local.get(['safetySettings'], (result) => {
    const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
    updateProtectButtonText(isProtected);
    $('live-toggle').checked = isProtected;
  });
  protectBtn.addEventListener('click', () => {
    chrome.storage.local.get(['safetySettings'], (result) => {
      const isProtected = result.safetySettings ? result.safetySettings.blockHighRisk : true;
      const newState = !isProtected;
      chrome.storage.local.set({ safetySettings: { blockHighRisk: newState } }, () => {
        updateProtectButtonText(newState);
        $('live-toggle').checked = newState;
      });
    });
  });
  $('live-toggle').addEventListener('change', () => {
    const newState = $('live-toggle').checked;
    chrome.storage.local.set({ safetySettings: { blockHighRisk: newState } }, () => {
      updateProtectButtonText(newState);
      addTimelineEvent(newState ? 'Live detection enabled' : 'Live detection paused');
    });
  });

  $('scan-submit').addEventListener('click', () => {
    const content = $('scan-input').value.trim();
    if (!content) return;
    showInlineLoading();
    setTab('main');
    addTimelineEvent(`Scanning ${$('scan-type').value} input...`);
    chrome.runtime.sendMessage({
      action: 'manualTextScan',
      content,
      scanType: $('scan-type').value,
      tier: $('tier-select').value,
    });
  });
  $('scan-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') $('scan-submit').click();
  });

  let currentFileBase64 = null;
  let currentFileName = null;
  $('upload-zone').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFileName = file.name;
    $('upload-text').textContent = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      currentFileBase64 = String(dataUrl).split(',')[1];
      if (file.type.startsWith('image/')) {
        $('upload-preview').src = dataUrl;
        $('upload-preview').style.display = 'block';
        $('upload-icon').style.display = 'none';
        $('upload-hint').style.display = 'none';
      } else {
        $('upload-preview').style.display = 'none';
        $('upload-icon').style.display = 'block';
        $('upload-icon').textContent = '▶';
      }
      $('upload-submit').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
  $('upload-submit').addEventListener('click', () => {
    if (!currentFileBase64) return;
    showInlineLoading();
    setTab('main');
    addTimelineEvent(`Uploading ${currentFileName} for deepfake scan...`);
    chrome.runtime.sendMessage({
      action: 'manualFileScan',
      fileData: currentFileBase64,
      fileName: currentFileName,
      tier: $('tier-select').value,
    });
  });

  $('results-close').addEventListener('click', () => {
    $('results').classList.remove('show');
  });

  const chatLog = $('chat-log');
  function appendChat(msg, isUser) {
    const div = document.createElement('div');
    div.className = isUser ? 'msg-user' : 'msg-ai';
    div.textContent = msg;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  $('chat-send').addEventListener('click', () => {
    const text = $('chat-input').value.trim();
    if (!text) return;
    appendChat(text, true);
    $('chat-input').value = '';
    const typing = document.createElement('div');
    typing.className = 'msg-ai';
    typing.textContent = 'Thinking...';
    chatLog.appendChild(typing);
    chatLog.scrollTop = chatLog.scrollHeight;
    chrome.runtime.sendMessage({
      action: 'askAiAssistant',
      query: text,
      url: window.location.href,
    });
  });
  $('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') $('chat-send').click();
  });

  // Bridge API used by rest of content.js
  window.__csQbApi = {
    showInlineLoading,
    renderInlineResults,
    updateQuickballState,
    updateQuickballWithResult,
    scanFailed,
    addTimelineEvent,
    appendChatFromBg(msg) {
      // replace last "Thinking..."
      const nodes = chatLog.querySelectorAll('.msg-ai');
      const last = nodes[nodes.length - 1];
      if (last && last.textContent === 'Thinking...') last.remove();
      appendChat(msg, false);
    },
    openMenu,
    closeMenu,
    toggleMenu,
  };

  function showInlineLoading() {
    const panelEl = $('results');
    panelEl.classList.add('show');
    $('results-loading').style.display = 'flex';
    $('results-body').style.display = 'none';
  }

  function scanFailed(message) {
    setBallClass('warn');
    const badge = $('badge');
    badge.textContent = 'Error';
    badge.style.color = '#F59E0B';
    badge.style.background = 'rgba(245,158,11,.12)';
    badge.style.borderColor = 'rgba(245,158,11,.35)';
    addTimelineEvent(message || 'Scan failed');
    const panelEl = $('results');
    panelEl.classList.add('show');
    $('results-loading').style.display = 'none';
    $('results-body').style.display = 'block';
    $('kpi-row').innerHTML = '';
    $('results-explanation').innerHTML = `<p style="color:#FBBF24;margin:0">${escapeHtml(message || 'Scan failed')}</p>`;
    $('results-indicators').innerHTML = '';
    $('results-actions').innerHTML = '';
    $('results-advanced').innerHTML = '';
    openMenu();
    setTab('main');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderInlineResults(result) {
    const panelEl = $('results');
    panelEl.classList.add('show');
    $('results-loading').style.display = 'none';
    $('results-body').style.display = 'block';
    setTab('main');

    const risk = Number(result.risk_score) || 0;
    const isSafe = result.threat_level === 'Safe';
    const isHigh = risk >= 80;
    const color = isSafe ? '#10B981' : isHigh ? '#EF4444' : '#F59E0B';
    const confidence = result.confidence != null ? Math.round(Number(result.confidence) * (Number(result.confidence) <= 1 ? 100 : 1)) : '—';

    $('kpi-row').innerHTML = `
      <div class="kpi" style="border-color:${color}33"><div class="v" style="color:${color}">${risk}</div><div class="l">Risk</div></div>
      <div class="kpi" style="border-color:${color}33"><div class="v" style="color:${color}">${escapeHtml(result.threat_level)}</div><div class="l">Level</div></div>
      <div class="kpi"><div class="v">${escapeHtml(String(confidence))}%</div><div class="l">Confidence</div></div>
    `;
    $('results-explanation').innerHTML = `<strong style="color:${color}">${escapeHtml((result.threat_type || 'benign').replace('_', ' '))}</strong><p style="margin:6px 0 0">${escapeHtml(result.explanation || 'No detailed explanation available.')}</p>`;
    const ind = $('results-indicators');
    if (result.indicators && result.indicators.length) {
      ind.style.display = 'flex';
      ind.innerHTML = result.indicators.map((i) => `<span class="chip">${escapeHtml(i)}</span>`).join('');
    } else {
      ind.style.display = 'none';
      ind.innerHTML = '';
    }
    const acts = $('results-actions');
    if (result.recommended_actions && result.recommended_actions.length) {
      acts.innerHTML = result.recommended_actions.map((a) => `<div style="font-size:12px;color:#10B981;margin-bottom:4px">✓ ${escapeHtml(a)}</div>`).join('');
    } else acts.innerHTML = '';
    $('results-advanced').innerHTML = '';
    $('results-full').href = `${dashUrl()}/threats?id=${encodeURIComponent(result.id || '')}`;
  }

  function setBallClass(name) {
    ball.classList.remove('safe', 'warn', 'danger', 'scanning', 'open', 'dragging');
    // preserve open if panel open
    if (panel.classList.contains('show')) ball.classList.add('open');
    if (name) ball.classList.add(name);
  }

  function updateQuickballState(stateName) {
    if (stateName === 'Scanning...') {
      setBallClass('scanning');
      addTimelineEvent('Scanning current page...');
      const badge = $('badge');
      badge.textContent = 'Scanning';
      badge.style.color = '#38BDF8';
      badge.style.background = 'rgba(56,189,248,.12)';
      badge.style.borderColor = 'rgba(56,189,248,.35)';
    }
  }

  function updateQuickballWithResult(result) {
    const isSafe = result.threat_level === 'Safe';
    const isHigh = (result.risk_score || 0) >= 80;
    setBallClass(isSafe ? 'safe' : isHigh ? 'danger' : 'warn');
    $('risk-status').textContent = result.threat_level || '—';
    const badge = $('badge');
    badge.textContent = isSafe ? 'Verified' : 'Action needed';
    const color = isSafe ? '#10B981' : isHigh ? '#EF4444' : '#F59E0B';
    badge.style.color = color;
    badge.style.background = `${color}22`;
    badge.style.borderColor = `${color}55`;
    const score = Math.max(0, Math.min(100, 100 - (result.risk_score || 0)));
    $('score-text').textContent = `${score}%`;
    const fill = $('score-fill');
    fill.style.width = `${score}%`;
    fill.classList.remove('warn', 'danger');
    if (!isSafe) fill.classList.add(isHigh ? 'danger' : 'warn');
  }

  function addTimelineEvent(text) {
    const tl = $('timeline');
    if (!tl) return;
    const row = document.createElement('div');
    row.className = 'tl-row';
    row.innerHTML = `<span class="tl-t">${nowTime()}</span><span class="tl-e">${escapeHtml(text)}</span>`;
    tl.insertBefore(row, tl.firstChild);
    while (tl.children.length > 8) tl.removeChild(tl.lastChild);
  }

  // Seed timeline time
  const firstTl = $('timeline').querySelector('.tl-t');
  if (firstTl) firstTl.textContent = nowTime();
})();
