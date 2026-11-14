# Seven-minute demo

Start with `.\run-local.ps1`. Memory mode logs in as `admin@demo.com` / `password` and already has sample AI events.

1. Open http://localhost:5173 and sign in. The form is prefilled in development.
2. Open AI Overview. Seeded counts are visible. If no Gemini key is set, the demo-mode chip is visible.
3. Load `extension/` unpacked. Popup → Config → **Use local demo** → Save. Status should say monitoring is active. The demo button uses the employee token `aisnl_usr_emp456`.
4. Org Settings → AI submit mode **Block**, threshold **Critical**, Save policies. Reload the extension so it picks up the policy.
5. On ChatGPT, paste `AKIAIOSFODNN7EXAMPLE` and press Send. The prompt stays on the page and a blocked overlay appears. AI Activity shows the row within a couple of seconds, marked Blocked, without a manual refresh.
6. Risk Alerts shows the critical alert. Acknowledge → Blackout. With the AI tab focused, the extension applies it within a few seconds (otherwise within 30 seconds).
7. Set an alert email and click **Send test email**. With `EMAIL_BACKEND=console` the API log prints the message. Point SMTP settings at Mailtrap when you want a real inbox.
8. Switch submit mode back to **Observe** before leaving the demo org, so everyday prompts are recorded and not stopped.
9. Billing shows Dev mode unless Stripe keys are set. Activate Starter updates the local plan and seat limit.

Threat Explainer (`/dashboard`) still explains URLs and prompts. Image deepfake checks are image-only. Do not demo video, SSO, or unknown-site shadow AI.
