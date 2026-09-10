# CyberSentinel × AISentinel — Combined Product & Integration Plan

**Date:** 2026-09-09  
**Audience:** Founders + engineering team  
**Status:** Decision document (agree before merge coding)  
**Inputs:**
- CyberShield AI / **CyberSentinel** (canonical monorepo)
- **AISentinel** logic merged into `backend/` / `frontend/` / `extension/` (former `aiextinct` / `sources/aisentinel` removed)
- [`Product_Readiness_And_Growth_Plan.md`](./Product_Readiness_And_Growth_Plan.md)
- [`Phase0_Kickoff_And_Decisions.md`](./Phase0_Kickoff_And_Decisions.md) — **D1–D8 locked**

---

## 0. One-page summary (read this first)

### What we are building (final product)

**One B2B product** that helps companies:

1. **See** what employees send to ChatGPT / Claude / Gemini (AISentinel strength).  
2. **Stop / explain** phishing, malicious URLs, risky prompts, and sensitive data leaks in the browser (CyberSentinel strength).  
3. **Govern** from one admin console with real logins, orgs, alerts, and policies (AISentinel spine).

**Working name (pick one later):**
- Prefer keeping **CyberSentinel** as the market brand (already in this repo), **or**
- Rebrand to **AISentinel** if the team wants “AI governance” positioning only.

Until decided, this doc uses:

> **Product = CyberSentinel Platform**  
> **Module A = AI Workplace Guard** (from AISentinel)  
> **Module B = Threat & Explainability Engine** (from CyberSentinel)

### One sentence pitch (sales)

> “Install our Chrome extension and in minutes you’ll see what your team sends to AI tools — and get clear explanations when links, emails, or prompts look dangerous.”

### What this is *not*

- Not an enterprise browser (Island / Prisma).  
- Not a full SIEM.  
- Not two separate apps glued with two logins.  
- Not “more ML models” before auth + billing.

### Thought-process rule

> **Sell the AISentinel job (org visibility + DLP).**  
> **Differentiate with CyberSentinel (explainable threat analysis).**  
> **Ship on AISentinel’s commercial spine (JWT, orgs, users, alerts).**  
> **Drop everything that does not serve that story.**

---

## 1. Thought process — how we should think

### 1.1 Start from the buyer, not from the code

| Question | CyberSentinel alone | AISentinel alone | Combined (target) |
| :--- | :--- | :--- | :--- |
| Who pays? | Unclear (user? MSME? demo?) | CTO / security lead of 10–100 person company | **Same as AISentinel** |
| What pain? | “Is this link/email/prompt bad?” | “What is my team pasting into ChatGPT?” | **Both**, one console |
| Why buy now? | Soft (awareness) | Strong (DPDP / leak / shadow AI) | Strong + clearer than pure DLP |
| Can we invoice? | No (shared API key) | Almost (JWT/orgs; no Stripe yet) | **Yes after billing** |

**Conclusion:** AISentinel has the **sellable job**. CyberSentinel has the **wow + trust differentiation**. Merging without picking a buyer creates a confused product again.

### 1.2 Two problems, one control plane

Employees live in the browser. Two risks show up there:

```text
┌─────────────────────────────────────────────────────────────┐
│                     Employee browser                         │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │ Risk A: Shadow AI / │    │ Risk B: Phishing / bad URL /│ │
│  │ secret paste to LLM │    │ prompt injection / scam eml │ │
│  │ (AISentinel core)   │    │ (CyberSentinel core)        │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                         ↓ one extension                      │
│                         ↓ one backend                        │
│                         ↓ one admin dashboard                │
└─────────────────────────────────────────────────────────────┘
```

Buyers already understand “AI data leak.” Adding “and we also explain phishing/prompt risk” makes the SKU wider **without** needing a second product.

### 1.3 Architecture thought process

| Layer | Decision |
| :--- | :--- |
| Identity | Take **AISentinel** (JWT, org, roles, invite tokens). Retire CyberSentinel shared `API_KEY` for humans. |
| Extension | **One** MV3 extension: AI-site observers + general page/URL/email protect. |
| Backend | **One** FastAPI app: org APIs + events/DLP + analyze/threats. Prefer AISentinel tenancy model. |
| Dashboard | **One** React admin: AISentinel ops pages + CyberSentinel scan/history/analytics as modules. |
| AI scoring | Keep CyberSentinel Gemini pipeline for explainability; keep AISentinel regex DLP for cheap/fast secret detection. |
| Advanced NF specs | Tokenize / WASM / shadow AI = **Phase 2+**, feature-flagged; do not block v1 sell. |

### 1.4 Product honesty thought process

Do **not** sell:
- Simulated geo as real intelligence  
- “Blocks all AI forever” (observe-first is OK if labeled)  
- Deepfake video if model is missing  
- Two brands to the same CTO  

Do sell:
- Visibility of AI prompts per employee  
- DLP alerts on secrets/PII  
- Explainable risk on URLs / text / prompts / email  
- Admin acknowledge → soft actions (close tabs / blackout) where already built  

### 1.5 What “complete sellable product” means for us

Minimum bar to charge money:

1. Admin signs up → org created  
2. Invites employees  
3. Extension installs with org/user identity  
4. Events + threats appear in one dashboard  
5. Plan limits + Stripe payment  
6. Privacy policy + Chrome Web Store (or managed install guide)  
7. Clear pricing page  

Until those exist, we have a **strong demo**, not a vendor.

---

## 2. What each project brings

### 2.1 CyberSentinel (main repo) — keep as Module B

| Asset | Keep? | Why |
| :--- | :---: | :--- |
| `/api/analyze` multi-type pipeline (url/text/prompt/email/image…) | Yes | Core differentiation |
| Gemini Tier-3 explainability + remediation | Yes | Buyer-facing “why” |
| Threat history / analytics / rules | Yes | Operator workflows |
| Landing page + branding assets | Yes (unify name) | Marketing shell |
| Chat assistant | Maybe | Useful; not required for v1 sell |
| Shared `X-API-Key` only auth | **No** | Blocks sales |
| Simulated geo / fake WHOIS as “intel” | **No / gate** | Trust killer |
| `/api/intel` federated claims | **No** for v1 | Docs-only honesty |
| Debug `/api/agent/*` in prod | **No** | Already gated; keep debug-only |
| Optional HF ML hybrid | Later | Not required for first revenue |

### 2.2 AISentinel (`aiextinct/`) — keep as Module A + spine

| Asset | Keep? | Why |
| :--- | :---: | :--- |
| JWT signup/login/me + roles | **Yes** | Commercial spine |
| Org + user tokens for extension | **Yes** | Per-employee attribution |
| Event ingest + DLP + alerts | **Yes** | Core sellable loop |
| Dashboard: events/alerts/users/settings/verify | **Yes** | Admin ops |
| Enforcement pull (close tabs / blackout) | Yes | Soft control story |
| OpenAI API proxy | Later | Nice Growth-plan upsell |
| Invite API | Yes | Need accept-invite UI |
| In-memory default storage | Dev only | Production = Mongo |
| `new features/` tokenization / WASM / shadow AI | Roadmap | After paying users |
| Separate product name forever | **No** | One brand |

### 2.3 Overlap (do not duplicate)

| Overlap | Integration rule |
| :--- | :--- |
| Two FastAPI apps | Merge into **one** API service |
| Two React Vite apps | Merge into **one** frontend |
| Two Chrome extensions | Merge into **one** extension |
| Two Mongo usages | One DB, namespaced collections / one Beanie app |
| Two “prompt risk” concepts | DLP regex (fast) + Gemini explain (deep) on same event |
| Two READMEs / Plan trees | One `doc/` truth; archive aiextinct Plan as reference |

---

## 3. Final product definition (what customers get)

### 3.1 Product name & modules

**Recommended market name:** **CyberSentinel**  
**Tagline:** *AI workplace protection — visibility, DLP, and explainable threat defense.*

| Module | User | Capability |
| :--- | :--- | :--- |
| **AI Workplace Guard** | Admin + employees | Monitor ChatGPT/Claude/Gemini/Google; DLP; alerts; soft enforcement |
| **Threat Explainer** | Admin + power users | Scan URL / text / prompt / email; indicators + remediation |
| **Extension** | Employees | Always-on capture + optional page protection |
| **Admin Console** | Admin / manager | Users, events, threats, alerts, policies, verify |

### 3.2 User roles (canonical)

| Role | Can do |
| :--- | :--- |
| **Admin** | Org settings, invites, policies, all events/threats, billing |
| **Manager** | Team events/alerts, acknowledge, soft enforcement |
| **Employee** | Extension identity; optional “my activity” view; personal scans if enabled |

### 3.3 v1 feature set (sell this)

**Must ship**
- Signup / login / org  
- Invite employees (token shown or email later)  
- Extension: AI-site observe + URL/page risk hooks  
- Events list with DLP findings  
- Analyze URL/text/prompt/email with explanations  
- Alerts for high DLP / high threat  
- Admin Verify (health + DLP smoke)  
- Mongo persistence  
- Usage quotas by plan  

**Explicitly out of v1**
- Full bi-directional anonymization vault  
- WASM/WebGPU local ML  
- Shadow-AI unknown-site protect mode  
- Enterprise SSO  
- Federated intel marketplace  
- Deepfake video claims  
- Multi-product billing complexity  

### 3.4 How a day looks for the customer

1. CTO signs up → gets org.  
2. Invites 10 engineers.  
3. Engineers install one Chrome extension and paste tokens (or managed policy later).  
4. Engineer pastes an API key into ChatGPT → **alert** in console.  
5. Engineer opens a phishing URL → extension warns with **explanation + actions**.  
6. Monday: admin opens dashboard → usage by tool + risk events → talks to team.

That loop is the product.

---

## 4. How we will sell it

### 4.1 Beachhead ICP (from AISentinel GTM — keep)

- Indian (then US) tech startups, **10–100 employees**  
- Buyer: CTO / Head of Eng / security-minded founder  
- Pain: “I don’t know what we paste into ChatGPT” + rising DPDP / client security questionnaires  
- Budget: ₹5k–₹50k/month range (not Island money)

### 4.2 Positioning

| Against | Our angle |
| :--- | :--- |
| Pure GenAI DLP (regex blockers) | We also **explain** phishing/prompt risk, not only block/flag secrets |
| Consumer antivirus / Safe Browsing | We are **org-aware** (who did what) |
| Enterprise browsers | We are **lightweight extension + console**, 5-minute setup |
| CyberSentinel-alone demo | We now have **accounts, orgs, and a payer** |

### 4.3 Packaging (starting point)

| Plan | Includes | Price sketch (align with AISentinel GTM) |
| :--- | :--- | :--- |
| **Trial** | 14 days, up to 5 users | Free |
| **Starter** | Extension + AI monitoring + DLP alerts + threat explainer (quota) | ₹4,999/mo or $149/mo (up to 10 users) |
| **Growth** | + higher quotas + custom DLP patterns + API proxy | ₹499/user/mo or $15/user/mo |
| **Enterprise** | SSO, retention, SLA — later | Custom |

Refine after 5 discovery calls; do not invent more tiers yet.

### 4.4 Sales motion (first 60 days after combined MVP)

1. **10 discovery calls** — validate combined pitch.  
2. **5 design partners** — install extension, weekly check-in.  
3. **Charge Starter** — even one paid org validates.  
4. **Case study** — “Found X secret pastes + Y phishing clicks in week 1.”  
5. Channels: LinkedIn CTOs, campus/startup communities, Product Hunt only after Store + auth + paywall.

### 4.5 Demo script (for sales / investors)

1. Login as admin → show empty/org dashboard.  
2. Show live event from ChatGPT paste with API key → DLP critical.  
3. Paste suspicious URL into Threat Explainer → indicators + remediation.  
4. Acknowledge alert → blackout/close tabs on employee side.  
5. Show per-user usage chart.  
6. End: pricing + install guide.

---

## 5. Integration plan (engineering)

### 5.1 Target repo shape

Keep **CyberShield AI** as the canonical repo. Fold `aiextinct` in; do not maintain two products forever.

```text
CyberShield-AI/   (canonical monorepo)
├── backend/                 # ONE FastAPI app (merged target)
├── frontend/                # ONE React admin + marketing
├── extension/               # ONE MV3 extension
├── doc/                     # Product + master plan + reference specs
└── docker-compose.yml
```

Former `aiextinct/` / `sources/aisentinel/` / optional ML dumps were **removed** after merge. Specs live under `doc/reference/`.

### 5.2 Backend merge strategy

**Principle:** AISentinel tenancy is the skeleton; CyberSentinel analyze engine is a service module.

| Step | Work |
| :--- | :--- |
| B1 | Adopt AISentinel auth routes (`/api/auth/*`, org, users, invites) |
| B2 | Keep CyberSentinel `/api/analyze`, `/api/threats`, `/api/stats`, rules, chat under same app |
| B3 | Scope **all** threat/event documents by `org_id` |
| B4 | Map extension auth: prefer org/user tokens; issue short-lived API keys per org if needed for analyze |
| B5 | On AI event ingest: run AISentinel DLP **and** optionally CyberSentinel prompt/text analyze for explanation |
| B6 | Unify health: AISentinel Admin Verify + CyberSentinel `/api/health` fields |
| B7 | Delete duplicate seed/config; one `.env.example` |
| B8 | Production: `STORAGE_BACKEND=mongodb` only |

**Auth migration rule**
- Humans → JWT  
- Extension → `X-Org-Token` + `user_token`  
- Machine/scripts → org-scoped API key (optional)  
- Global shared `dev-key` → local-only / removed in production  

### 5.3 Frontend merge strategy

| Step | Work |
| :--- | :--- |
| F1 | Start from AISentinel shell (login/signup already exist) |
| F2 | Port CyberSentinel landing (marketing) onto same app or keep marketing route |
| F3 | Nav groups: **Overview · AI Activity · Threats · Alerts · Users · Settings · Verify** |
| F4 | Port CyberSentinel scan form / threat history / analytics into **Threats** section |
| F5 | Single design tokens / brand (CyberSentinel visual language preferred if stronger) |
| F6 | Remove second login; remove shared-API-key settings for end users |

### 5.4 Extension merge strategy

| Step | Work |
| :--- | :--- |
| E1 | One `manifest.json` with AI-site content scripts **and** general browsing hooks |
| E2 | Popup: org token + user token + dashboard URL (from AISentinel) |
| E3 | Keep AISentinel ingest / response monitor / enforcement poll |
| E4 | Add CyberSentinel page URL scan / overlay warnings (sanitized DOM) |
| E5 | Shared offline queue; shared API base |
| E6 | Remove localhost-hardcoded debug telemetry leftovers from aiextinct content script |
| E7 | Store checklist → submit after identity flow works |

### 5.5 Data model merge (conceptual)

| Collection / concept | Source | Notes |
| :--- | :--- | :--- |
| Organization, User, Invite | AISentinel | Canonical |
| Event (AI prompts) | AISentinel | Add optional `explanation` from Gemini |
| Alert | AISentinel | Can also fire from high threat scans |
| Threat / AnalyzeResult | CyberSentinel | Add `org_id`, `user_id` |
| CustomRule / DLP patterns | Both | Prefer org-scoped patterns |
| EnforcementAction | AISentinel | Keep |

### 5.6 What to delete / archive (unwanted)

| Item | Action |
| :--- | :--- |
| Duplicate backends/frontends/extensions after merge | Delete or archive |
| CyberSentinel “intel sharing” product claims | Remove from landing/README |
| Simulated geo as a sold feature | Hide or label experimental |
| aiextinct Plan Next.js migration as near-term work | Archive; ignore for v1 |
| Two GTM stories | Replace with this doc’s pitch |
| Agent debug UI for customers | Keep internal only |
| Nested `aiextinct/.git` if present | Do not treat as submodule long-term; vendor as files then archive |

---

## 6. Phased delivery (team roadmap)

### Phase M0 — Align (3–5 days)

- [ ] Agree brand name (CyberSentinel vs AISentinel)  
- [ ] Agree ICP + Starter pricing  
- [ ] Agree v1 feature freeze (Section 3.3)  
- [ ] Assign owners: backend, frontend, extension, GTM  

**Exit:** This document signed off by team in chat/PR.

### Phase M1 — Spine merge (2–3 weeks)

- [ ] Single FastAPI with auth + analyze coexisting  
- [ ] Single frontend with login + threats + AI events  
- [ ] Single extension with tokens + both capture paths  
- [ ] Mongo tenancy on threats + events  
- [ ] Seed demo org that shows **both** flows  

**Exit:** One `run-local` path; demo script works end-to-end.

### Phase M2 — Sellable hardening (2–3 weeks)

- [ ] Stripe Starter checkout + plan quotas  
- [ ] Invite accept UX  
- [ ] Privacy policy + Web Store package  
- [ ] Remove/gate simulated intel  
- [ ] Staging deploy (Atlas + Render/Vercel or Compose VPS)  
- [ ] Admin Verify green on staging  

**Exit:** External design partner can install without engineering help.

### Phase M3 — First revenue (2–4 weeks)

- [ ] 5 pilot orgs  
- [ ] Fix top friction from pilots  
- [ ] One case study  
- [ ] Turn on paid Starter for new orgs  

**Exit:** ≥1 paying customer **or** clear kill/pivot note.

### Phase M4 — Differentiator roadmap (after revenue)

Priority order (from aiextinct `new features/` + CyberSentinel growth):

1. JIT micro-training on risky AI paste (educate > blind block)  
2. Harder enforcement modes (policy: warn / attest / block)  
3. Better prompt explainability on every AI event  
4. Clipboard lineage for configured internal domains  
5. Tokenization (anonymize secrets before send)  
6. Shadow AI detection  
7. SSO / compliance exports  

---

## 7. Decision log (team must choose)

| # | Decision | Options | Recommendation |
| :---: | :--- | :--- | :--- |
| D1 | Market brand | CyberSentinel / AISentinel / new name | **CyberSentinel** (repo + assets exist) |
| D2 | Primary wedge | AI Guard / Threat coach / both equal | **AI Guard primary**, Threat Explainer included |
| D3 | Canonical repo | CyberShield-AI / aiextinct | **CyberShield-AI** |
| D4 | Frontend base | Port CS into AIS shell / AIS into CS shell | **AIS shell + CS landing/threat pages** |
| D5 | Auth | Keep CS API key / AIS JWT | **AIS JWT** |
| D6 | Default AI mode | Observe / Block | **Observe + alert** in v1; block later |
| D7 | India-first pricing | Yes / USD-only | **Yes** (GTM already drafted) |

Fill “Chosen” column in a team meeting and paste below:

```text
D1 Chosen: CyberSentinel
D2 Chosen: AI Workplace Guard (+ Threat Explainer)
D3 Chosen: CyberShield AI monorepo
D4 Chosen: AISentinel shell + CS landing/threat pages
D5 Chosen: JWT + org/user tokens
D6 Chosen: Observe + alert
D7 Chosen: India startups 10–100
Date: 2026-09-09
```

---

## 8. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Frankenstein UX (two products in one nav) | Module naming + one onboarding story |
| Merge takes forever | Feature freeze v1; archive advanced specs |
| DOM scrapers break when ChatGPT UI changes | Platform adapters + Admin Verify ingest test |
| Gemini cost blows up | Quotas + cache + DLP-first, Gemini on medium+ only |
| Legal/HR pushback on monitoring | In-product disclosure checklist; customer owns policy |
| Brand confusion with “CyberSentinel” vs “AISentinel” | Decide D1 in M0; rename consistently |

---

## 9. Definition of done — “complete proper real product”

We call v1 **sellable** when all are true:

1. One brand, one repo, one extension, one API, one dashboard.  
2. Real multi-user orgs (not shared API key).  
3. AI activity monitoring + DLP alerts working in production Mongo.  
4. Threat explainability (URL/text/prompt/email) available to the same org.  
5. Paid plan or enforced trial → paid conversion path.  
6. Staging dry-run checklist passed.  
7. Privacy policy + install guide published.  
8. Team can run the Section 4.5 demo without apologizing for missing auth/tenancy.

---

## 10. Immediate next actions

1. Team reads this doc; completes **Decision log (Section 7)**.  
2. Create engineering epic **M1 Spine merge** with owners.  
3. Do **not** implement aiextinct NF-3…NF-6 before M2 billing.  
4. Update landing copy to the combined one-sentence pitch after D1.  
5. Keep [`Product_Readiness_And_Growth_Plan.md`](./Product_Readiness_And_Growth_Plan.md) as commercialization checklist; this doc supersedes wedge confusion by choosing **AI Guard + Threat Explainer**.

---

## 11. Related documents

| Doc | Role |
| :--- | :--- |
| This file | Combined product + integration truth |
| [`Product_Readiness_And_Growth_Plan.md`](./Product_Readiness_And_Growth_Plan.md) | Why CyberSentinel alone wasn’t sellable |
| [`Full_Project_Audit_Fixes_And_Improvements.md`](./Full_Project_Audit_Fixes_And_Improvements.md) | CS engineering status |
| [`Phased_Implementation_Plan.md`](./Phased_Implementation_Plan.md) | CS Phases 1–5 |
| [`reference/aisentinel-plan/`](./reference/aisentinel-plan/) | AISentinel specs (reference) |
| [`reference/aisentinel-plan/09_GTM_STRATEGY.md`](./reference/aisentinel-plan/09_GTM_STRATEGY.md) | Pricing / outreach draft |
| [`reference/aisentinel-advanced/00_VISION_AND_DIFFERENTIATION.md`](./reference/aisentinel-advanced/00_VISION_AND_DIFFERENTIATION.md) | Advanced DLP thesis (post-v1) |

---

## 12. Closing principle

> **AISentinel tells us who pays and how orgs work.**  
> **CyberSentinel tells us how to explain and defend threats.**  
> **Together they become one workplace browser security product — if we merge on identity first, features second, and refuse dual-product chaos.**

When the decision log is filled, engineering can start Phase M1 without re-debating strategy.
