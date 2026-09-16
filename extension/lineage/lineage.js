window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.normalizeForHash = function (text) {
  return text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
};

window.__CyberSentinel.hashText = async function (text) {
  const data = new TextEncoder().encode(window.__CyberSentinel.normalizeForHash(text));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

window.__CyberSentinel.storeLineage = async function (text, meta) {
  const hash = await window.__CyberSentinel.hashText(text);
  const key = `lineage:${hash}`;
  const entry = { ...meta, at: new Date().toISOString() };
  await chrome.storage.session.set({ [key]: entry });
};

window.__CyberSentinel.lookupLineage = async function (text) {
  const hash = await window.__CyberSentinel.hashText(text);
  const key = `lineage:${hash}`;
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
};

window.__CyberSentinel.initLineageTagger = function (sensitiveHosts) {
  if (!sensitiveHosts || !sensitiveHosts.length) return;
  const host = window.location.hostname;
  const match = sensitiveHosts.some((d) => {
    const p = d.host_pattern || d;
    return host === p || host.endsWith('.' + p.replace(/^\*\./, ''));
  });
  if (!match) return;

  document.addEventListener(
    'copy',
    () => {
      const text = window.getSelection()?.toString() || '';
      if (text.length < 10) return;
      window.__CyberSentinel.storeLineage(text, {
        origin_host: host,
        sensitivity_label: 'internal_restricted',
        status: 'resolved',
      });
    },
    true
  );
};
