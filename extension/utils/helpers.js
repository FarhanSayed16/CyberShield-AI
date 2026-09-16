window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.PLATFORM_CONFIG = {
  'chat.openai.com': {
    name: 'chatgpt',
    inputSelectors: [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'div#prompt-textarea',
      'div[contenteditable="true"][id="prompt-textarea"]',
      'div[contenteditable="true"].ProseMirror',
      '[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
    ],
  },
  'chatgpt.com': {
    name: 'chatgpt',
    inputSelectors: [
      '#prompt-textarea',
      'div#prompt-textarea',
      'textarea',
      'div[contenteditable="true"][id="prompt-textarea"]',
      'div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
    ],
  },
  'www.chatgpt.com': {
    name: 'chatgpt',
    inputSelectors: [
      '#prompt-textarea',
      'div#prompt-textarea',
      'textarea',
      'div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'button[aria-label*="Send"]',
    ],
  },
  'claude.ai': {
    name: 'claude',
    inputSelectors: ['[contenteditable="true"]', '.ProseMirror'],
    submitSelectors: ['button[aria-label="Send message"]', 'button[type="submit"]'],
  },
  'gemini.google.com': {
    name: 'gemini',
    inputSelectors: ['.ql-editor', 'rich-textarea .ql-editor', '[contenteditable="true"]'],
    submitSelectors: ['button.send-button', 'button[aria-label="Send message"]'],
  },
  'www.google.com': {
    name: 'google_search',
    inputSelectors: [
      'textarea[name="q"]',
      'input[name="q"]',
      'textarea[title="Search"]',
      '[role="combobox"] textarea',
    ],
    submitSelectors: [
      'input[name="btnK"]',
      'button[aria-label="Search"]',
      'button[type="submit"]',
      'input[type="submit"]',
    ],
  },
  'google.com': {
    name: 'google_search',
    inputSelectors: ['textarea[name="q"]', 'input[name="q"]', '[role="combobox"] textarea'],
    submitSelectors: ['input[name="btnK"]', 'button[aria-label="Search"]', 'input[type="submit"]'],
  },
};

window.__CyberSentinel.resolvePlatformConfig = function (hostname) {
  const cfg = window.__CyberSentinel.PLATFORM_CONFIG || {};
  if (cfg[hostname]) return cfg[hostname];
  if (hostname === 'www.chatgpt.com' || hostname.endsWith('.chatgpt.com')) {
    return cfg['chatgpt.com'] || cfg['www.chatgpt.com'];
  }
  if (hostname.endsWith('chat.openai.com') || hostname.endsWith('.openai.com')) {
    return cfg['chat.openai.com'];
  }
  if (hostname === 'gemini.google.com') {
    return cfg['gemini.google.com'];
  }
  if (hostname === 'google.com' || hostname === 'www.google.com') {
    return cfg['www.google.com'] || cfg['google.com'];
  }
  return null;
};

window.__CyberSentinel.getTextFromElement = function (el) {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    return el.innerText || el.textContent || '';
  }
  return '';
};

window.__CyberSentinel.generateSessionId = function () {
  let id = sessionStorage.getItem('_cybersentinel_session');
  if (!id) {
    id = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('_cybersentinel_session', id);
  }
  return id;
};
