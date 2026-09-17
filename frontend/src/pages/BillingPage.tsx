// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function BillingPage() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    return client
      .get('/api/billing/status')
      .then((r) => setStatus(r.data))
      .catch((e) => {
        setStatus(null);
        setError(e.response?.data?.detail?.error?.message || e.message || 'Failed to load billing');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const checkout = async () => {
    setBusy(true);
    setMsg('');
    try {
      const { data } = await client.post('/api/billing/checkout', { plan: 'starter' });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setMsg(data.message || 'Stripe not configured — use Activate Starter (dev).');
    } catch (e) {
      setMsg(e.response?.data?.detail?.error?.message || e.response?.data?.detail || 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  const portal = async () => {
    setBusy(true);
    try {
      const { data } = await client.post('/api/billing/portal');
      if (data.portal_url) window.location.href = data.portal_url;
    } catch (e) {
      setMsg(e.response?.data?.detail?.error?.message || e.response?.data?.detail || 'Portal unavailable');
    } finally {
      setBusy(false);
    }
  };

  const devActivate = async (plan = 'starter') => {
    setBusy(true);
    setMsg('');
    try {
      const { data } = await client.post('/api/billing/dev-activate', { plan });
      setStatus(data);
      setMsg(`Plan set to ${data.plan}`);
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Activate failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-theme-text-secondary">Loading billing…</p>;
  if (error || !status) {
    return (
      <div className="cs-alert-error">
        <p className="font-medium">Could not load billing</p>
        <p className="mt-1 opacity-90">{error || 'Unknown error'}</p>
        <button type="button" className="mt-3 text-primary underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const u = status.usage || {};
  const l = status.limits || {};

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Billing & plans</h1>
      <p className="text-theme-text-secondary text-sm mb-6">
        Starter is ₹4,999 / $149 per month (up to 10 users). Trial is 14 days.
      </p>

      {msg && (
        <div className="mb-4 rounded-lg border border-theme-border bg-theme-surface px-4 py-3 text-sm">{msg}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-theme-card border border-theme-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-theme-text-secondary">Current plan</div>
          <div className="text-2xl font-bold mt-1">{status.label}</div>
          <p className="text-sm text-theme-text-secondary mt-2">{status.description}</p>
          {status.trial_ends_at && (
            <p className="text-xs mt-3 text-amber-700">Trial ends {new Date(status.trial_ends_at).toLocaleString()}</p>
          )}
          <p className="text-xs mt-2 text-theme-text-secondary">Mode: {status.billing_mode}</p>
        </div>
        <div className="bg-theme-card border border-theme-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-theme-text-secondary mb-3">Usage today</div>
          <ul className="text-sm space-y-2">
            <li>
              Seats: <strong>{u.seats}</strong> / {l.seats}
            </li>
            <li>
              AI events: <strong>{u.events_today}</strong> / {l.events_per_day}
            </li>
            <li>
              Analyzes: <strong>{u.analyzes_today}</strong> / {l.analyzes_per_day}
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          type="button"
          disabled={busy}
          onClick={checkout}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Upgrade to Starter
        </button>
        {status.stripe_configured && (
          <button
            type="button"
            disabled={busy}
            onClick={portal}
            className="border border-theme-border px-4 py-2 rounded-lg text-sm"
          >
            Manage subscription
          </button>
        )}
        {!status.stripe_configured && (
          <button
            type="button"
            disabled={busy}
            onClick={() => devActivate('starter')}
            className="border border-theme-border px-4 py-2 rounded-lg text-sm"
          >
            Activate Starter (dev)
          </button>
        )}
      </div>

      <div className="bg-theme-card border border-theme-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Plans</h2>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {Object.entries(status.catalog || {}).map(([key, p]) => (
            <div key={key} className="border border-theme-border rounded-lg p-3">
              <div className="font-medium">{p.label}</div>
              <p className="text-theme-text-secondary text-xs mt-1">{p.description}</p>
              <p className="text-xs mt-2">
                {p.seats} seats · {p.events_per_day} events/day
              </p>
              {key === 'starter' && (
                <p className="text-xs mt-1 font-medium">
                  ₹{status.pricing?.starter_inr} / ${status.pricing?.starter_usd}/mo
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-theme-text-secondary">
        Quotas return HTTP 429 with an upgrade hint. See{' '}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy
        </Link>{' '}
        and retention (default 90 days in Org Settings).
      </p>
    </div>
  );
}
