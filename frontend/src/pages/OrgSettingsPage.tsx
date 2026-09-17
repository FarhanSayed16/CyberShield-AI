// @ts-nocheck
import { useEffect, useState } from 'react';
import client from '../api/client';

const FEATURE_LABELS = {
  jit_training: 'JIT micro-training overlay',
  local_audit: 'Client-side rules audit',
  anonymization: 'Prompt anonymization',
  clipboard_lineage: 'Clipboard lineage tracking',
  shadow_ai_detection: 'Shadow AI detection',
};

export default function Settings() {
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newPattern, setNewPattern] = useState({ name: '', pattern: '', severity: 'MEDIUM' });
  const [domainInput, setDomainInput] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [orgRes, polRes, patRes] = await Promise.all([
        client.get('/api/org'),
        client.get('/api/org/policies'),
        client.get('/api/org/dlp-patterns'),
      ]);
      setOrg(orgRes.data);
      setPolicies(polRes.data);
      setPatterns(patRes.data.patterns || []);
      setDomainInput((polRes.data.sensitive_domains || []).map((d) => d.host_pattern || d).join('\n'));
    } catch (e) {
      setErr(e.response?.data?.detail?.error?.message || 'Failed to load settings');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copy = (text) => navigator.clipboard.writeText(text);

  const regenerate = async () => {
    const { data } = await client.post('/api/org/regenerate-key');
    setOrg((o) => ({ ...o, org_api_key: data.org_api_key }));
    setMsg('Org key regenerated');
  };

  const savePolicies = async () => {
    await client.put('/api/org/policies', {
      dlp_sensitivity: policies.dlp_sensitivity,
      jit_mode: policies.jit_mode,
      anonymize_mode: policies.anonymize_mode,
      features: policies.features,
    });
    setMsg('Policies saved');
    load();
  };

  const toggleFeature = (key) => {
    setPolicies((p) => ({
      ...p,
      features: { ...p.features, [key]: !p.features[key] },
    }));
  };

  const addPattern = async () => {
    if (!newPattern.name || !newPattern.pattern) return;
    await client.post('/api/org/dlp-patterns', newPattern);
    setNewPattern({ name: '', pattern: '', severity: 'MEDIUM' });
    setMsg('Custom rule added');
    load();
  };

  const deletePattern = async (id) => {
    await client.delete(`/api/org/dlp-patterns/${id}`);
    setMsg('Rule deleted');
    load();
  };

  const saveDomains = async () => {
    const domains = domainInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((host_pattern) => ({ host_pattern, sensitivity_label: 'internal_restricted', enabled: true }));
    await client.put('/api/org/policies', { sensitive_domains: domains });
    setMsg('Sensitive domains saved');
    load();
  };

  if (err && !org) return <div className="cs-alert-error">{err}</div>;
  if (!org || !policies) return <p className="text-theme-text-secondary">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-theme-text">Organization Settings</h1>
      {msg && <div className="cs-alert-ok mb-4">{msg}</div>}
      <div className="cs-alert-warn mb-6">
        Extension tokens come from Org Settings + Team. If you use in-memory Mongo, restarting the API clears events —
        re-seed or re-invite as needed.
      </div>

      <div className="grid gap-6 max-w-3xl">
        <section className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-theme-text">Organization</h2>
          <p className="font-medium text-theme-text">{org.name}</p>
          <div className="mt-4">
            <label className="text-sm text-theme-text-secondary">Org token (extension)</label>
            <p className="text-xs text-theme-text-secondary mb-2">
              Paste into the CyberSentinel extension Config tab with each user&apos;s token.
            </p>
            <div className="flex gap-2 mt-1">
              <code className="flex-1 bg-theme-surface border border-theme-border p-2 rounded-lg text-xs break-all text-theme-text">
                {org.org_api_key}
              </code>
              <button type="button" onClick={() => copy(org.org_api_key)} className="cs-btn-ghost">
                Copy
              </button>
            </div>
            <button type="button" onClick={regenerate} className="text-sm text-red-500 hover:text-red-400 mt-3">
              Regenerate key
            </button>
          </div>
        </section>

        <section className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-theme-text">Security policies</h2>
          <div className="space-y-4 text-sm text-theme-text">
            <label className="block">
              <span className="text-theme-text-secondary">DLP sensitivity</span>
              <select
                className="cs-select mt-1.5 w-full"
                value={policies.dlp_sensitivity}
                onChange={(e) => setPolicies((p) => ({ ...p, dlp_sensitivity: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="text-theme-text-secondary">JIT mode</span>
              <select
                className="cs-select mt-1.5 w-full"
                value={policies.jit_mode}
                onChange={(e) => setPolicies((p) => ({ ...p, jit_mode: e.target.value }))}
              >
                <option value="off">Off</option>
                <option value="log_only">Log only</option>
                <option value="attest">Require attestation</option>
              </select>
            </label>
            <label className="block">
              <span className="text-theme-text-secondary">Anonymize mode</span>
              <select
                className="cs-select mt-1.5 w-full"
                value={policies.anonymize_mode}
                onChange={(e) => setPolicies((p) => ({ ...p, anonymize_mode: e.target.value }))}
              >
                <option value="off">Off</option>
                <option value="suggest">Suggest</option>
              </select>
            </label>
            <div>
              <p className="text-theme-text-secondary mb-2">Feature flags</p>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 mb-2 text-theme-text">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={!!policies.features?.[key]}
                    onChange={() => toggleFeature(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <button type="button" onClick={savePolicies} className="mt-4 btn-primary px-4 py-2 rounded-lg text-sm">
            Save policies
          </button>
        </section>

        <section className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-theme-text">Custom DLP rules</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              placeholder="Rule name"
              className="cs-input text-sm"
              value={newPattern.name}
              onChange={(e) => setNewPattern((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              placeholder="Regex pattern"
              className="cs-input text-sm flex-1 min-w-[200px]"
              value={newPattern.pattern}
              onChange={(e) => setNewPattern((p) => ({ ...p, pattern: e.target.value }))}
            />
            <select
              className="cs-select text-sm"
              value={newPattern.severity}
              onChange={(e) => setNewPattern((p) => ({ ...p, severity: e.target.value }))}
            >
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <button type="button" onClick={addPattern} className="btn-primary px-3 py-2 rounded-lg text-sm">
              Add rule
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-theme-border text-theme-text-secondary">
                <th className="pb-2 font-medium">Name</th>
                <th className="font-medium">Pattern</th>
                <th className="font-medium">Severity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.id} className="border-b border-theme-border text-theme-text">
                  <td className="py-2">{p.name}</td>
                  <td className="font-mono text-xs text-theme-text-secondary">{p.pattern}</td>
                  <td>{p.severity}</td>
                  <td>
                    <button type="button" onClick={() => deletePattern(p.id)} className="text-red-500 text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h2 className="font-semibold mb-2 text-theme-text">Sensitive domains (clipboard lineage)</h2>
          <p className="text-xs text-theme-text-secondary mb-2">One host per line, e.g. jira.company.com</p>
          <textarea className="cs-textarea w-full text-sm h-24" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
          <button type="button" onClick={saveDomains} className="mt-3 btn-primary px-4 py-2 rounded-lg text-sm">
            Save domains
          </button>
        </section>
      </div>
    </div>
  );
}
