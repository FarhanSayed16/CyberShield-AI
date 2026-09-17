import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvitePage() {
  const [params] = useSearchParams()
  const { refreshMe } = useAuth()
  const nav = useNavigate()
  const [token, setToken] = useState(params.get('token') || '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await apiClient.post('/api/auth/accept-invite', { token, name, password })
      localStorage.setItem('access_token', data.access_token)
      await refreshMe()
      nav('/ai')
    } catch {
      setError('Could not accept invite. Check the token and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <form
        onSubmit={submit}
        className="bg-theme-card border border-theme-border rounded-2xl p-8 w-full max-w-md"
      >
        <CyberSentinelLogo withWordmark size="md" variant="primary" tagline="Accept invite" />
        <p className="text-sm text-theme-text-secondary mt-4 mb-4">
          Paste the invite token from your admin, then set your name and password.
        </p>
        {error && <p className="text-high-risk text-sm mb-4">{error}</p>}
        <label className="block text-sm mb-1 text-theme-text-secondary">Invite token</label>
        <input
          className="cs-input w-full mb-4 font-mono text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <label className="block text-sm mb-1 text-theme-text-secondary">Name</label>
        <input
          className="cs-input w-full mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="block text-sm mb-1 text-theme-text-secondary">Password</label>
        <input
          type="password"
          className="cs-input w-full mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-white py-2.5 rounded-lg disabled:opacity-50"
        >
          {busy ? 'Joining…' : 'Join organization'}
        </button>
        <p className="mt-4 text-sm text-center">
          <Link to="/login" className="text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
