// @ts-nocheck
import { useEffect, useState } from 'react';
import client from '../api/client';

const RISK_STYLES = {
  none: 'bg-theme-surface text-theme-text-secondary border border-theme-border',
  low: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25',
  medium: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25',
  high: 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border border-orange-500/25',
  critical: 'bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30',
};

function RiskBadge({ level, score }) {
  const label = level === 'none' ? 'Normal' : level;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${RISK_STYLES[level] || RISK_STYLES.none}`}>
      {label} {score > 0 && level !== 'none' ? `(${score})` : ''}
    </span>
  );
}

function ActivityTimeline({ log }) {
  if (!log?.length) return <p className="text-theme-text-secondary text-sm">No activity steps recorded.</p>;
  return (
    <ol className="space-y-2 text-sm border-l-2 border-theme-border pl-3 ml-1">
      {log.map((item, i) => (
        <li key={i}>
          <span className="font-medium text-theme-text">{item.action}</span>
          {item.detail && <span className="text-theme-text-secondary"> — {item.detail}</span>}
          <div className="text-xs text-theme-text-secondary">{new Date(item.at).toLocaleTimeString()}</div>
        </li>
      ))}
    </ol>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    client
      .get('/api/events?per_page=100')
      .then((r) => {
        setEvents(r.data.events);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.detail?.error?.message || 'Failed to load events'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const openDetail = async (id) => {
    const { data } = await client.get(`/api/events/${id}`);
    setSelected(data);
  };

  const filtered =
    filter === 'all'
      ? events
      : filter === 'risky'
        ? events.filter((e) => ['medium', 'high', 'critical'].includes(e.risk_level))
        : events.filter((e) => e.risk_level === 'none' || e.risk_level === 'low');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Monitored AI activity</h1>
      <p className="text-theme-text-secondary text-sm mb-6">
        Every row is a prompt submitted to an AI tool while the extension was active. Click a row for full text and activity log.
      </p>

      {error && (
        <div className="cs-alert-error mb-4">
          {error}{' '}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {loading && !events.length && <p className="text-theme-text-secondary text-sm mb-4">Loading events…</p>}

      <div className="flex gap-2 mb-4">
        {['all', 'risky', 'normal'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === f ? 'bg-primary text-white' : 'bg-theme-card border'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-theme-card rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-theme-surface">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3">What was monitored</th>
              <th className="text-left p-3 max-w-xs">Prompt sent to AI</th>
              <th className="text-left p-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="border-t hover:bg-theme-surface cursor-pointer align-top"
                onClick={() => openDetail(e.id)}
              >
                <td className="p-3 whitespace-nowrap">{new Date(e.captured_at).toLocaleString()}</td>
                <td className="p-3">{e.user?.name || '—'}</td>
                <td className="p-3">
                  <div className="font-medium">{e.monitoring_label || e.platform}</div>
                  <div className="text-xs text-theme-text-secondary">{e.activity_count || 0} logged steps</div>
                </td>
                <td className="p-3 max-w-md">
                  <p className="line-clamp-3 text-theme-text">{e.prompt_preview}</p>
                </td>
                <td className="p-3">
                  <RiskBadge level={e.risk_level || 'none'} score={e.risk_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-6 text-theme-text-secondary text-center">No events yet. Submit a prompt in ChatGPT with the extension configured.</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-theme-card rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-1">{selected.monitoring_label}</h2>
            <p className="text-sm text-theme-text-secondary mb-4">
              {selected.user?.name} · {new Date(selected.captured_at).toLocaleString()}
              {selected.page_url && (
                <a href={selected.page_url} target="_blank" rel="noreferrer" className="ml-2 text-primary">
                  Open page
                </a>
              )}
            </p>

            <div className="mb-4">
              <RiskBadge level={selected.risk_level || 'none'} score={selected.risk_score} />
              {selected.risk_reasons?.length > 0 && (
                <ul className="mt-2 text-sm text-theme-text list-disc pl-5">
                  {selected.risk_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
              {(!selected.risk_reasons?.length || selected.risk_level === 'none') && (
                <p className="mt-2 text-sm text-green-700">Treated as normal AI usage — no confidential data patterns found.</p>
              )}
            </div>

            <h3 className="font-semibold mb-2">Full prompt (what employee sent)</h3>
            <pre className="text-sm whitespace-pre-wrap bg-theme-surface p-4 rounded border mb-6 max-h-48 overflow-auto">
              {selected.prompt_text}
            </pre>

            {selected.response_text && (
              <>
                <h3 className="font-semibold mb-2">AI response</h3>
                <div className="mb-2 flex items-center gap-2">
                  <RiskBadge level={selected.response_risk_level || 'none'} score={0} />
                  {selected.response_risk_level && selected.response_risk_level !== 'none' && (
                    <span className="text-sm text-amber-800">Possible company data in AI reply</span>
                  )}
                </div>
                {selected.response_risk_reasons?.length > 0 && (
                  <ul className="text-sm text-theme-text list-disc pl-5 mb-2">
                    {selected.response_risk_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                <pre className="text-sm whitespace-pre-wrap bg-theme-surface p-4 rounded border mb-6 max-h-48 overflow-auto">
                  {selected.response_text}
                </pre>
              </>
            )}

            {selected.client_risk_score != null && (
              <p className="text-sm text-theme-text-secondary mb-4">
                Client audit: {selected.client_risk_level} ({selected.client_risk_score})
              </p>
            )}

            {selected.jit_decision?.triggered && (
              <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                <p className="font-medium">JIT attestation</p>
                <p>{selected.jit_decision.justification_text || 'Acknowledged'}</p>
                <p className="text-xs text-theme-text-secondary mt-1">
                  {selected.jit_decision.user_acknowledged_at &&
                    new Date(selected.jit_decision.user_acknowledged_at).toLocaleString()}
                </p>
              </div>
            )}

            {selected.clipboard_lineage?.status === 'resolved' && (
              <p className="text-sm text-amber-800 mb-4">
                Clipboard lineage: {selected.clipboard_lineage.origin_host} (
                {selected.clipboard_lineage.sensitivity_label})
              </p>
            )}

            <h3 className="font-semibold mb-2">Activity log (clicks, focus, paste, submit)</h3>
            <ActivityTimeline log={selected.activity_log} />

            {selected.findings?.length > 0 && (
              <>
                <h3 className="font-semibold mt-4 mb-2">Technical findings</h3>
                <ul className="text-sm space-y-1">
                  {selected.findings.map((f, i) => (
                    <li key={i}>
                      {f.finding_type} — {f.severity}
                      {f.redacted_value && ` (${f.redacted_value})`}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
