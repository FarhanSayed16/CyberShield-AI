window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.scoreShadowAi = function () {
  let score = 0;
  const signals = [];
  const textarea = document.querySelector('textarea');
  const editable = document.querySelector('[contenteditable="true"]');
  if (textarea && textarea.offsetHeight > 60) {
    score += 25;
    signals.push('prompt_input');
  }
  if (editable && editable.offsetHeight > 40) {
    score += 20;
    signals.push('contenteditable');
  }
  const sendBtn = document.querySelector(
    'button[data-testid="send-button"], button[aria-label*="Send"], button[type="submit"]'
  );
  if (sendBtn) {
    score += 20;
    signals.push('send_button');
  }
  const prose = document.querySelector('.prose, .markdown, pre code');
  if (prose) {
    score += 15;
    signals.push('markdown_output');
  }
  return { score: Math.min(100, score), signals };
};
