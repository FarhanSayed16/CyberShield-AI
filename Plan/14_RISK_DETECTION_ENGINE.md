# 14 — Risk Detection Engine (DLP)

## Executive summary

Server-side scanner classifies each captured prompt. Outputs `risk_score` (0–100), `findings[]`, and optional alert. MVP uses regex + entropy; spaCy NER optional; ML classifier hook documented for Phase 2.

---

## Detection rules

### Email

```python
EMAIL_RE = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
```
Severity: **MEDIUM**. False positives: version strings like `user@2.0`.

### API keys

| Pattern | Severity |
|---------|----------|
| OpenAI `sk-[a-zA-Z0-9]{20,}` | CRITICAL |
| GitHub `ghp_[a-zA-Z0-9]{36}` | CRITICAL |
| AWS `AKIA[0-9A-Z]{16}` | CRITICAL |
| Generic high-entropy `[-_a-zA-Z0-9]{32,}` | HIGH if entropy &gt; 4.5 |

### Phone (India + US)

```python
PHONE_RE = r"(\+91[\s-]?)?[6-9]\d{9}|(\+1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}"
```

### Financial / identity

- Credit card + Luhn check → HIGH
- US SSN pattern → HIGH
- India Aadhaar 12 digits → HIGH
- PAN `ABCDE1234F` → MEDIUM

### Password heuristics

Keywords: `password`, `passwd`, `pwd`, `secret` near `=` or `:` → HIGH

### Org custom patterns

Loaded from `dlp_custom_patterns` per `org_id`; regex applied after built-ins.

---

## Scoring formula

```
base = max(severity_weight per finding)
risk_score = min(100, base + 5 * (num_findings - 1))

severity_weight:
  CRITICAL = 95
  HIGH = 75
  MEDIUM = 45
  LOW = 20
```

`has_critical = any(severity == CRITICAL)`

---

## Output contract

```json
{
  "risk_score": 95,
  "findings": [
    {
      "type": "API_KEY",
      "severity": "CRITICAL",
      "offset_start": 12,
      "matched_length": 51,
      "redacted_value": "sk-****"
    }
  ],
  "categories": ["CREDENTIAL"]
}
```

---

## Future classifier hook

```python
class PromptClassifier(Protocol):
    async def classify(self, text: str) -> list[Finding]: ...

# MVP: RegexDLPScanner only
# Phase 2: HybridRegexMLScanner
```

---

## Agent instructions

Implement `services/dlp.py` as pure functions; unit test every rule before wiring to `/api/events`.

---

## Cross-links

- [`19_ADMIN_VERIFY_DASHBOARD.md`](19_ADMIN_VERIFY_DASHBOARD.md) — smoke fixtures
- [`05b_MONGODB_SCHEMA.md`](05b_MONGODB_SCHEMA.md) — `dlp_findings` storage
