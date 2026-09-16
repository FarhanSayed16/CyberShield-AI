window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.applyBlackout = function (message) {
  const id = 'cybersentinel-blackout';
  if (document.getElementById(id)) return;
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', 'alert');
  el.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:600 18px/1.5 system-ui,sans-serif;';
  el.textContent =
    message ||
    'AI access paused by your organization. Contact your manager or IT if you need help.';
  document.documentElement.appendChild(el);
};
