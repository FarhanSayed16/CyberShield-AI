# Phase 0 — Kickoff & Decision Freeze

**Date locked:** 2026-09-09  
**Canonical repo:** CyberShield AI (CyberSentinel)  
**Status:** Complete — Phase 1 foundations may begin  

This closes **Phase 0** of [`Master_Integration_Execution_Plan.md`](./Master_Integration_Execution_Plan.md).

---

## 0.1 Kickoff

| Item | Status |
| :--- | :--- |
| Master Plan adopted as execution source of truth | Done |
| Implementation start authorized | Done (2026-09-09) |
| Product / eng ownership | Core team (CyberSentinel) — assign named owners in weekly sync |
| Cadence | Follow Master Plan phases; weekly progress against checklist |

---

## 0.2 Decisions D1–D8 (LOCKED)

| ID | Decision | Chosen |
| :---: | :--- | :--- |
| **D1** | Market brand | **CyberSentinel** |
| **D2** | Primary wedge | **AI Workplace Guard** (+ Threat Explainer included) |
| **D3** | Canonical repo | **CyberShield AI** (this monorepo only) |
| **D4** | Frontend base | **AISentinel auth/ops shell** + CyberSentinel landing/threat pages |
| **D5** | Auth model | **JWT** (dashboard) + **org/user tokens** (extension) |
| **D6** | v1 AI mode | **Observe + alert** (no hard-block by default) |
| **D7** | Beachhead | **India startups, 10–100 employees** |
| **D8** | Starter price | **₹4,999/mo** or **$149/mo** (up to 10 users) |

---

## 0.3 v1 scope freeze

### In scope
- Signup / login / org / roles  
- Employee invite + extension tokens  
- AI observe: ChatGPT, Claude, Gemini (+ Google Search if stable)  
- Server DLP + alerts + soft enforcement (close tabs / blackout)  
- Threat analyze: URL, text, prompt, email  
- Org-scoped history + analytics  
- Admin Verify  
- MongoDB for staging/prod  
- Quotas + Stripe (or trial→paid)  
- Privacy policy + install guide  
- Staging + production deploy  

### Out of scope (deferred)
- Tokenization vault, WASM/WebGPU ML, shadow-AI protect mode  
- Enterprise SSO, federated intel, deepfake video claims  
- Next.js migration, full SIEM / enterprise browser  

---

## 0.4 Monorepo consolidation (started in Phase 0)

| Action | Result |
| :--- | :--- |
| Nested `aiextinct/` git repo | **Removed** (no second repo inside monorepo) |
| AISentinel **code** | Moved to [`sources/aisentinel/`](../sources/aisentinel/) — merge source for Phases 2–4 |
| AISentinel Plan (key specs) | [`doc/reference/aisentinel-plan/`](./reference/aisentinel-plan/) |
| AISentinel teammate docs | [`doc/reference/aisentinel-docs/`](./reference/aisentinel-docs/) |
| Advanced NF roadmap specs | [`doc/reference/aisentinel-advanced/`](./reference/aisentinel-advanced/) |
| Live product code | Remains `backend/` · `frontend/` · `extension/` (CyberSentinel) until merge |

**Rule:** Do not run two products. `sources/aisentinel` is temporary input until merged into `backend` / `frontend` / `extension`, then can be deleted.

---

## 0.5 Administrative

| Item | Status |
| :--- | :--- |
| Branch strategy | `main` + `integrate/*` feature branches |
| Secrets | Never commit `.env`; use `.env.example` only |
| Employee monitoring disclosure template | [`templates/Employee_Monitoring_Disclosure.md`](./templates/Employee_Monitoring_Disclosure.md) |
| GitHub access / vault | Team responsibility (ops) |

---

## Phase 0 exit criteria

- [x] Decisions D1–D8 complete  
- [x] Scope freeze written  
- [x] Monorepo: single repo; aiextinct nested repo removed  
- [x] Merge sources relocated under `sources/` + `doc/reference/`  
- [x] Ready for Phase 1 (architecture + env freeze + local DX)  

**Next:** Phase 1 — Foundations (unified env, Compose, architecture freeze), then Phase 2 backend merge.
