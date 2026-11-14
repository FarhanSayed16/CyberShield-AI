# 07b — Next.js Migration Path (Reference Only)

## Executive summary

MVP ships on **React 18 + Vite**. This document maps every Vite route and pattern to **Next.js 14 App Router** for when the org needs SSR, marketing pages, or enterprise SSO cookies. **Do not implement Next.js during MVP.**

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Route parity table | Running two frontends in parallel |
| Auth migration notes | Extension changes |
| Trigger criteria for migration | Timeline commitment |

---

## Route map

| Vite (MVP) | Next.js App Router |
|------------|-------------------|
| `/login` | `app/(auth)/login/page.tsx` |
| `/signup` | `app/(auth)/signup/page.tsx` |
| `/accept-invite/[token]` | `app/(auth)/accept-invite/[token]/page.tsx` |
| `/` | `app/(dashboard)/page.tsx` |
| `/events` | `app/(dashboard)/events/page.tsx` |
| `/alerts` | `app/(dashboard)/alerts/page.tsx` |
| `/users` | `app/(dashboard)/users/page.tsx` |
| `/settings` | `app/(dashboard)/settings/page.tsx` |
| `/admin/verify` | `app/(dashboard)/admin/verify/page.tsx` |

Layout: `app/(dashboard)/layout.tsx` with sidebar; `middleware.ts` protects all `(dashboard)` routes.

---

## Auth migration

| Vite MVP | Next.js |
|----------|---------|
| JWT in `localStorage` | httpOnly cookie `access_token` |
| Axios interceptor | Server Actions or `fetch` with `cookies()` |
| Client-only `AuthContext` | Middleware JWT verify + server session |

---

## When to migrate

Migrate when **any** of:
- Public marketing + SEO site on same domain
- Enterprise SSO requires server-side session (Okta/SAML)
- Dashboard must not expose JWT to XSS surface

Until then, Vite is faster to ship for internal admin dashboards.

---

## Agent instructions

Do not scaffold Next.js unless user explicitly requests migration. Reference [`07_FRONTEND_SPEC.md`](07_FRONTEND_SPEC.md) for MVP UI.

---

## Cross-links

- [`07_FRONTEND_SPEC.md`](07_FRONTEND_SPEC.md)
- [`11_SECURITY_SPEC.md`](11_SECURITY_SPEC.md)
