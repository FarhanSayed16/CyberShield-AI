# Security FAQ

**What is stored?** The prompt text, a risk score, reasons, the AI site, and the employee identity for that organization.

**Who can read the full prompt?** Admins and managers in that organization. List views show a short preview.

**How does the extension authenticate?** An organization token plus a per-person user token. The dashboard uses a signed login token.

**How long is data kept?** The organization setting `retention_days` defaults to 90. Deleting the API process in memory mode drops the database immediately.

**Do alert emails contain the prompt?** No. They contain the employee name, severity, and the short reasons.

**What leaves the machine?** Events go to the CyberSentinel API you configure. The default local API is `http://localhost:8000`.
