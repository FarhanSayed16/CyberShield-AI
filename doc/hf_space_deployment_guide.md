# Hugging Face Spaces guide (archived)

This document is **superseded**.

Heavy ML inference for CyberSentinel lives in the standalone service:

→ **[`cybersentinel-ml-api/HF_UPLOAD_GUIDE.md`](../cybersentinel-ml-api/HF_UPLOAD_GUIDE.md)**

### Current free-deploy reality

- Default product mode is **Gemini-only** (`HF_API_URL` empty).
- Hugging Face **Docker Spaces** require a paid PRO plan for new accounts (as of mid-2026).
- Optional hybrid mode: host `cybersentinel-ml-api` on any container host and set backend `HF_API_URL`.

See also: [`free_tier_deployment_guide.md`](./free_tier_deployment_guide.md) and [`Phased_Implementation_Plan.md`](./Phased_Implementation_Plan.md) Phase 4.
