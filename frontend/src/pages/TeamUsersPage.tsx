// @ts-nocheck
import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    client
      .get('/api/users')
      .then((r) => setUsers(r.data.users))
      .catch((e) => setError(e.response?.data?.detail?.error?.message || 'Failed to load team'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sendInvite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await client.post('/api/users/invite', { email, role });
      setInvite(data);
      setEmail('');
      setRole('employee');
      load();
    } catch (err) {
      setError(err.response?.data?.detail?.error?.message || err.response?.data?.detail || 'Invite failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-theme-text">Team</h1>
      {error && <div className="cs-alert-error mb-4">{error}</div>}
      <form
        onSubmit={sendInvite}
        className="bg-theme-card border border-theme-border rounded-xl p-4 mb-6 flex flex-wrap gap-2 items-center"
      >
        <input
          type="email"
          placeholder="employee@company.com"
          className="cs-input flex-1 min-w-[200px]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="cs-select min-w-[140px]"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Invite role"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">
          Invite
        </button>
      </form>
      {invite && (
        <div className="cs-alert-ok mb-4 space-y-1">
          <p>Invite created (email not sent in v1 — copy this link to the employee).</p>
          <p>
            Accept URL: <code className="bg-theme-surface px-1 break-all font-mono text-xs">{invite.accept_url}</code>
          </p>
          <p>
            Token: <code className="bg-theme-surface px-1 font-mono text-xs">{invite.invite_token}</code>
          </p>
        </div>
      )}
      <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-4 text-theme-text-secondary text-sm">Loading team…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-theme-surface/80">
              <tr className="text-theme-text-secondary">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Extension token</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-theme-border text-theme-text">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-theme-text-secondary">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3 capitalize">{u.status}</td>
                  <td className="p-3 font-mono text-xs text-theme-text-secondary">{u.user_token}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
