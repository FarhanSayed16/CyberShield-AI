/**
 * AI Workplace Guard — prompt capture on ChatGPT / Claude / Gemini / Google Search.
 * No debug telemetry. Uses window.__CyberSentinel engines.
 */
(function () {
  'use strict';

  const hostname = window.location.hostname;
  const platformConfig = window.__CyberSentinel?.resolvePlatformConfig
    ? window.__CyberSentinel.resolvePlatformConfig(hostname)
    : window.__CyberSentinel?.PLATFORM_CONFIG?.[hostname];

  if (!platformConfig) return;

  const platform = platformConfig.name;
  const sessionId = window.__CyberSentinel.generateSessionId();
  let lastSubmitId = '';
  let lastSentTime = 0;
  let lastKnownPrompt = '';
  let submitInFlight = false;
  let documentListenersBound = false;
  let stopResponseWatch = null;
  const SUBMIT_DEDUPE_MS = 8000;
  const activityLog = [];
  const MAX_LOG = 30;

  function makeSubmitId(text) {
    let h = 0;
    const s = `${sessionId}:${text.slice(0, 800)}`;
    for (let i = 0; i < s.length; i += 1) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return `sub_${(h >>> 0).toString(36)}`;
  }

  function logActivity(action, detail) {
    try {
      activityLog.push({
        action,
        detail: (detail || '').slice(0, 200),
        at: new Date().toISOString(),
        url: window.location.pathname,
      });
      if (activityLog.length > MAX_LOG) activityLog.shift();
    } catch (_e) {
      /* silent */
    }
  }

  function captureDraft() {
    const inp = findInput();
    if (!inp) return '';
    const text = (window.__CyberSentinel.getTextFromElement(inp) || '').trim();
    if (text.length >= 2) lastKnownPrompt = text;
    return text;
  }

  logActivity('session_start', document.title || hostname);
  chrome.runtime.sendMessage({ type: 'POLL_ENFORCEMENT' });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'APPLY_BLACKOUT' && window.__CyberSentinel.applyBlackout) {
      window.__CyberSentinel.applyBlackout(message.message);
    }
  });

  function getPolicy() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_POLICY' }, (res) => resolve(res?.policy || {}));
    });
  }

  chrome.runtime.sendMessage({ type: 'GET_POLICY' }, (res) => {
    const policy = res?.policy || {};
    if (policy.features?.clipboard_lineage && window.__CyberSentinel.initLineageTagger) {
      window.__CyberSentinel.initLineageTagger(policy.sensitive_domains || []);
    }
  });

  async function processAndSend(promptText, trigger) {
    const trimmed = (promptText || lastKnownPrompt || '').trim();
    if (trimmed.length < 2) return;

    const submitId = makeSubmitId(trimmed);
    const now = Date.now();

    if (submitInFlight) return;
    if (submitId === lastSubmitId && now - lastSentTime < SUBMIT_DEDUPE_MS) return;

    submitInFlight = true;
    lastSubmitId = submitId;
    lastSentTime = now;

    try {
      const policy = await getPolicy();
      const features = policy.features || {};

      let clientAudit = null;
      if (features.local_audit && window.__CyberSentinel.runClientAudit) {
        clientAudit = window.__CyberSentinel.runClientAudit(trimmed);
      }

      let clipboard_lineage = null;
      if (features.clipboard_lineage && window.__CyberSentinel.lookupLineage) {
        const meta = await window.__CyberSentinel.lookupLineage(trimmed);
        if (meta) clipboard_lineage = { status: 'resolved', ...meta };
      }

      const serverRisk = clientAudit?.client_risk_level || 'none';
      const needsJit =
        features.jit_training &&
        policy.jit_mode === 'attest' &&
        (serverRisk === 'high' ||
          serverRisk === 'critical' ||
          serverRisk === 'medium' ||
          clipboard_lineage?.sensitivity_label === 'internal_restricted');

      let jit_decision = null;
      if (needsJit && window.__CyberSentinel.showJitGate) {
        const gate = await window.__CyberSentinel.showJitGate({
          title: 'Quick security check',
          body: 'This prompt may include sensitive or internal information. Confirm before sending to AI.',
          checkboxLabel: 'I confirm this use is approved for AI',
        });
        if (gate.cancelled) {
          lastSubmitId = '';
          submitInFlight = false;
          return;
        }
        jit_decision = {
          triggered: true,
          trigger_reason: trigger,
          policy_version: policy.policy_version,
          user_acknowledged_at: new Date().toISOString(),
          justification_text: gate.justificationText || '',
          user_cancelled: false,
        };
      }

      let was_anonymized = false;
      let textToSend = trimmed;
      if (
        features.anonymization &&
        policy.anonymize_mode === 'suggest' &&
        window.__CyberSentinel.anonymizePrompt
      ) {
        const anon = window.__CyberSentinel.anonymizePrompt(trimmed);
        if (anon.entityCount > 0 && window.confirm(`Hide ${anon.entityCount} sensitive item(s) before monitoring?`)) {
          textToSend = anon.redactedText;
          was_anonymized = true;
        }
      }

      logActivity(trigger || 'prompt_submitted', `Captured ${textToSend.length} characters`);
      const snapshot = activityLog.slice(-15);

      const payload = {
        user_token: '',
        platform,
        source: 'extension',
        event_type: 'prompt_submit',
        prompt_text: textToSend,
        prompt_length: textToSend.length,
        page_url: window.location.href,
        page_title: document.title || '',
        session_id: sessionId,
        client_submit_id: submitId,
        activity_log: snapshot,
        captured_at: new Date().toISOString(),
        was_anonymized,
        clipboard_lineage,
        jit_decision,
      };

      if (clientAudit) {
        payload.client_risk_score = clientAudit.client_risk_score;
        payload.client_risk_level = clientAudit.client_risk_level;
        payload.client_model_version = clientAudit.client_model_version;
        payload.client_timing_ms = clientAudit.client_timing_ms;
      }

      chrome.runtime.sendMessage({ type: 'INGEST_EVENT', payload }, (res) => {
        if (res?.ok && res?.event_id && window.__CyberSentinel.watchAssistantResponse) {
          if (stopResponseWatch) stopResponseWatch();
          stopResponseWatch = window.__CyberSentinel.watchAssistantResponse(
            platform,
            res.event_id,
            logActivity
          );
        }
        submitInFlight = false;
      });
    } catch (_e) {
      submitInFlight = false;
    }
  }

  function handleUserSubmit(trigger) {
    const text = captureDraft() || lastKnownPrompt;
    processAndSend(text, trigger);
  }

  function findInput() {
    for (const sel of platformConfig.inputSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function matchesSubmitControl(el) {
    if (!el || !platformConfig.submitSelectors) return false;
    for (const sel of platformConfig.submitSelectors) {
      try {
        if (el.matches(sel)) return true;
      } catch (_e) {
        /* invalid selector */
      }
    }
    return false;
  }

  function attachInputListeners(input) {
    if (!input || input.dataset.cybersentinelInputBound) return;
    input.dataset.cybersentinelInputBound = '1';

    input.addEventListener('input', () => captureDraft(), true);
    input.addEventListener(
      'focus',
      () => logActivity('input_focus', 'Employee focused AI prompt box'),
      true
    );
    input.addEventListener(
      'paste',
      (e) => {
        const pasted = (e.clipboardData && e.clipboardData.getData('text')) || '';
        logActivity('paste', pasted ? `Pasted ${pasted.length} chars` : 'Content pasted');
        setTimeout(captureDraft, 0);
      },
      true
    );
  }

  function setupDocumentListenersOnce() {
    if (documentListenersBound) return;
    documentListenersBound = true;

    document.addEventListener(
      'mousedown',
      (e) => {
        const control = e.target.closest('button, input[type="submit"]');
        if (!control || !matchesSubmitControl(control)) return;
        logActivity('submit_click', 'Send control clicked');
        handleUserSubmit('submit_mousedown');
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat || e.key !== 'Enter' || e.shiftKey) return;
        const inp = findInput();
        if (!inp) return;
        const target = e.target;
        if (target !== inp && !inp.contains(target)) return;
        logActivity('enter_submit', 'Enter key submitted prompt');
        handleUserSubmit('enter_submit');
      },
      true
    );
  }

  function attachListeners() {
    try {
      setupDocumentListenersOnce();
      const input = findInput();
      if (input) attachInputListeners(input);
    } catch (_e) {
      /* silent */
    }
  }

  attachListeners();
  const observer = new MutationObserver(() => attachListeners());
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
