// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [ackTarget, setAckTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => client.get('/api/alerts').then((r) => setAlerts(r.data.alerts));

  useEffect(() => {
    load();
  }, []);

  const showToast = (text, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 5000);
  };

  const acknowledge = async (id, enforcementAction = null) => {
    setBusy(true);
    try {
      const body = { status: 'acknowledged' };
      if (enforcementAction) body.enforcement_action = enforcementAction;
      await client.patch(`/api/alerts/${id}`, body);
      setAckTarget(null);
      await load();
      if (enforcementAction === 'close_ai_tabs') {
        showToast('Alert acknowledged. Close-tab command queued for the employee extension (runs within ~1 min).');
      } else if (enforcementAction === 'blackout_screen') {
        showToast('Alert acknowledged. Blackout command queued for the employee AI tabs.');
      } else {
        showToast('Alert acknowledged.');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Request failed';
      showToast(`Could not acknowledge: ${msg}`, false);
    } finally {
      setBusy(false);
    }
  };

  const severityClass = (s) =>
    ({ CRITICAL: 'bg-red-100 text-red-800', HIGH: 'bg-orange-100 text-orange-800', MEDIUM: 'bg-yellow-100' }[s] ||
    'bg-theme-surface');

  const filtered = alerts.filter((a) => {
    if (filter === 'open') return a.status === 'open';
    if (filter === 'critical') return a.severity === 'CRITICAL';
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Risk alerts</h1>
      <p className="text-sm text-theme-text-secondary mb-4">
        For critical flags, managers can acknowledge and optionally close AI tabs or blackout the employee&apos;s AI
        pages. The extension on their machine picks up the command automatically.
      </p>

      {toast && (
        <div
          className={`mb-4 ${toast.ok ? 'cs-alert-ok' : 'cs-alert-error'}`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'open', 'critical'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize ${filter === f ? 'bg-primary text-white' : 'bg-theme-card border'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-theme-card rounded-lg shadow p-4 flex justify-between items-start gap-4">
            <div>
              <span className={`text-xs px-2 py-0.5 rounded ${severityClass(a.severity)}`}>{a.severity}</span>
              <span className="ml-2 text-xs text-theme-text-secondary">{a.status}</span>
              <h3 className="font-semibold mt-2">{a.title}</h3>
              <p className="text-sm text-theme-text-secondary mt-1">{a.description}</p>
              <p className="text-xs text-theme-text-secondary mt-2">{new Date(a.created_at).toLocaleString()}</p>
              {a.event_id && (
                <Link to="/ai/events" className="text-xs text-primary mt-1 inline-block">
                  View in Events
                </Link>
              )}
            </div>
            {a.status === 'open' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setAckTarget(a)}
                className="text-sm bg-primary text-white px-3 py-1 rounded shrink-0 disabled:opacity-50"
              >
                Acknowledge…
              </button>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-theme-text-secondary">No alerts match this filter.</p>}
      </div>

      {ackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-theme-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-2">Acknowledge alert</h2>
            <p className="text-sm text-theme-text-secondary mb-4">
              <strong>{ackTarget.title}</strong>
              {ackTarget.severity === 'CRITICAL' || ackTarget.severity === 'HIGH'
                ? ' — choose how to respond on the employee device.'
                : ' — mark as reviewed.'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => acknowledge(ackTarget.id)}
                className="w-full py-2 rounded border text-sm hover:bg-theme-surface disabled:opacity-50"
              >
                Acknowledge only
              </button>
              {(ackTarget.severity === 'CRITICAL' || ackTarget.severity === 'HIGH') && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => acknowledge(ackTarget.id, 'close_ai_tabs')}
                    className="w-full py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Acknowledge + close all AI tabs
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => acknowledge(ackTarget.id, 'blackout_screen')}
                    className="w-full py-2 rounded bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-50"
                  >
                    Acknowledge + blackout AI pages
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setAckTarget(null)}
                className="w-full py-2 text-sm text-theme-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
