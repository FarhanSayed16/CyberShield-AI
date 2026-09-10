# Phase 1 — Brand / naming rename inventory

**Brand (D1):** CyberSentinel  
**Do not** rename reference docs under `doc/reference/aisentinel-*` yet (historical AIS specs).  
**Execute product UI rename in Phase 3** (frontend shell merge).

## Live product code (rename in Phase 3)

| Area | Examples to update |
| :--- | :--- |
| `frontend/` landing + titles | Ensure “CyberSentinel” + combined pitch (AI Guard + Threat Explainer) |
| `extension/` popup title | Align to CyberSentinel (not AISentinel) |
| Store checklist | Product name CyberSentinel |

## Keep as-is until merge complete

| Path | Why |
| :--- | :--- |
| `sources/aisentinel/**` | Temporary source — deleted after Phase 4 |
| `doc/reference/aisentinel-*/**` | Historical specs; titles may say AISentinel |

## Repo / org names

| String | Guidance |
| :--- | :--- |
| GitHub `CyberShield-AI` | Repo slug OK; product brand = CyberSentinel |
| `DB_NAME=cybersentinel` | Keep |
| Package folder `cybersentinel-ml-api` | Keep |

## Docs already on CyberSentinel brand

- `doc/Phase0_Kickoff_And_Decisions.md`
- `doc/Phase1_Architecture_And_Env.md`
- `doc/Product_Idea_And_Selling_Plan.md`
- `doc/Master_Integration_Execution_Plan.md`
- Root `README.md` (monorepo note added Phase 0)

**Phase 1 action:** inventory only (this file). No mass string replace in AIS source.
