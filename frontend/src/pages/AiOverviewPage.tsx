// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const RISK_STYLES = {
  none: 'text-theme-text-secondary',
  low: 'text-blue-600',
  medium: 'text-amber-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
};

const COLORS = ['#3b5bdb', '#748ffc', '#91a7ff', '#bac8ff'];

export default function Dashboard() {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadManager = () => {
    setLoading(true);
    setError('');
    Promise.all([
      client.get('/api/dashboard/summary?period=7d'),
      client.get('/api/dashboard/usage-over-time?period=7d'),
      client.get('/api/dashboard/platform-breakdown?period=7d'),
      client.get('/api/dashboard/top-users?period=7d&limit=5'),
      client.get('/api/dashboard/recent-activity?limit=8'),
    ])
      .then(([s, u, p, t, r]) => {
        setSummary(s.data.totals);
        setSeries(u.data.series);
        setPlatforms(p.data.platforms);
        setTopUsers(t.data.users);
        setRecent(r.data.events);
      })
      .catch((e) => {
        setError(e.response?.data?.detail?.error?.message || e.message || 'Failed to load overview');
        setSummary(null);
      })
      .finally(() => setLoading(false));
  };

  const loadEmployee = () => {
    setLoading(true);
    setError('');
    client
      .get('/api/events?per_page=8')
      .then((r) => {
        setRecent(r.data.events || []);
        setSummary({
          prompts: r.data.pagination?.total ?? (r.data.events || []).length,
          active_users: 1,
          flagged: (r.data.events || []).filter((e) => e.risk_level && e.risk_level !== 'none').length,
          critical_alerts: (r.data.events || []).filter((e) => e.has_critical).length,
        });
        setSeries([]);
        setPlatforms([]);
        setTopUsers([]);
      })
      .catch((e) => {
        setError(e.response?.data?.detail?.error?.message || e.message || 'Failed to load activity');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    if (isManager) loadManager();
    else loadEmployee();
  }, [user?.id, user?.role]);

  if (loading) return <p className="text-theme-text-secondary">Loading…</p>;
  if (error) {
    return (
      <div className="cs-alert-error">
        <p className="font-medium">Could not load overview</p>
        <p className="mt-1 opacity-90">{error}</p>
        <button
          type="button"
          className="mt-3 text-primary underline"
          onClick={() => (isManager ? loadManager() : loadEmployee())}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!summary) return <p className="text-theme-text-secondary">No data yet.</p>;

  const cards = isManager
    ? [
        { label: 'Prompts (7d)', value: summary.prompts },
        { label: 'Active users', value: summary.active_users },
        { label: 'Flagged', value: summary.flagged },
        { label: 'Critical alerts', value: summary.critical_alerts },
      ]
    : [
        { label: 'My prompts', value: summary.prompts },
        { label: 'Flagged', value: summary.flagged },
        { label: 'Critical', value: summary.critical_alerts },
      ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Overview</h1>
      <div className="mb-6 rounded-lg border border-theme-border bg-theme-surface/60 px-4 py-3 text-sm text-theme-text-secondary">
        {isManager ? (
          <>
            <span className="font-medium text-theme-text">Getting started: </span>
            <Link to="/ai/users" className="text-primary hover:underline">
              Invite teammates
            </Link>
            {' · '}
            Configure extension with org key from{' '}
            <Link to="/ai/settings" className="text-primary hover:underline">
              Org Settings
            </Link>
            {' · '}
            Confirm ingest on{' '}
            <Link to="/admin/verify" className="text-primary hover:underline">
              Admin Verify
            </Link>
            {' · '}
            <Link to="/dashboard" className="text-primary hover:underline">
              Live Scan
            </Link>
            {' · '}
            <Link to="/ai/billing" className="text-primary hover:underline">
              Billing / trial
            </Link>
            {' · '}
            <Link to="/install" className="text-primary hover:underline">
              install guide
            </Link>
          </>
        ) : (
          <>
            <span className="font-medium text-theme-text">Your setup: </span>
            Copy your extension user token below · follow the{' '}
            <Link to="/install" className="text-primary hover:underline">
              install guide
            </Link>
            {' · '}
            view{' '}
            <Link to="/ai/events" className="text-primary hover:underline">
              your AI activity
            </Link>
            {' · '}
            optional{' '}
            <Link to="/dashboard" className="text-primary hover:underline">
              Live Scan
            </Link>
          </>
        )}
      </div>

      {!isManager && user?.user_token && (
        <div className="mb-6 rounded-lg border border-theme-border bg-theme-card p-4 text-sm">
          <h2 className="font-semibold text-theme-text mb-2">My extension token</h2>
          <p className="text-theme-text-secondary mb-2">
            Paste this as <strong>User token</strong> in the extension Config (ask your admin for the org token).
          </p>
          <code className="block break-all bg-theme-surface px-2 py-2 rounded font-mono text-xs">{user.user_token}</code>
        </div>
      )}

      <div className={`grid gap-4 mb-8 ${isManager ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {cards.map((c) => (
          <div key={c.label} className="bg-theme-card rounded-lg shadow p-4">
            <div className="text-sm text-theme-text-secondary">{c.label}</div>
            <div className="text-3xl font-bold text-theme-text">{c.value}</div>
          </div>
        ))}
      </div>

      {isManager && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-theme-card rounded-lg shadow p-4 h-64">
            <h2 className="font-semibold mb-2">Usage over time</h2>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={series}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="prompts" stroke="#3b5bdb" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-theme-card rounded-lg shadow p-4 h-64">
            <h2 className="font-semibold mb-2">By platform</h2>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={platforms} dataKey="prompts" nameKey="platform" cx="50%" cy="50%" outerRadius={80} label>
                  {platforms.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-theme-card rounded-lg shadow p-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">{isManager ? 'Recently monitored prompts' : 'My recent activity'}</h2>
          <Link to="/ai/events" className="text-sm text-primary hover:underline">
            View all activity
          </Link>
        </div>
        {!recent.length ? (
          <p className="text-theme-text-secondary text-sm">
            No prompts captured yet. Use ChatGPT with the extension configured.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {recent.map((e) => (
              <li key={e.id} className="py-3 flex gap-4">
                <div className="shrink-0 w-36 text-theme-text-secondary text-xs">
                  {new Date(e.captured_at).toLocaleString()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-theme-text">{e.monitoring_label}</div>
                  <div className="text-theme-text-secondary truncate">{e.prompt_preview}</div>
                  {isManager && (
                    <div className="text-xs text-theme-text-secondary mt-0.5">
                      {e.user?.name} · {e.activity_count || 0} activity steps
                    </div>
                  )}
                </div>
                <div className={`shrink-0 text-xs font-medium uppercase ${RISK_STYLES[e.risk_level] || RISK_STYLES.none}`}>
                  {e.risk_level === 'none' ? 'Normal' : e.risk_level}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isManager && (
        <div className="bg-theme-card rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Top users</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">User</th>
                <th>Prompts</th>
                <th>Flagged</th>
                <th>Avg risk</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((row) => (
                <tr key={row.user.id} className="border-b">
                  <td className="py-2">{row.user.name}</td>
                  <td>{row.prompts}</td>
                  <td>{row.flagged}</td>
                  <td>{row.avg_risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
