import { Link } from 'react-router-dom'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'

export default function InstallGuidePage() {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <header className="border-b border-theme-border px-5 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/">
          <CyberSentinelLogo withWordmark size="md" variant="signal" />
        </Link>
        <Link to="/login" className="text-sm text-primary font-medium">
          Sign in
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Employee install guide</h1>
        <p className="text-theme-text-secondary mb-8">
          One-pager for installing CyberSentinel on a work browser. Print or share this page. Full technical notes:{' '}
          <code className="text-xs">extension/INSTALL.md</code>
        </p>

        <ol className="space-y-6 text-sm">
          <li className="border border-theme-border rounded-xl p-5 bg-theme-card">
            <div className="font-semibold text-base mb-2">1. Get your tokens</div>
            <p className="text-theme-text-secondary">
              Your admin invites you and shares an <strong>org token</strong> and your <strong>user token</strong>{' '}
              (or an accept-invite link). Email delivery is optional in v1 — tokens may arrive in chat or a ticket.
            </p>
          </li>
          <li className="border border-theme-border rounded-xl p-5 bg-theme-card">
            <div className="font-semibold text-base mb-2">2. Install the extension</div>
            <p className="text-theme-text-secondary mb-2">
              <strong>Enterprise / unpack:</strong> Chrome → Extensions → Developer mode → Load unpacked → select the
              CyberSentinel <code>extension</code> folder provided by IT.
            </p>
            <p className="text-theme-text-secondary">
              <strong>Chrome Web Store:</strong> when published, install from the listing your admin shares.
            </p>
          </li>
          <li className="border border-theme-border rounded-xl p-5 bg-theme-card">
            <div className="font-semibold text-base mb-2">3. Configure</div>
            <p className="text-theme-text-secondary">
              Open the extension → <strong>Config</strong>: API URL (from IT), org token, user token, dashboard URL.
              Save until status shows <em>Monitoring active</em>.
            </p>
          </li>
          <li className="border border-theme-border rounded-xl p-5 bg-theme-card">
            <div className="font-semibold text-base mb-2">4. Work normally</div>
            <p className="text-theme-text-secondary">
              Use ChatGPT / Claude / Gemini as usual. Do not paste secrets or customer PII into public AI tools. The
              extension may show a security check or org blackout if policy requires it.
            </p>
          </li>
        </ol>

        <p className="mt-8 text-xs text-theme-text-secondary">
          Monitoring notice template for employers:{' '}
          <code>doc/templates/Employee_Monitoring_Disclosure.md</code> ·{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy
          </Link>
        </p>
      </main>
    </div>
  )
}
