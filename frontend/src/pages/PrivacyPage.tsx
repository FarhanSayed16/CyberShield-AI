import { Link } from 'react-router-dom'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-theme-text-secondary">Last updated: 2026-09-09 · CyberSentinel</p>
        <p>
          This policy describes how CyberSentinel (“we”) processes data when you use our website, admin console,
          API, and browser extension. It is a product policy for customers and end users — not legal advice.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email, organization name, role, authentication credentials (hashed).
          </li>
          <li>
            <strong>AI Workplace Guard:</strong> prompts and related activity submitted on supported AI sites
            (ChatGPT, Claude, Gemini, and optionally Google Search), page URL/title, risk/DLP findings, and
            optional assistant response text when capture is enabled.
          </li>
          <li>
            <strong>Threat Explainer:</strong> content you submit for analysis (URLs, text, prompts, email, images)
            and resulting explanations, indicators, and history scoped to your organization.
          </li>
          <li>
            <strong>Extension config:</strong> API URL, org token, user token, and dashboard URL stored in{' '}
            <code>chrome.storage.local</code> on the employee device (not synced by default).
          </li>
          <li>
            <strong>Technical logs:</strong> request IDs, health/status, and operational logs without storing secrets
            in plaintext when redaction applies.
          </li>
        </ul>
        <h2>How we use data</h2>
        <ul>
          <li>Provide security monitoring, DLP alerts, and threat explanations to authorized org admins/managers.</li>
          <li>Enforce plan quotas and soft enforcement actions configured by the customer.</li>
          <li>Operate, secure, and improve the service (including abuse prevention).</li>
        </ul>
        <h2>Data retention</h2>
        <p>
          Default retention for organization events and related records is <strong>90 days</strong>, configurable by
          admins in Org Settings when available. Customers are responsible for their own retention and employee
          notices (see our Employee Monitoring Disclosure template).
        </p>
        <h2>Sharing</h2>
        <p>
          We do not sell personal data. Processors may include hosting, database, email (if enabled), and AI model
          providers (e.g. Gemini) used to generate explanations — only as needed to deliver the product. Stripe
          processes payment details when billing is enabled; we do not store full card numbers.
        </p>
        <h2>Security contact</h2>
        <p>
          Report vulnerabilities or privacy concerns to:{' '}
          <a href="mailto:security@cybersentinel.example">security@cybersentinel.example</a> (replace with your
          production mailbox before go-live).
        </p>
        <h2>Contact</h2>
        <p>
          Support: <a href="mailto:support@cybersentinel.example">support@cybersentinel.example</a>
        </p>
        <p>
          Related: <Link to="/terms">Terms of Service</Link> ·{' '}
          <Link to="/install">Employee install guide</Link>
        </p>
      </main>
    </div>
  )
}
