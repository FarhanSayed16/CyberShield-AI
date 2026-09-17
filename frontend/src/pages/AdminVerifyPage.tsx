// @ts-nocheck
import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function normalizeHealth(payload) {
  if (!payload) return null;
  // FastAPI 503 wraps body as { detail: { api, mongo, redis } }
  if (payload.detail && (payload.detail.api || payload.detail.mongo)) {
    return payload.detail;
  }
  if (payload.api || payload.mongo) return payload;
  return { error: true, raw: payload };
}

export default function AdminVerify() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [ingest, setIngest] = useState(null);
  const [dlpResults, setDlpResults] = useState([]);
  const [events, setEvents] = useState([]);
  const [org, setOrg] = useState(null);
  const [loadError, setLoadError] = useState('');

  const refresh = async () => {
    setLoadError('');
    try {
      const h = await client.get('/api/admin/health/detailed');
      setHealth(normalizeHealth(h.data));
    } catch (e) {
      const normalized = normalizeHealth(e.response?.data);
      if (normalized && !normalized.error) {
        setHealth(normalized);
      } else {
        setHealth({ error: true });
        setLoadError(e.response?.data?.detail?.error?.message || e.message || 'Health check failed');
      }
    }
    try {
      const ev = await client.get('/api/events?per_page=10');
      setEvents(ev.data.events || []);
      const o = await client.get('/api/org');
      setOrg(o.data);
    } catch (e) {
      setLoadError((prev) => prev || e.message || 'Failed to load events/org');
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const runIngest = async () => {
    const { data } = await client.post('/api/admin/verify/ingest-test');
    setIngest(data);
    refresh();
  };

  const runDlp = async () => {
    const { data } = await client.post('/api/admin/verify/dlp-run');
    setDlpResults(data.results);
  };

  const card = (label, ok, ms, hint) => (
    <div className={`rounded-xl p-4 border ${ok ? 'cs-alert-ok' : 'cs-alert-error'}`}>
      <div className="font-medium text-theme-text">{label}</div>
      <div className="text-sm mt-1">
        {ok ? 'OK' : 'FAIL'}
        {ms != null && Number.isFinite(ms) ? ` · ${ms}ms` : ''}
      </div>
      {hint && <p className="text-xs mt-2 opacity-80">{hint}</p>}
    </div>
  );

  const redisOk = !!health?.redis?.ok;
  const redisHint = redisOk
    ? null
    : 'Optional — rate limits fail-open without Redis. Start local Redis or leave as-is.';

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold text-theme-text">Verify setup</h1>
        <button type="button" onClick={refresh} className="cs-btn-ghost">
          Refresh
        </button>
      </div>

      {loadError && <div className="cs-alert-error mb-4">{loadError}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {health && !health.error && (
          <>
            {card('API', !!health.api?.ok, health.api?.latency_ms)}
            {card(
              'MongoDB',
              !!health.mongo?.ok,
              health.mongo?.latency_ms,
              health.mongo?.error || (health.mongo?.mode ? `mode: ${health.mongo.mode}` : null)
            )}
            {card('Redis', redisOk, health.redis?.latency_ms, redisHint)}
          </>
        )}
        {health?.error && (
          <p className="text-red-500 col-span-3 text-sm">Health check failed — is the API running on :8000?</p>
        )}
        {!health && <p className="text-theme-text-secondary col-span-3 text-sm">Checking…</p>}
      </div>

      {health && !health.mongo?.ok && (
        <div className="cs-alert-warn mb-6">
          MongoDB ping failed. Confirm Atlas Network Access allows your IP, and that <code className="font-mono text-xs">MONGODB_URI</code> /
          <code className="font-mono text-xs"> DB_NAME</code> in <code className="font-mono text-xs">backend/.env</code> are correct. Restart
          uvicorn after edits.
        </div>
      )}

      <div className="bg-theme-card border border-theme-border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-2 text-theme-text">Auth</h2>
        <p className="text-sm text-theme-text-secondary">
          {user?.name} · {user?.email} · {user?.role}
        </p>
      </div>

      <div className="bg-theme-card border border-theme-border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-2 text-theme-text">Extension tokens</h2>
        {org && (
          <div className="text-sm space-y-2 font-mono text-theme-text-secondary break-all">
            <p>
              <span className="text-theme-text">Org:</span> {org.org_api_key}
            </p>
            <p>
              <span className="text-theme-text">User:</span> {user?.user_token}
            </p>
          </div>
        )}
      </div>

      <div className="bg-theme-card border border-theme-border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-2 text-theme-text">Synthetic ingest</h2>
        <button type="button" onClick={runIngest} className="btn-primary px-4 py-2 rounded-lg text-sm">
          Send test prompt
        </button>
        {ingest && (
          <pre className="mt-2 text-xs bg-theme-surface border border-theme-border p-2 rounded-lg overflow-auto text-theme-text-secondary">
            {JSON.stringify(ingest, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-theme-card border border-theme-border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-2 text-theme-text">DLP smoke tests</h2>
        <button type="button" onClick={runDlp} className="btn-primary px-4 py-2 rounded-lg text-sm mb-3">
          Run all
        </button>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-theme-border text-theme-text-secondary">
              <th className="pb-2 font-medium">Fixture</th>
              <th className="font-medium">Expected</th>
              <th className="font-medium">Actual</th>
              <th className="font-medium">Pass</th>
            </tr>
          </thead>
          <tbody>
            {dlpResults.map((r) => (
              <tr key={r.id} className="border-t border-theme-border text-theme-text">
                <td className="py-1">{r.id}</td>
                <td>{r.expected_severity}</td>
                <td>{r.actual_severity}</td>
                <td>{r.pass ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-theme-card border border-theme-border rounded-xl p-4">
        <h2 className="font-semibold mb-2 text-theme-text">Recent events (live)</h2>
        <ul className="text-sm space-y-1 text-theme-text-secondary">
          {events.map((e) => (
            <li key={e.id}>
              {new Date(e.captured_at).toLocaleTimeString()} — {e.platform} — risk {e.risk_score}
            </li>
          ))}
          {!events.length && <li>No events yet.</li>}
        </ul>
      </div>
    </div>
  );
}
