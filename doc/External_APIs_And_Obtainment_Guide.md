# External APIs, services & mock modes — obtainment guide

**Date:** 2026-09-09  
**Product:** CyberSentinel (AI Workplace Guard + Threat Explainer)  
**Purpose:** Complete list of every external dependency, what the app does when it is missing, and how to get real credentials.

Canonical env names: root [`.env.example`](../.env.example) · [`backend/.env.example`](../backend/.env.example) · [`frontend/.env.example`](../frontend/.env.example)

---

## Quick priority (what to get first)

| Priority | Item | Why |
| :---: | :--- | :--- |
| **P0** | MongoDB Atlas (or local Mongo) | Real persistence for orgs, events, threats |
| **P0** | Strong `JWT_SECRET` | Auth / Guard |
| **P0** | Google Gemini API key(s) | Live Threat Explainer + chat (or keep `USE_MOCK_AGENTS=true` for demos) |
| **P1** | Hosting: Render + Vercel | Staging/prod URLs |
| **P1** | Stripe TEST keys + Price | Real checkout (else use `dev-activate`) |
| **P2** | Google Safe Browsing, VirusTotal | Stronger URL reputation |
| **P2** | Redis | Shared rate limits (optional; fail-open) |
| **P3** | SafePrompt, NVIDIA NIM, Hive, PhishStats, HF URL, OpenAI proxy | Enrichers / Growth features |
| **Later** | SMTP / email provider | Invites are **manual** today |

---

## Legend

| Behavior when missing | Meaning |
| :--- | :--- |
| **Required** | Core path breaks or is only for smoke without it |
| **Skip** | Feature quietly omitted; rest of pipeline continues |
| **Fail-open** | Treated as “allow / no limit” so the product still runs |
| **Mock / heuristic** | Fake or local-only results; fine for demos, not production truth |
| **Dev substitute** | Built-in admin/dev path instead of the vendor |

---

# 1. Infrastructure (not vendor AI keys)

## 1.1 MongoDB

| | |
| :--- | :--- |
| **Env** | `MONGODB_URI`, `DB_NAME`, `STORAGE_BACKEND` |
| **Used for** | Orgs, users, events, alerts, threats, billing state |
| **If missing** | Set `STORAGE_BACKEND=memory` → **mongomock** (ephemeral; good for pytest/smoke only). Real Mongo down → health degraded; writes fail |
| **v1** | **Required** for real staging/prod |

### How to get it

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) → free **M0** cluster.  
2. Database Access → create user.  
3. Network Access → allow your IP (or `0.0.0.0/0` for Render with caution).  
4. Connect → Drivers → copy URI → set as `MONGODB_URI`.  
5. Set `DB_NAME=cybersentinel` (or `cybersentinel_staging`) and `STORAGE_BACKEND=mongodb`.  
6. After first deploy: `python -m app.scripts.ensure_indexes` (see [`ops/Staging_Runbook.md`](./ops/Staging_Runbook.md)).

**Local alternative:** `docker compose up -d mongo` → `MONGODB_URI=mongodb://127.0.0.1:27017`.

---

## 1.2 Redis

| | |
| :--- | :--- |
| **Env** | `REDIS_URL` |
| **Used for** | Org event rate limit (~600/min); admin health |
| **If missing / down** | **Fail-open** — rate limit allows traffic |
| **v1** | Optional |

### How to get it

- Local: `docker compose up -d redis` → `redis://127.0.0.1:6379/0`  
- Cloud: [Upstash](https://upstash.com/) Redis (free tier) or Render Redis → paste URL into `REDIS_URL`

---

## 1.3 Auth & app URLs (you generate — no signup)

| Env | Purpose | If missing / weak |
| :--- | :--- | :--- |
| `JWT_SECRET` | Sign JWTs | Staging/prod **refuse** short/default secrets |
| `JWT_EXPIRE_HOURS` | Token lifetime | Defaults to 24 |
| `API_KEY` | Legacy machine / Explainer `X-API-Key` | Staging/prod refuse `dev-key` etc. Prefer JWT |
| `ENVIRONMENT` | `development` \| `staging` \| `production` | Controls hardening + debug agents |
| `CORS_ORIGINS` | Allowed frontend origins | Must list real Vercel URL in cloud |
| `FRONTEND_URL` | Invite links, Stripe return URLs | Must match dashboard |

### How to generate secrets

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use once for `JWT_SECRET`, again for `API_KEY`. Never commit real values.

---

## 1.4 Hosting (not env keys, but required for cloud)

| Piece | Suggested free path | Guide |
| :--- | :--- | :--- |
| Backend API | [Render](https://render.com/) Web Service, root `backend` | [`free_tier_deployment_guide.md`](./free_tier_deployment_guide.md) |
| Frontend | [Vercel](https://vercel.com/) project, root `frontend` | Same + set `VITE_*` **before** build |
| Extension | Load unpacked / Web Store later | [`../extension/INSTALL.md`](../extension/INSTALL.md) |

---

# 2. Google Gemini (primary AI — Explainer)

| | |
| :--- | :--- |
| **Env** | `GEMINI_API_KEYS` (**plural**, comma-separated), `GEMINI_BASE_URL`, `USE_MOCK_AGENTS` |
| **Used for** | Threat explanation, chat assistant, phishing/prompt/deepfake Tier-3 Gemini paths |
| **If empty + mocks off** | Soft offline / dummy “API offline” style responses on some paths |
| **If `USE_MOCK_AGENTS=true`** | **Mock agents** — canned JSON / chat; **no** Gemini calls |
| **v1** | **Required for live Explainer**; mocks OK for demos/CI |

### How to get it

1. Open [Google AI Studio](https://aistudio.google.com/apikey).  
2. Create API key (Google account).  
3. Set in `backend/.env`:

```env
GEMINI_API_KEYS=your_key_here
# Optional rotation:
# GEMINI_API_KEYS=key1,key2
USE_MOCK_AGENTS=false
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

4. Restart API. Confirm `/api/health` shows agents live (not mock) when intended.

**Quota / billing:** AI Studio free tier has rate limits; for heavier load enable billing in Google Cloud and use a paid key. Model used in code: `gemini-2.5-flash-lite` (via `gemini_base.py`).

---

# 3. Optional URL / content enrichers

These **skip** when the key is empty. Product still works (heuristics + Gemini).

## 3.1 Google Safe Browsing

| | |
| :--- | :--- |
| **Env** | `SAFE_BROWSING_API_KEY` |
| **Used for** | URL reputation in analyze pipeline |
| **If missing** | **Skip** |

### How to get it

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select project.  
2. Enable **Safe Browsing API**.  
3. APIs & Services → Credentials → API key.  
4. Restrict key to Safe Browsing if possible.  
5. Docs: [Safe Browsing API](https://developers.google.com/safe-browsing)

```env
SAFE_BROWSING_API_KEY=AIza...
```

---

## 3.2 VirusTotal

| | |
| :--- | :--- |
| **Env** | `VIRUSTOTAL_API_KEY` |
| **Used for** | URL/file reputation enrichment |
| **If missing** | **Skip** |

### How to get it

1. Register at [VirusTotal](https://www.virustotal.com/gui/join-us).  
2. Profile → API key.  
3. Free tier: low rate limits (fine for demos).  
4. Docs: [VT API v3](https://docs.virustotal.com/reference/overview)

```env
VIRUSTOTAL_API_KEY=...
```

---

## 3.3 PhishStats

| | |
| :--- | :--- |
| **Env** | `PHISHSTATS_API_URL` (default `https://phishstats.info/api`) |
| **Used for** | Phishing URL intel lookup |
| **If URL empty** | **Skip**; if default left set, client **attempts** public API and returns `None` on error |

### How to get it

- Public community API: [phishstats.info](https://phishstats.info/) — often **no key**.  
- To disable entirely: `PHISHSTATS_API_URL=`  
- Treat as best-effort; do not rely on for compliance decisions.

---

## 3.4 SafePrompt

| | |
| :--- | :--- |
| **Env** | `SAFEPROMPT_API_KEY` |
| **Used for** | Prompt-injection / unsafe prompt scoring |
| **If missing** | **Skip** |

### How to get it

1. Check current vendor signup (product branding may change) — search “SafePrompt API” or use your procurement list.  
2. Create account → copy API key → `SAFEPROMPT_API_KEY=...`  
3. If you cannot obtain it, leave empty; local heuristics + Gemini still cover prompt analysis.

---

## 3.5 NVIDIA NIM (Llama Guard–style)

| | |
| :--- | :--- |
| **Env** | `NVIDIA_API_KEY` |
| **Used for** | Extra prompt safety via NVIDIA integrate API |
| **If missing / error** | **Fail-open safe** (`is_safe: True`) — does not block |

### How to get it

1. [NVIDIA NGC / AI Foundation](https://build.nvidia.com/) (or [NVIDIA API catalog](https://www.nvidia.com/en-us/ai/)).  
2. Create API key for NIM / integrate endpoints.  
3. Set `NVIDIA_API_KEY=nvapi-...`  
4. Code talks to `integrate.api.nvidia.com` via OpenAI-compatible client (`nvidia_nim.py`).

---

## 3.6 Hive AI (deepfake / vision)

| | |
| :--- | :--- |
| **Env** | `HIVE_AI_API_KEY` |
| **Used for** | Deepfake / image moderation enrichment |
| **If missing** | **Skip** |

### How to get it

1. [Hive Moderation](https://hivemoderation.com/) / Hive developer portal → API key.  
2. Set `HIVE_AI_API_KEY=...`  
3. Without it, deepfake path relies on Gemini mock/live or HF remote if configured.

---

## 3.7 Remote hybrid ML (`HF_API_URL`)

| | |
| :--- | :--- |
| **Env** | `HF_API_URL` |
| **Used for** | Tier 1/2 URL/text/image classifiers (optional remote service) |
| **If empty** | **Gemini-only / local heuristics** (`pipeline_mode: gemini_only`) |
| **v1** | Optional — in-repo ML service was removed; leave empty for free deploy |

### How to get it (later)

1. Host any compatible inference API (Hugging Face Space, Fly, Railway, your own GPU box).  
2. Set `HF_API_URL=https://your-inference-host` (no trailing slash issues — code strips).  
3. Backend client: `backend/app/clients/hf_ml.py`.  
4. Until then, leave blank; UI notes Gemini-only on scan form.

---

# 4. Billing — Stripe

| | |
| :--- | :--- |
| **Env** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `ALLOW_DEV_BILLING` |
| **Used for** | Checkout Session for Starter plan; webhooks to activate paid |
| **If keys empty** | Use Billing → Activate Starter (dev) only when `ALLOW_DEV_BILLING=true` and `ENVIRONMENT=development` |
| **v1** | Optional for pilots; **required** before real charges |

### How to get it

1. [Stripe Dashboard](https://dashboard.stripe.com/register) → use **Test mode**.  
2. Developers → API keys → copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.  
3. Product catalog → create Product **Starter** → recurring Price → copy `price_...` → `STRIPE_PRICE_STARTER`.  
4. Developers → Webhooks → Add endpoint:  
   `https://<your-api>/api/billing/webhook`  
   Events: at least `checkout.session.completed` (and subscription updates if you expand later).  
5. Copy signing secret `whsec_...` → `STRIPE_WEBHOOK_SECRET`.  
6. Local webhook testing: [Stripe CLI](https://stripe.com/docs/stripe-cli)  
   `stripe listen --forward-to localhost:8000/api/billing/webhook`  
7. Test card: `4242 4242 4242 4242` (Stripe docs).

**Go live later:** switch to live keys + live price IDs; never mix test/live.

---

# 5. OpenAI proxy (Growth — optional)

| | |
| :--- | :--- |
| **Env** | `OPENAI_API_KEY` (or request header `X-Real-Provider-Key`) |
| **Used for** | `POST /api/proxy/openai/...` org-scoped proxy |
| **If missing** | **400** — proxy not configured |
| **v1** | Optional; not needed for Guard/Explainer core |

### How to get it

1. [OpenAI Platform](https://platform.openai.com/api-keys) → Create secret key.  
2. Add billing method (required for most usage).  
3. `OPENAI_API_KEY=sk-...` in backend env.  
4. Keep off until you intentionally sell proxying; watch cost and abuse.

---

# 6. Email / invites (no provider yet)

| | |
| :--- | :--- |
| **Env** | *None* — no `SMTP_*` |
| **Behavior** | Invite API returns `accept_url` + `email_delivery: "manual"` |
| **v1** | Copy link to employee (Slack/email manually) |

### How to add later (suggestion)

| Provider | Free/dev path | Typical env (future) |
| :--- | :--- | :--- |
| [Resend](https://resend.com/) | Free tier | `RESEND_API_KEY`, from-address |
| [SendGrid](https://sendgrid.com/) | Free tier | `SENDGRID_API_KEY` |
| [Amazon SES](https://aws.amazon.com/ses/) | Pay-as-you-go | AWS keys + region |
| [Mailgun](https://www.mailgun.com/) | Trial | `MAILGUN_API_KEY` |

Wire into `routes_users.py` invite after you pick one; until then keep documenting “share accept URL”.

---

# 7. Built-in mocks & simulated features (no API to buy)

| Feature | Trigger / location | What you get | Production advice |
| :--- | :--- | :--- | :--- |
| **Mock Gemini agents** | `USE_MOCK_AGENTS=true` | Canned analyze/chat | Off in real staging/prod |
| **Frontend API mocks** | `VITE_USE_MOCKS=true` (non-PROD only) | Fake analyze/threats/stats/chat in UI | Never in Vercel prod build |
| **In-memory DB** | `STORAGE_BACKEND=memory` | mongomock; data dies on restart | Smoke/tests only |
| **Domain intel** | `GET /api/analyze/domain` | Simulated WHOIS/VT-style flags (`simulated=True`) | Demo UX only |
| **Geo analytics** | `GET /api/analytics/geo` | Hash-based fake regions | Demo charts only |
| **Report “vault”** | `POST /api/report` | Success + fake report id; **no** S3/GCS | Screenshots not persisted long-term |
| **Billing dev mode** | Empty Stripe keys | `dev-activate` | Pilots without Stripe |
| **Dead WHOIS client** | `whois_client.py` | **Unused** (api-ninjas style) | Ignore or delete later |
| **DLP** | Local regex / hybrid | **No external API** | Core Guard — already “real” |

---

# 8. Frontend env (no third-party AI keys)

| Env | Purpose | How to set |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend origin | Local `http://localhost:8000` / Render URL |
| `VITE_WS_URL` | Threats websocket | `ws://…` or `wss://…/api/ws/threats` |
| `VITE_API_KEY` | Optional machine key | Prefer leave unset; use login JWT |
| `VITE_USE_MOCKS` | UI mocks | `false` for real backend |

Vite vars are **bake-time** — set in Vercel env, then redeploy.

---

# 9. Extension config (chrome.storage — not `.env`)

| Field | Purpose | Where to get value |
| :--- | :--- | :--- |
| API URL | Backend origin | Same as `VITE_API_URL` |
| Org token | Guard ingest auth | Dashboard → Org Settings |
| User token | Per-employee identity | Dashboard → Team |
| Dashboard URL | Deep links | Frontend origin |
| API key | Legacy Explainer only | Optional; prefer tokens |

See [`extension/INSTALL.md`](../extension/INSTALL.md). No Gemini/Stripe keys in the extension.

---

# 10. Checklist — fill as you obtain keys

Copy into your password manager / vault (do not commit).

```text
[ ] MONGODB_URI (+ DB_NAME, STORAGE_BACKEND=mongodb)
[ ] JWT_SECRET (32+ chars)
[ ] API_KEY (strong; staging/prod)
[ ] CORS_ORIGINS + FRONTEND_URL (real frontend)
[ ] GEMINI_API_KEYS  →  USE_MOCK_AGENTS=false
[ ] REDIS_URL (optional)
[ ] STRIPE_SECRET_KEY + STRIPE_PRICE_STARTER + STRIPE_WEBHOOK_SECRET  OR  use dev-activate
[ ] SAFE_BROWSING_API_KEY (optional)
[ ] VIRUSTOTAL_API_KEY (optional)
[ ] PHISHSTATS_API_URL (default OK / or empty to disable)
[ ] SAFEPROMPT_API_KEY (optional)
[ ] NVIDIA_API_KEY (optional)
[ ] HIVE_AI_API_KEY (optional)
[ ] HF_API_URL (optional; leave empty for Gemini-only)
[ ] OPENAI_API_KEY (optional proxy only)
[ ] Email provider (future — invites still manual)
[ ] Vercel VITE_API_URL / VITE_WS_URL
[ ] Extension apiBase + orgToken + userToken
```

---

# 11. Minimal “real demo” vs “full production”

### Minimal real demo (recommended next)

```env
ENVIRONMENT=staging   # or development locally
STORAGE_BACKEND=mongodb
MONGODB_URI=...       # Atlas
JWT_SECRET=...        # strong
API_KEY=...           # strong
GEMINI_API_KEYS=...
USE_MOCK_AGENTS=false
CORS_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
# Stripe empty → set ALLOW_DEV_BILLING=true and use Billing → Activate Starter (dev)
```

### Fuller production enrichment

Add Safe Browsing + VirusTotal + Stripe TEST/LIVE + Redis; keep `HF_API_URL` empty until you host ML; add Resend (or similar) for invites.

---

## Related docs

- [`ops/Staging_Runbook.md`](./ops/Staging_Runbook.md)  
- [`free_tier_deployment_guide.md`](./free_tier_deployment_guide.md)  
- [`Phase5_Commercial_Legal_Distribution.md`](./Phase5_Commercial_Legal_Distribution.md)  
- [`Master_Integration_Execution_Plan.md`](./Master_Integration_Execution_Plan.md)
