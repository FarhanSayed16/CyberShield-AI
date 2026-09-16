window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.showJitGate = function (options) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.id = 'cybersentinel-jit-host';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 2147483646; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; }
        .card { background: #fff; padding: 24px; border-radius: 12px; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        h2 { margin: 0 0 8px; font-size: 18px; }
        p { margin: 0 0 16px; color: #444; font-size: 14px; line-height: 1.4; }
        label { display: flex; gap: 8px; font-size: 13px; margin-bottom: 16px; }
        .actions { display: flex; gap: 8px; justify-content: flex-end; }
        button { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; }
        .cancel { background: #e2e8f0; }
        .continue { background: #3b5bdb; color: #fff; }
        .continue:disabled { opacity: 0.5; cursor: not-allowed; }
      </style>
      <div class="backdrop">
        <div class="card" role="dialog" aria-modal="true">
          <h2>${options.title || 'Quick security check'}</h2>
          <p>${options.body || 'This prompt may include sensitive information.'}</p>
          <label><input type="checkbox" id="jit-check" /> ${options.checkboxLabel || 'I confirm this use is approved'}</label>
          <div class="actions">
            <button type="button" class="cancel" id="jit-cancel">Cancel</button>
            <button type="button" class="continue" id="jit-ok" disabled>Continue</button>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(host);
    const check = shadow.getElementById('jit-check');
    const ok = shadow.getElementById('jit-ok');
    const cancel = shadow.getElementById('jit-cancel');
    check.addEventListener('change', () => {
      ok.disabled = !check.checked;
    });
    cancel.addEventListener('click', () => {
      host.remove();
      resolve({ acknowledged: false, cancelled: true });
    });
    ok.addEventListener('click', () => {
      host.remove();
      resolve({ acknowledged: true, cancelled: false, justificationText: 'User attested via JIT gate' });
    });
  });
};
