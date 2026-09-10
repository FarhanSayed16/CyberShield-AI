# 02 — Product Specification

## 🎯 Product Vision

AISentinel is the **control plane for AI usage** inside organizations. Like how Cloudflare sits between the internet and your servers, AISentinel sits between your employees and every AI tool they use.

**Primary customer job:** An organization deploys AISentinel to **monitor employees** — who uses ChatGPT, Claude, or Gemini, how often, and **what they send** (with DLP for secrets/PII). See [`20_ORG_EMPLOYEE_MONITORING.md`](20_ORG_EMPLOYEE_MONITORING.md).

---

## 📦 Product Phases

### Phase 1 — MVP: AI Visibility Layer (Build This First)
**Theme:** "See what's happening"

| Feature | Description | Priority |
|---------|-------------|----------|
| Chrome Extension | Captures prompts/responses on ChatGPT, Claude, Gemini web UIs | P0 |
| API Proxy | Drop-in proxy for OpenAI/Anthropic API calls | P0 |
| Usage Dashboard | Per-user, per-tool usage stats + timeline | P0 |
| Team Management | Admin creates org, invites employees via email | P0 |
| DLP Scanner | Flags PII, API keys, credentials in prompts | P0 |
| Alert Feed | Real-time list of flagged events | P1 |
| Basic Reports | Weekly email digest of AI usage to admin | P1 |
| Admin Verify | One-page pipeline health check for org admins | P0 |

**Definition of Done for Phase 1:**
- Admin can sign up, create org, invite 5 employees
- Employees install Chrome extension
- Admin dashboard shows every prompt sent to ChatGPT + Claude by every employee
- DLP engine flags prompts containing email addresses, API keys, phone numbers
- All data stored + queryable

---

### Phase 2 — Control Layer (Month 2–3)
**Theme:** "Control what happens"

| Feature | Description |
|---------|-------------|
| Block Rules | Admin can block specific AI tools or specific data patterns |
| Permissions Matrix | Define which roles can use which AI tools |
| Real-time Enforcement | Extension blocks submission if rule triggered |
| Alert Notifications | Slack/email alert on DLP violation |
| Prompt Redaction | Auto-redact detected sensitive data before sending |

---

### Phase 3 — Router (Month 4–5)
**Theme:** "Optimize AI spend"

| Feature | Description |
|---------|-------------|
| Multi-model Router | Route API calls to cheapest/fastest model per task type |
| Cost Dashboard | Track $$$ spent per user per model |
| Budget Controls | Set monthly spend limits per user/team |
| Model Performance Tracker | Compare accuracy across models |
| Fallback Chains | Auto-failover if primary model is down |

---

### Phase 4 — Platform (Month 6+)
**Theme:** "Become infrastructure"

| Feature | Description |
|---------|-------------|
| Compliance Reports | SOC2, GDPR, DPDP audit exports |
| AI Identity SSO | SAML/OIDC integration for enterprise SSO |
| Agent Monitoring | Monitor AI agents, not just human users |
| Custom Model Support | Route to self-hosted/local models |
| API for Developers | Full programmatic control via AISentinel API |

---

## 👤 User Roles

### Admin (CTO / Security Lead)
- Creates organization
- Invites employees
- Sees all usage across all employees
- Sets policies, block rules, DLP patterns
- Receives alert notifications

### Employee (Developer / Analyst / etc.)
- Installs Chrome extension
- Configures API proxy (or it's preconfigured by admin)
- Sees only their own usage in dashboard
- Receives alerts when their prompts are flagged

### Viewer (Manager)
- Read-only access to team usage
- Cannot modify policies

---

## 📱 Interfaces

### 1. Web Dashboard (React SPA)
- URL: `app.aisentinel.io` (or `localhost:3000` for MVP)
- Responsive, works on mobile
- Real-time updates via WebSocket

### 2. Chrome Extension
- Popup UI showing current session stats
- Badge count for flagged prompts today
- Settings panel for connecting to org

### 3. API Proxy Endpoint
- Drop-in replacement for OpenAI base URL
- Developers change `base_url` in their code
- Zero other code changes required

### 4. REST API
- For programmatic access + future integrations
- Full Swagger/OpenAPI docs

---

## 🔔 Alert Types (MVP)

| Alert Type | Trigger | Severity |
|-----------|---------|----------|
| PII Detected | Email address in prompt | Medium |
| Credential Leak | API key / token pattern in prompt | Critical |
| Financial Data | Credit card / bank account pattern | Critical |
| Company Name Leak | Detected company-specific terms | Medium |
| Personal Account Usage | Employee using personal AI login | High |
| High Volume Usage | Employee sending 100+ prompts/day | Low |

---

## 📐 UX Principles

1. **Non-technical first** — Admin should understand dashboard without reading docs
2. **No friction for employees** — Extension must be invisible during normal work
3. **Fast to value** — Admin sees first data within 5 minutes of setup
4. **India-context aware** — Support Indian phone number formats, Aadhaar patterns in DLP
