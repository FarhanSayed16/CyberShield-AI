# 15 — Policies Engine (Specification)

## Executive summary

Policies let an **organization admin** define allow/block rules for AI tools and sensitive patterns. **MVP: document only; enforcement in Phase 2.** Extension will read policy cache but not block submissions in MVP.

---

## Rule types

| Type | Example | Effect (Phase 2) |
|------|---------|------------------|
| `allow_tool` | Only `chatgpt`, `claude` | Block other platforms |
| `block_tool` | Block `gemini` | Prevent submit on gemini.google.com |
| `block_pattern` | Regex for internal codename | Block or redact before send |
| `require_review` | risk_score &gt; 50 | Queue for manager |

---

## Evaluation order

1. Org-level `block_tool` (deny list)
2. Org-level `allow_tool` (if set, deny all not in list)
3. DLP `block_pattern`
4. Default allow (observe-only in MVP)

---

## Data model (`alert_rules` / future `policies` collection)

```json
{
  "org_id": "...",
  "rule_type": "block_tool",
  "platform": "gemini",
  "enabled": true,
  "action": "block",
  "created_by": "user_id"
}
```

---

## Extension stub (Phase 2)

```javascript
// background.js — future
const policy = await fetchPolicy(orgToken);
if (policy.blocks.includes(platform)) { /* show overlay */ }
```

MVP: extension always sends events; dashboard shows violations only.

---

## Cross-links

- [`02_PRODUCT_SPEC.md`](02_PRODUCT_SPEC.md) Phase 2
- [`08_CHROME_EXTENSION_SPEC.md`](08_CHROME_EXTENSION_SPEC.md)
