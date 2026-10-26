# 11 — Security Specification

## Executive summary

AISentinel handles **employee prompts** and **organizational secrets**. Security centers on TLS, JWT auth, rate limits, prompt retention/TTL, and transparent employee notice. MVP: observe-only extension; no blocking until Phase 2.

---

## Threat model (STRIDE-lite)

| Threat | Mitigation |
|--------|------------|
| Spoofing (fake events) | Org API key + user_token; rate limit per org |
| Tampering | TLS; MongoDB access only via API |
| Repudiation | `audit_logs` collection; immutable append |
| Information disclosure | TTL on prompts; UI redaction; admin RBAC |
| DoS | Redis rate limits on `/api/events` |
| Elevation | Role checks on every admin route |

---

## Authentication

| Item | MVP value |
|------|-----------|
| Algorithm | HS256 JWT |
| Access token TTL | 24 hours |
| Refresh | Phase 2 (refresh token cookie) |
| Password | bcrypt, min 8 chars |
| Extension auth | `X-Org-Token` + `user_token` in body (not JWT) |

---

## Authorization (org employee monitoring)

| Role | Can view all employee prompts | Can invite employees | Admin verify |
|------|------------------------------|---------------------|--------------|
| admin | yes | yes | yes |
| manager | yes (read-only) | no | no |
| employee | own events only | no | no |

Employees must be informed per org policy (see Legal below).

---

## Transport and CORS

- TLS 1.2+ in staging/production
- CORS allowlist: `FRONTEND_URL` only
- Extension posts to `https://api.<domain>` only (no HTTP)

---

## Data protection

| Data | MVP | Production target |
|------|-----|-------------------|
| `prompt_text` | plaintext in Mongo | optional field-level encryption |
| API keys (customer) | bcrypt hash | same |
| Retention | 90-day TTL index | per `organizations.settings.retention_days` |

---

## Rate limiting

```
POST /api/events: max 10 req/sec per org_id (Redis sliding window)
POST /api/auth/login: max 5/min per IP
```

---

## Extension security

- Manifest V3, minimal permissions
- No eval; no external analytics SDKs
- Content script: catch all errors silently (never break ChatGPT UI)
- host_permissions limited to AI domains + API host

---

## Compliance (GDPR / India DPDP)

- Admin can delete user + all events (right to erasure)
- Employee notice: org provides policy; extension description states monitoring
- Data processing agreement template in GTM doc (legal review required)

---

## Secrets

- All secrets in `.env`, never committed
- `JWT_SECRET` min 32 random bytes
- Rotate org API keys via Settings UI

---

## Acceptance criteria

- [ ] All admin routes return 403 for `employee` role
- [ ] Rate limit returns 429 when exceeded
- [ ] No secrets in git history (gitleaks in CI)

---

## Cross-links

- [`05b_MONGODB_SCHEMA.md`](05b_MONGODB_SCHEMA.md)
- [`06_API_SPEC.md`](06_API_SPEC.md)
- [`10_DEVOPS_CI_CD.md`](10_DEVOPS_CI_CD.md)
