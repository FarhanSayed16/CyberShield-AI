window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.ASSISTANT_SELECTORS = {
  chatgpt: [
    '[data-message-author-role="assistant"]',
    '[data-testid="conversation-turn-assistant"]',
  ],
  claude: ['[data-is-streaming]', '.font-claude-message', '[data-testid="assistant-message"]'],
  gemini: ['.model-response-text', 'message-content.model-response-text'],
};

window.__CyberSentinel.extractAssistantText = function (platform) {
  const sels = window.__CyberSentinel.ASSISTANT_SELECTORS[platform] || [];
  const parts = [];
  for (const sel of sels) {
    document.querySelectorAll(sel).forEach((el) => {
      const t = (el.innerText || el.textContent || '').trim();
      if (t.length > 20) parts.push(t);
    });
  }
  if (!parts.length) return '';
  return parts[parts.length - 1];
};

window.__CyberSentinel.watchAssistantResponse = function (platform, eventId, onActivity) {
  if (!eventId) return () => {};
  let lastSent = '';
  let timer = null;

  const trySend = () => {
    const text = window.__CyberSentinel.extractAssistantText(platform);
    if (text.length < 10 || text === lastSent) return;
    lastSent = text;
    if (onActivity) onActivity('ai_response', `Captured AI response (${text.length} chars)`);
    chrome.runtime.sendMessage({
      type: 'UPDATE_EVENT_RESPONSE',
      eventId,
      response_text: text,
    });
  };

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(trySend, 2000);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  timer = setTimeout(trySend, 2500);

  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
};
