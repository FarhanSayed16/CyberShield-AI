window.__CyberSentinel = window.__CyberSentinel || {};

window.__CyberSentinel.runClientAudit = function (text) {
  const t0 = performance.now();
  const findings = [];
  let score = 0;

  const rules = [
    { re: /\bsk-[a-zA-Z0-9]{20,}\b/, type: 'API_KEY', severity: 'CRITICAL', score: 90 },
    { re: /\b(employee|staff)\s+id\b/i, type: 'INSIDER_THREAT', severity: 'HIGH', score: 65 },
    { re: /\baccess\s+(my\s+)?(boss|manager|admin)\b/i, type: 'INSIDER_THREAT', severity: 'HIGH', score: 65 },
    { re: /\b(manipulate|bypass|unauthorized)\b/i, type: 'INSIDER_THREAT', severity: 'HIGH', score: 65 },
    { re: /\b(confidential|internal only)\b/i, type: 'CONFIDENTIAL', severity: 'HIGH', score: 65 },
  ];

  for (const rule of rules) {
    if (rule.re.test(text)) {
      findings.push({ type: rule.type, severity: rule.severity, description: rule.type });
      score = Math.max(score, rule.score);
    }
  }

  let level = 'none';
  if (score >= 90) level = 'critical';
  else if (score >= 65) level = 'high';
  else if (score >= 35) level = 'medium';
  else if (score >= 15) level = 'low';

  return {
    client_risk_score: score,
    client_risk_level: level,
    client_findings: findings,
    client_model_version: 'rules-3.0',
    client_timing_ms: Math.round(performance.now() - t0),
  };
};
