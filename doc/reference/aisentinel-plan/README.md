# AISentinel — AI Control & Trust Layer (MVP)

> **"Cloudflare for AI" · "Okta for AI" · "CrowdStrike for AI"**
> The control plane every company using AI must rely on.

**Product name:** AISentinel  
**Repo folder:** `AI_safe_Extension` (this repository)  
**Code package root:** `aisentinel/` (created during implementation)

---

## One-line summary

AISentinel sits between employees and every AI tool they use — capturing, classifying, and governing AI traffic so companies know **who sent what to which AI**.

---

## Stack truth table (canonical for MVP)

| Layer | MVP (build now) | Documented alternative |
|-------|-----------------|------------------------|
| API | FastAPI modular monolith (Python 3.11+) | — |
| Primary DB | **MongoDB 7** (Motor + Beanie ODM) | PostgreSQL archived in `05_DATABASE_SCHEMA.md` |
| Cache | Redis 7 (sessions, rate limits, WS fanout) | — |
| Frontend | **React 18 + Vite + Tailwind + Recharts** | Next.js 14 App Router in `07b_NEXTJS_MIGRATION.md` |
| Extension | Chrome Manifest V3 (vanilla JS) | — |
| Deploy | **Docker Compose** (local + staging) | AWS/K8s in `18_SCALING_STRATEGY.md` |
| Auth | JWT (HS256) + bcrypt | OAuth/Okta in `11_SECURITY_SPEC.md` (Phase 2+) |
| DLP | Regex + entropy + optional spaCy NER | ML classifier hook in `14_RISK_DETECTION_ENGINE.md` |

---

## Document index (complete)

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | Master index, stack, reading order |
| [`AGENTIC_QUICKSTART.md`](AGENTIC_QUICKSTART.md) | Copy-paste prompts for implementation agents |
| [`01_RESEARCH.md`](01_RESEARCH.md) | Market research, competitive landscape |
| [`02_PRODUCT_SPEC.md`](02_PRODUCT_SPEC.md) | Product vision, phases, user roles |
| [`03_TECHNICAL_ARCHITECTURE.md`](03_TECHNICAL_ARCHITECTURE.md) | System design, components, data flows |
| [`04_MVP_BUILD_PLAN.md`](04_MVP_BUILD_PLAN.md) | Week-by-week build plan |
| [`05_DATABASE_SCHEMA.md`](05_DATABASE_SCHEMA.md) | **Archived** PostgreSQL reference |
| [`05b_MONGODB_SCHEMA.md`](05b_MONGODB_SCHEMA.md) | **Canonical** MongoDB collections, indexes, Beanie models |
| [`06_API_SPEC.md`](06_API_SPEC.md) | REST API contracts |
| [`07_FRONTEND_SPEC.md`](07_FRONTEND_SPEC.md) | React + Vite dashboard spec |
| [`07b_NEXTJS_MIGRATION.md`](07b_NEXTJS_MIGRATION.md) | Next.js migration path (do not build in MVP) |
| [`08_CHROME_EXTENSION_SPEC.md`](08_CHROME_EXTENSION_SPEC.md) | Chrome extension architecture |
| [`09_GTM_STRATEGY.md`](09_GTM_STRATEGY.md) | Go-to-market, pricing, outreach |
| [`10_DEVOPS_CI_CD.md`](10_DEVOPS_CI_CD.md) | GitHub Actions, branches, artifacts |
| [`11_SECURITY_SPEC.md`](11_SECURITY_SPEC.md) | Threat model, auth, encryption, compliance |
| [`12_TESTING_STRATEGY.md`](12_TESTING_STRATEGY.md) | Unit, integration, E2E, extension matrix |
| [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md) | Docker Compose, env, healthchecks |
| [`14_RISK_DETECTION_ENGINE.md`](14_RISK_DETECTION_ENGINE.md) | DLP rules, scoring, severity bands |
| [`15_POLICIES_SPEC.md`](15_POLICIES_SPEC.md) | Policy engine (documented; enforce Phase 2) |
| [`16_REPOSITORY_STRUCTURE.md`](16_REPOSITORY_STRUCTURE.md) | Full repo tree, module boundaries |
| [`17_IMPLEMENTATION_SEQUENCE.md`](17_IMPLEMENTATION_SEQUENCE.md) | Gated build order for agents |
| [`18_SCALING_STRATEGY.md`](18_SCALING_STRATEGY.md) | AWS, Atlas, K8s, Kafka (post-traction) |
| [`19_ADMIN_VERIFY_DASHBOARD.md`](19_ADMIN_VERIFY_DASHBOARD.md) | Admin pipeline verification UI + APIs |
| [`20_ORG_EMPLOYEE_MONITORING.md`](20_ORG_EMPLOYEE_MONITORING.md) | **How orgs deploy extension to monitor employees** |

**Agent entry (repo root):** [`../AGENTS.md`](../AGENTS.md)  
**Project skills:** [`.cursor/skills/`](../.cursor/skills/)

---

## Reading order

### For founders / PMs
1. `README.md` → `20_ORG_EMPLOYEE_MONITORING.md` → `02_PRODUCT_SPEC.md` → `09_GTM_STRATEGY.md`

### For architects
1. `README.md` → `03_TECHNICAL_ARCHITECTURE.md` → `05b_MONGODB_SCHEMA.md` → `06_API_SPEC.md` → `11_SECURITY_SPEC.md`

### For implementation agents (strict order)
1. `README.md` → `20_ORG_EMPLOYEE_MONITORING.md` → `16_REPOSITORY_STRUCTURE.md` → `17_IMPLEMENTATION_SEQUENCE.md`
2. `13_DEPLOYMENT_DOCKER.md` → `05b_MONGODB_SCHEMA.md` → `06_API_SPEC.md` → `14_RISK_DETECTION_ENGINE.md`
3. `07_FRONTEND_SPEC.md` → `19_ADMIN_VERIFY_DASHBOARD.md` → `08_CHROME_EXTENSION_SPEC.md`
4. `04_MVP_BUILD_PLAN.md` (week-by-week) → `12_TESTING_STRATEGY.md` → `10_DEVOPS_CI_CD.md`

### Recommended first prompt
```
Read AGENTS.md and Plan/17_IMPLEMENTATION_SEQUENCE.md.
Build AISentinel MVP: Docker Compose + FastAPI + MongoDB + Redis + React dashboard + Chrome MV3.
Pass Gate 4 (Admin Verify) before polish. Source of truth: Plan/05b, 06, 07, 08, 14, 19.
```

---

## MVP scope

**Build:** AI Usage Visibility for teams — Chrome extension + backend + admin dashboard + DLP alerts + **Admin Verify** page.

### In scope (P0)
- Chrome extension: ChatGPT, Claude, Gemini (observe-only)
- Event ingest + DLP scan + MongoDB storage
- Dashboard: overview, events, alerts, users, settings
- **Admin Verify** (`/admin/verify`): health, synthetic ingest, DLP smoke tests
- Docker Compose local stack

### Out of scope (Phase 2+)
- Prompt blocking / enforcement
- Multi-model router
- Enterprise SSO (Okta/SAML)
- Billing engine
- Full compliance exports

---

## MVP core features

| Feature | Priority |
|---------|----------|
| Prompt capture (extension) | P0 |
| User identification | P0 |
| Dashboard analytics | P0 |
| Admin Verify dashboard | P0 (ops) |
| Sensitive data detection | P1 |
| Admin alerts | P1 |
| API proxy (OpenAI-compatible) | P1 |
| Policy engine (enforce) | P2 (spec in `15`) |

---

## Competitive differentiation

Most AI gateways (LiteLLM, Portkey, Helicone, Cloudflare AI Gateway) cover **API traffic only**. AISentinel also captures:

- Browser UIs (ChatGPT.com, Claude.ai, Gemini)
- Personal-account usage (shadow AI)
- Per-employee identity (not just API keys)

---

## Validation numbers

- 45% of enterprise employees use generative AI at work
- 77% copy-paste company data into AI chatbots
- 82% of pastes use unmanaged personal accounts
- 98% report unsanctioned AI use
- Only 18% have formal AI security policy

*Sources: LayerX Security 2025, CrowdStrike 2026, IBM Cost of Breach 2025*

---

## Target customer (MVP)

Tech startups, 10–100 employees, CTO worried about data leaks, budget $500–$5000/month.

---

## Timeline

| Phase | Duration | Goal |
|-------|----------|------|
| MVP build | 3 weeks | Docker prototype + Admin Verify passing |
| Beta | Weeks 4–6 | 5–10 paying teams |
| V1 | Weeks 7–12 | Enforcement + Slack alerts |
| V2 | Month 4–6 | Router + compliance |

---

## External agent skills

| Skill | Install |
|-------|---------|
| **caveman** (terse output, fewer tokens) | [`CAVEMAN_SETUP.md`](CAVEMAN_SETUP.md) |
| Project skills | See `.cursor/skills/` and `AGENTS.md` |

---

## Success metric (north star)

**5 paying teams** actively using the product weekly, with Admin Verify checklist green on onboarding day.
