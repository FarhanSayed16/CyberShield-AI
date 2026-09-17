import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'
import { useAuth } from '../context/AuthContext'

function authErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'error' in detail) {
    const e = (detail as { error?: { message?: string } }).error
    if (e?.message) return e.message
  }
  return 'Sign-in failed'
}

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@demo.com' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password' : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/ai" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      nav('/ai')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <form
        onSubmit={submit}
        className="bg-theme-card border border-theme-border rounded-2xl p-8 w-full max-w-md shadow-sm"
      >
        <div className="mb-6">
          <CyberSentinelLogo withWordmark size="md" variant="primary" tagline="Sign in" />
        </div>
        {error && <p className="text-high-risk text-sm mb-4">{error}</p>}
        <label className="block text-sm text-theme-text-secondary mb-1" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className="w-full border border-theme-border rounded-lg px-3 py-2 mb-4 bg-theme-surface text-theme-text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <label className="block text-sm text-theme-text-secondary mb-1" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          className="w-full border border-theme-border rounded-lg px-3 py-2 mb-6 bg-theme-surface text-theme-text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-sm text-center text-theme-text-secondary">
          <Link to="/signup" className="text-primary">
            Create organization
          </Link>
          {' · '}
          <Link to="/" className="text-primary">
            Home
          </Link>
        </p>
      </form>
    </div>
  )
}
