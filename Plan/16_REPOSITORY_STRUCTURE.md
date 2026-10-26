# 16 — Repository Structure

## Executive summary

Monorepo root `AI_safe_Extension/` contains `Plan/` (specs), `.cursor/` (agent skills), and `aisentinel/` (runtime code). Backend is modular FastAPI; frontend React+Vite; extension vanilla MV3.

---

## Full tree

```text
AI_safe_Extension/
├── AGENTS.md
├── .cursor/
│   ├── skills/
│   └── rules/
├── Plan/                    # All specifications
├── docker-compose.yml       # At repo root or aisentinel/
├── .env.example
└── aisentinel/
    ├── backend/
    │   ├── main.py
    │   ├── config.py
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   ├── api/
    │   │   ├── auth.py
    │   │   ├── events.py
    │   │   ├── dashboard.py
    │   │   ├── admin.py
    │   │   ├── users.py
    │   │   └── proxy.py
    │   ├── models/
    │   │   └── documents.py
    │   ├── services/
    │   │   ├── dlp.py
    │   │   ├── alerts.py
    │   │   └── email.py
    │   ├── migrations/
    │   ├── scripts/
    │   │   └── seed.py
    │   └── tests/
    │       ├── unit/
    │       └── integration/
    ├── frontend/
    │   ├── src/
    │   │   ├── pages/
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── Events.jsx
    │   │   │   ├── Alerts.jsx
    │   │   │   ├── Users.jsx
    │   │   │   ├── Settings.jsx
    │   │   │   └── AdminVerify.jsx
    │   │   ├── components/
    │   │   ├── context/
    │   │   └── api/client.js
    │   ├── Dockerfile
    │   └── package.json
    └── extension/
        ├── manifest.json
        ├── background.js
        ├── content.js
        ├── popup/
        └── utils/helpers.js
```

---

## Module boundaries

| Layer | May import |
|-------|------------|
| `api/*` | `services`, `models`, `config` |
| `services/*` | `models`, `config` only |
| `models/*` | Beanie, pydantic only |
| `api` must not import other `api` routers circularly |

---

## Import rules

- No business logic in `main.py` beyond app mount + lifespan
- DLP never imported from frontend
- Extension has zero npm deps in MVP

---

## Cross-links

- [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md)
- [`17_IMPLEMENTATION_SEQUENCE.md`](17_IMPLEMENTATION_SEQUENCE.md)
