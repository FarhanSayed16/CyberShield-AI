import { Link } from 'react-router-dom'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <header className="border-b border-theme-border px-5 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/">
          <CyberSentinelLogo withWordmark size="md" variant="signal" />
        </Link>
        <Link to="/" className="text-sm text-theme-text-secondary hover:text-theme-text">
          Home
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10 prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-theme-text-secondary">Last updated: 2026-09-09 · CyberSentinel</p>
        <p>
          By creating an organization, inviting users, or installing the extension, you agree to these Terms on
          behalf of your company. Have counsel review before production use.
        </p>
        <h2>Service</h2>
        <p>
          CyberSentinel provides AI workplace monitoring (observe + alert), DLP signals, soft enforcement, and
          explainable threat analysis. Features marked Trial / Starter / Growth are subject to published quotas.
        </p>
        <h2>Customer responsibilities</h2>
        <ul>
          <li>Obtain any required employee notices/consent for workplace monitoring in your jurisdiction.</li>
          <li>Keep org and user tokens confidential; rotate if compromised.</li>
          <li>Use the product only for legitimate security and compliance purposes.</li>
          <li>Do not attempt to bypass quotas, abuse APIs, or probe other organizations’ data.</li>
        </ul>
        <h2>Plans & payment</h2>
        <p>
          Starter list pricing starts at ₹4,999/mo or $149/mo for up to 10 seats (D8). Trials last 14 days unless
          stated otherwise. Overages may be rate-limited (HTTP 429). Stripe Customer Portal is used to cancel or
          update when Stripe is configured.
        </p>
        <h2>Data & privacy</h2>
        <p>
          Processing is described in our <Link to="/privacy">Privacy Policy</Link>. Default retention is 90 days
          unless configured otherwise.
        </p>
        <h2>Disclaimer</h2>
        <p>
          Security tooling reduces risk but does not guarantee detection of all threats or data leaks. Outputs from
          AI models may be incomplete or incorrect — use human judgment for critical decisions.
        </p>
        <h2>Contact</h2>
        <p>
          support@cybersentinel.example · security@cybersentinel.example
        </p>
      </main>
    </div>
  )
}
