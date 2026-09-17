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
  return 'Signup failed'
}

export default function SignupPage() {
  const { user, loading, signup } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    org_name: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/ai" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signup(form)
      nav('/admin/verify')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const fields: Array<{ key: keyof typeof form; label: string; type: string }> = [
    { key: 'org_name', label: 'Organization name', type: 'text' },
    { key: 'name', label: 'Your name', type: 'text' },
    { key: 'email', label: 'Work email', type: 'email' },
    { key: 'password', label: 'Password (min 8)', type: 'password' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <form
        onSubmit={submit}
        className="bg-theme-card border border-theme-border rounded-2xl p-8 w-full max-w-md shadow-sm"
      >
        <div className="mb-6">
          <CyberSentinelLogo withWordmark size="md" variant="primary" tagline="Create org" />
        </div>
        {error && <p className="text-high-risk text-sm mb-4">{error}</p>}
        {fields.map((f) => (
          <div key={f.key} className="mb-4">
            <label className="block text-sm text-theme-text-secondary mb-1" htmlFor={`signup-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`signup-${f.key}`}
              type={f.type}
              className="w-full border border-theme-border rounded-lg px-3 py-2 bg-theme-surface text-theme-text"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              required
              minLength={f.key === 'password' ? 8 : undefined}
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create organization'}
        </button>
        <p className="mt-4 text-sm text-center text-theme-text-secondary">
          <Link to="/login" className="text-primary">
            Already have an account?
          </Link>
        </p>
      </form>
    </div>
  )
}
