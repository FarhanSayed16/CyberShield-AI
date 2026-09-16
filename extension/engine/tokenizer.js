window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.anonymizePrompt = function (text) {
  const vault = { tokens: {}, counters: {} };
  let redacted = text;

  const rules = [
    { re: /\bsk-[a-zA-Z0-9]{20,}\b/g, type: 'KEY' },
    { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, type: 'EMAIL' },
    { re: /\b(employee|staff)\s+id\s*[:=]?\s*[A-Za-z0-9]+\b/gi, type: 'EMP_ID' },
  ];

  for (const rule of rules) {
    redacted = redacted.replace(rule.re, (match) => {
      vault.counters[rule.type] = (vault.counters[rule.type] || 0) + 1;
      const token = `<${rule.type}_${vault.counters[rule.type]}>`;
      vault.tokens[token] = match;
      return token;
    });
  }

  return {
    redactedText: redacted,
    entityCount: Object.keys(vault.tokens).length,
    vault,
  };
};
