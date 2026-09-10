# AISentinel — Advanced GenAI DLP Specifications

This directory is a **standalone specification library** for next-generation extension capabilities. It extends the MVP without modifying files under [`../../Plan/`](../../Plan/).

**Positioning:** Shift from glorified regex blockers to **dynamic data safeguarding** — anonymize, educate, and audit without killing productivity.

---

## Relationship to existing docs

| Document set | Purpose |
|--------------|---------|
| [`Plan/`](../../Plan/) | Original MVP gates, API, extension observe-only spec |
| **`new features/`** (this folder) | Post-MVP: tokenization, lineage, shadow AI, local WASM audit, JIT training |
| [`aisentinel/extension/`](../extension/) | Current MV3 implementation (vanilla JS) |
| [`aisentinel/backend/services/dlp.py`](../backend/services/dlp.py) | Server-side DLP v2 (regex + business rules) |

When implementing code, read **both** the relevant `Plan/` gate doc and the matching `features/*.md` file here.

---

## Reading order

Read in this sequence for full context:

| # | File | What you learn |
|---|------|----------------|
| 1 | [00_VISION_AND_DIFFERENTIATION.md](./00_VISION_AND_DIFFERENTIATION.md) | Why we build this; vs competitors |
| 2 | [06_TECH_STACK_AND_LANGUAGES.md](./06_TECH_STACK_AND_LANGUAGES.md) | Languages, libraries, WASM/ML choices |
| 3 | [08_SYSTEM_ARCHITECTURE.md](./08_SYSTEM_ARCHITECTURE.md) | End-to-end flows, trust boundaries |
| 4 | [features/01_ANONYMIZATION_TOKENIZATION.md](./features/01_ANONYMIZATION_TOKENIZATION.md) | Bi-directional anonymization |
| 5 | [features/02_CLIPBOARD_LINEAGE.md](./features/02_CLIPBOARD_LINEAGE.md) | Paste origin tracking |
| 6 | [features/03_SHADOW_AI_DETECTION.md](./features/03_SHADOW_AI_DETECTION.md) | Unknown AI site heuristics |
| 7 | [features/04_LOCAL_WASM_WEBGPU_AUDIT.md](./features/04_LOCAL_WASM_WEBGPU_AUDIT.md) | Client-side semantic audit |
| 8 | [features/05_JIT_MICRO_TRAINING.md](./features/05_JIT_MICRO_TRAINING.md) | Just-in-time employee training |
| 9 | [09_BACKEND_API_AND_SCHEMA.md](./09_BACKEND_API_AND_SCHEMA.md) | API + MongoDB schema extensions |
| 10 | [07_INTEGRATION_MASTER_PLAN.md](./07_INTEGRATION_MASTER_PLAN.md) | Phased gates NF-0 … NF-6 |
| 11 | [10_MANIFEST_MV3_AND_PERFORMANCE.md](./10_MANIFEST_MV3_AND_PERFORMANCE.md) | Permissions, 50ms budget |
| 12 | [11_TESTING_QA_AND_ROLLOUT.md](./11_TESTING_QA_AND_ROLLOUT.md) | QA, feature flags, rollout |

---

## Feature index

| Feature | Doc | One-line value |
|---------|-----|----------------|
| Tokenization engine | [01](./features/01_ANONYMIZATION_TOKENIZATION.md) | AI never sees secrets; employee sees real answers |
| Clipboard lineage | [02](./features/02_CLIPBOARD_LINEAGE.md) | Flag paste from internal ERP/Jira, not just keywords |
| Shadow AI detection | [03](./features/03_SHADOW_AI_DETECTION.md) | Protect unlisted Gradio/Hugging Face apps |
| Local WASM/WebGPU audit | [04](./features/04_LOCAL_WASM_WEBGPU_AUDIT.md) | Vet prompts without a second cloud |
| JIT micro-training | [05](./features/05_JIT_MICRO_TRAINING.md) | 5-second attestation instead of hard blocks |

---

## Implementation phases (summary)

See [07_INTEGRATION_MASTER_PLAN.md](./07_INTEGRATION_MASTER_PLAN.md) for full gates.

| Phase | Deliverable |
|-------|-------------|
| NF-0 | TypeScript extension build; parity with current JS |
| NF-1 | Policy cache + JIT overlay (default off) |
| NF-2 | Client hybrid audit (WASM regex + optional model) |
| NF-3 | Anonymization v1 |
| NF-4 | Clipboard lineage |
| NF-5 | Shadow AI detection |
| NF-6 | Performance hardening (&lt;50ms p95, offline queue) |

---

## Document structure convention

Every file under `features/` follows three parts:

1. **Part I — Deep explanation** (problem, UX, algorithms, limits)
2. **Part II — Implementation stack** (languages, libraries, latency)
3. **Part III — Integration & optimization** (files, APIs, tests, acceptance criteria)

---

## Quick answer: extension analysis language

**TypeScript** for extension logic; **Rust→WASM** or **ONNX Runtime Web** for hot-path parsing/ML; **Python/FastAPI** for server reinforcement; **React** for admin UI. Details in [06_TECH_STACK_AND_LANGUAGES.md](./06_TECH_STACK_AND_LANGUAGES.md).

---

## Honest constraints (read before selling)

- Clipboard origin requires scripts on source domains — Chrome does not expose it natively.
- Not all AI traffic goes through DOM submit — corporate proxy may be needed for full coverage.
- WebGPU is optional; WASM fallback is mandatory.
- Over-tokenization can reduce answer quality — tunable per org.

See [00_VISION_AND_DIFFERENTIATION.md](./00_VISION_AND_DIFFERENTIATION.md) for enterprise positioning.
