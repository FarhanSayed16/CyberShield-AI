# 10 — DevOps & CI/CD

## Executive summary

GitHub Actions runs lint, test, Docker build, and optional staging deploy on every PR and `main` push. Branch protection on `main`. Artifacts: extension zip, Docker images to GHCR.

---

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready; protected |
| `develop` | Optional integration branch |
| `feature/*` | Short-lived feature work |

**Rules on `main`:** require PR, passing CI, no force push.

---

## Workflows

### `.github/workflows/backend.yml`

```yaml
name: Backend CI
on:
  push:
    paths: ['aisentinel/backend/**']
  pull_request:
    paths: ['aisentinel/backend/**']
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ['27017:27017']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r aisentinel/backend/requirements.txt ruff pytest pytest-asyncio httpx
      - run: ruff check aisentinel/backend
      - run: pytest aisentinel/backend/tests -v
        env:
          MONGODB_URL: mongodb://localhost:27017/aisentinel_test
          REDIS_URL: redis://localhost:6379/0
          JWT_SECRET: test-secret-min-32-characters-long
```

### `.github/workflows/frontend.yml`

- `npm ci` → `npm run lint` → `npm run test` (vitest)
- Path filter: `aisentinel/frontend/**`

### `.github/workflows/extension.yml`

- Zip `aisentinel/extension/` → upload artifact `extension-mv3.zip`

### `.github/workflows/docker.yml`

- On push to `main`: build + push `ghcr.io/<org>/aisentinel-api:latest` and `aisentinel-web:latest`
- Uses Docker Buildx + login via `GITHUB_TOKEN`

### `.github/workflows/deploy-staging.yml` (optional)

- Trigger: `workflow_dispatch` or tag `staging-*`
- SSH to staging host → `docker compose pull && docker compose up -d`

---

## Secrets (GitHub)

| Secret | Use |
|--------|-----|
| `JWT_SECRET` | Staging/prod |
| `MONGODB_URL` | Atlas or hosted Mongo |
| `GHCR_TOKEN` | Image push (or use GITHUB_TOKEN) |
| `STAGING_SSH_KEY` | Deploy workflow |

Never commit secrets. Use `.env` locally only.

---

## Pre-commit (optional)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks: [{ id: ruff }]
```

---

## Acceptance criteria

- [ ] PR to `main` runs backend + frontend CI
- [ ] Failing test blocks merge
- [ ] `main` push produces Docker images in GHCR
- [ ] Extension artifact downloadable from Actions

---

## Agent instructions

Add workflows in Gate 0–1 scaffolding. Expand tests per `12_TESTING_STRATEGY.md`.

---

## Cross-links

- [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md)
- [`12_TESTING_STRATEGY.md`](12_TESTING_STRATEGY.md)
- [`18_SCALING_STRATEGY.md`](18_SCALING_STRATEGY.md)
