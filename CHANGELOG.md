# Changelog

## 1.3.0

- Demo organization is created automatically when the API runs in memory mode during development.
- Dashboard AI activity and alerts update from the WebSocket, with polling as a fallback.
- Organizations can observe, warn, or block risky prompts before ChatGPT, Claude, or Gemini sends them. The default remains observe.
- High and critical alerts can email an address. Daily digest can be sent on demand. The default backend prints the message instead of sending mail.
- Stripe webhooks ignore an event id that was already applied. Billing shows a dev-mode banner when Stripe is not configured.
- Video uploads are refused in the scanner and the extension. Image checks stay available.
