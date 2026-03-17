# CyberSentinel AI – AI Implementation Overview

This document describes **what AI/ML components are implemented** in the CyberSentinel project, **how they work**, and **how they are wired** into the system.

---

## 1. High-Level AI Architecture

The platform uses a **multi-tier detection architecture** for each threat type:

| Tier | Purpose | Technology |
|------|---------|------------|
| **Tier 1** | Fast, local triage | Custom ML (e.g. BernoulliNB, PyTorch), rule/heuristic checks |
| **Tier 2** | Moderate, local or external | HuggingFace pipelines, external APIs (Safe Browsing, VirusTotal, SafePrompt, Hive AI) |
| **Tier 3** | Advanced semantic/visual analysis | Google Gemini (e.g. `gemini-2.5-flash-lite`) with structured JSON output |

Users can select **Auto (fused)**, **Tier 1**, **Tier 2**, or **Tier 3** from the dashboard or extension. **Auto** runs all tiers and fuses results; individual tiers run only that layer.

---

## 2. Threat Types and Their AI Pipelines

### 2.1 Phishing (Text / Email) Detection

**Input**: `type: "text"` — email body, SMS, or message content.

**Implementation**:

- **Tier 1** (`phishing_service.evaluate_tier_1_basic`):
  - Custom **BernoulliNB** model + **TF-IDF** preprocessor (from `ai_manager.phishing_text_model` and `phishing_text_preprocessor`).
  - **18 hand-crafted signal features** from `extract_text_features()` (e.g. urgency keywords, length, presence of links).
  - Features are concatenated with TF-IDF features and passed to the classifier.
  - Output: `flagged`, `score` (0–100), `label` (PHISHING/SAFE).

- **Tier 2** (`evaluate_tier_2_moderate`):
  - **HuggingFace** transformer pipeline (`ai_manager.phishing_pipe`) run asynchronously.
  - Returns `confidence`, `label`, `hf_score`.

- **Tier 3** (`evaluate_tier_3_advanced`):
  - **Google Gemini** (`gemini-2.5-flash-lite`) with system instruction from `PHISHING_SYSTEM_INSTRUCTION` in `core/prompts.py`.
  - Response is forced to **JSON** matching `PhishingAnalysisOutput` (risk_level, risk_score, is_phishing, explanation, suspicious_phrases, feature_importance, domain_analysis, url_analysis, etc.).
  - **Multiple API keys** supported via `GEMINI_API_KEYS` (comma-separated); round-robin and retry on 429/quota.

**Auto mode**: Tier 1 and Tier 2 run; Tier 3 runs and results are fused (e.g. weighted combination) into a single `ThreatDecision` with risk_score, threat_level, explanation, indicators, and recommended_actions.

**Status**: Implemented and working. Tier 1 requires trained models to be loaded by `ai_manager.initialize()`.

---

### 2.2 Malicious URL Detection

**Input**: `type: "url"` — full URL string.

**Implementation**:

- **Tier 1**:
  - **Custom URL ML engine** (`ml_url_engine.ml_engine.evaluate_url`) — extracts URL features and returns probability + feature map.
  - Output: `ThreatDecision` with risk_score, explanation, and `advanced_analysis.tier1_ml_score`.

- **Tier 2**:
  - **External APIs only**: `google_safe_browsing.check(url)` and `virustotal.scan(url)` in parallel.
  - No Gemini. Risk is computed by `risk_engine.score_url(None, sb_result, vt_positives, vt_total)` using Safe Browsing and VirusTotal evidence.
  - `external_flags` (safe_browsing, virustotal_positives, virustotal_total_engines) are attached to the decision.

- **Tier 3**:
  - **Gemini URL agent** via `clients/gemini_url.analyze(url)` (HTTP client to `generateContent` with JSON envelope).
  - Returns threat_type, risk_score, confidence, indicators; mapped to `ThreatDecision`.

**Auto mode**: Tier 1 ML runs; Tier 2 (Safe Browsing + VirusTotal) and Tier 3 (Gemini) run in parallel or sequence; results are fused. Explanation and recommendation can be augmented by **Gemini explanation** and **recommendation** clients (if used in URL pipeline).

**Risk fusion** (`risk_engine.score_url`):  
Combines LLM score (50%), Safe Browsing (25%), VirusTotal (15%), and heuristics (10%). Final score 0–100 is mapped to threat_level: Safe (0–30), Suspicious (31–60), High Risk (61–100).

**Status**: Implemented and working. Requires Safe Browsing and VirusTotal API keys for Tier 2; Gemini key for Tier 3.

---

### 2.3 Prompt Injection Detection

**Input**: `type: "prompt"` — user prompt or text intended for an LLM.

**Implementation**:

- **Tier 1**: Placeholder; returns `flagged: False`, `score: 0`.

- **Tier 2**:
  - **HuggingFace** pipeline (`ai_manager.prompt_pipe`) for prompt classification.
  - Optional: **SafePrompt** and **Nvidia NIM** clients for extra signal (if wired in).
  - Returns label (e.g. INJECTION/SAFE), confidence, hf_score.

- **Tier 3**:
  - **Gemini** with `PROMPT_INJECTION_SYSTEM_INSTRUCTION` and structured output `PromptInjectionOutput` (risk_level, risk_score, is_injection, injection_type, explanation, malicious_payloads, mitigation_steps).

**Auto mode**: All tiers run; Tier 3 output is mapped to `ThreatDecision` (indicators, explanation, recommended_actions from mitigation_steps).

**Status**: Implemented and working. Tier 2 depends on `prompt_pipe` being loaded in `ai_manager`.

---

### 2.4 Deepfake / Synthetic Media Detection

**Input**: `type: "image"` or `type: "video"` — base64-encoded image or video (or data URL with `data:...;base64,...`; backend strips the prefix).

**Implementation**:

- **Tier 1**:
  - **PyTorch** vision model (`ai_manager.deepfake_tier1_model`) + torchvision transforms.
  - Image resized/normalized, forward pass; softmax for Real vs Fake probability.
  - Returns `flagged`, `score`.

- **Tier 2**:
  - **HuggingFace** image classification pipeline (`ai_manager.deepfake_pipe`).
  - Returns label (e.g. DEEPFAKE/REAL), confidence, hf_score.

- **Tier 3**:
  - **Gemini Vision** (image passed as bytes or inline data) with `DEEPFAKE_SYSTEM_INSTRUCTION` and `DeepfakeAnalysisOutput` (risk_score, is_deepfake, explanation, detected_artifacts, authenticity_signals, recommendations).
  - Optional: **Hive AI** client for additional deepfake signal; result can be merged into `external_flags.hive_ai_result`.

**Auto mode**: Tier 1 and Tier 2 run; Tier 3 and Hive AI (if configured) run; results fused into one `ThreatDecision`.

**Status**: Implemented and working. Tier 1 requires a trained PyTorch model; Tier 2 requires HF pipeline; Tier 3 requires Gemini API key.

---

### 2.5 Behavior Anomaly Detection

**Input**: `type: "anomaly"` — text or log-like content describing user/entity behavior.

**Implementation**:

- **Tier 1 & 2**: Placeholders (return safe/default scores).

- **Tier 3**:
  - **Gemini** with `BEHAVIOR_ANOMALY_SYSTEM_INSTRUCTION` and `BehaviorAnomalyOutput` (risk_score, is_anomaly, anomaly_type, explanation, anomalies_detected, recommended_actions).

**Auto mode**: Effectively Tier 3 only until Tier 1/2 are implemented. Output is mapped to `ThreatDecision` with threat_type `behavior_anomaly` or `benign`.

**Status**: Implemented for Tier 3; Tier 1/2 are stubs.

---

## 3. Supporting AI Components

### 3.1 Threat Router

- **File**: `services/threat_router.py`
- **Role**: Single entry point for all analysis. Dispatches by `input_type` to the correct service:
  - `url` → `url_service.analyze_url`
  - `text` → `phishing_service.analyze_text`
  - `prompt` → `prompt_service.analyze_prompt`
  - `image` / `video` → `deepfake_service.analyze_media`
  - `anomaly` → `anomaly_service.analyze_anomaly`
- **Output**: All services return a unified `ThreatDecision` (threat_type, risk_score, threat_level, confidence, indicators, explanation, key_points, recommended_actions, external_flags, severity_label, advanced_analysis).

### 3.2 Risk Scoring Engine

- **File**: `services/risk_engine.py`
- **Role**: Fuses scores and external evidence into a final 0–100 risk and threat level.
- **Functions**:
  - `score_url(gemini_result, safe_browsing, vt_positives, vt_total)` — weighted mix for URL.
  - Similar logic for text, prompt, and deepfake where external APIs are used.
- **Mapping**: Score → threat_level (Safe / Suspicious / High Risk) and severity_label (Informational / Warning / Critical).

### 3.3 Explanation and Recommendation (Gemini Clients)

- **Files**: `clients/gemini_explanation.py`, `clients/gemini_recommendation.py`
- **Role**: When the pipeline uses the legacy “explanation + recommendation” agents (e.g. for URL flow in some code paths), these call Gemini with structured input and return human-readable explanation and action list.
- **Usage**: Can be invoked from URL/phishing/prompt services to enrich `ThreatDecision.explanation` and `ThreatDecision.recommended_actions`. In the current 3-tier design, Tier 3 Gemini outputs often already include explanation and recommendations, which are mapped directly to `ThreatDecision`.

### 3.4 Chat Service (Floating Assistant)

- **File**: `services/chat_service.py`
- **Role**: Powers the in-browser/extension **AI assistant** that answers user questions about security.
- **Implementation**:
  - **Google Gemini** (`gemini-2.5-flash-lite`) with a fixed system prompt (concise, security-focused, markdown-friendly).
  - Accepts user prompt and optional `url_context`; returns short text (max_output_tokens 150).
  - Uses same multi-key setup (`GEMINI_API_KEYS`); round-robin and retry on failure.
  - Optional mock mode when `USE_MOCK_AGENTS` is True.
- **API**: `POST /api/chat` (body: `prompt`, `url_context`); response: `{ "response": "..." }`.
- **Status**: Implemented and working; used by the extension Quickball and can be wired to the dashboard assistant.

---

## 4. Model and Pipeline Loading (AI Manager)

- **File**: `core/ai_models.py` (referenced as `ai_manager`)
- **Role**: Central loader for all local models and pipelines. Called during app startup (`main.py` lifespan → `ai_manager.initialize()`).
- **Typical contents** (depending on project setup):
  - Phishing: `phishing_text_model`, `phishing_text_preprocessor`, `phishing_pipe` (HF).
  - URL: URL ML model/engine (used by `ml_url_engine`).
  - Prompt: `prompt_pipe` (HF).
  - Deepfake: `deepfake_tier1_model`, `deepfake_tier1_transform`, `deepfake_pipe` (HF).
- **Behavior**: If a model or pipeline is missing, the corresponding tier returns safe/default values so the rest of the pipeline still runs.

---

## 5. Configuration and Keys

- **File**: `core/config.py`
- **Relevant settings**:
  - `GEMINI_API_KEYS`: Comma-separated list; used for Tier 3 and chat. Round-robin and retry on quota errors.
  - `GEMINI_BASE_URL`: Base URL for Gemini HTTP API (e.g. `generativelanguage.googleapis.com/v1beta`).
  - `USE_MOCK_AGENTS`: When True, chat service can return a mock response; detection pipelines may still use real Tier 1/2 and optionally Tier 3 depending on implementation.
  - External APIs: `SAFE_BROWSING_API_KEY`, `VIRUSTOTAL_API_KEY`, `SAFEPROMPT_API_KEY`, `HIVE_AI_API_KEY`, etc., for Tier 2 or enrichment.

---

## 6. Structured Output Schemas (Tier 3)

- **File**: `schemas/gemini_outputs.py`
- **Purpose**: Pydantic models that define the **exact JSON** Tier 3 Gemini must return. The system prompts instruct the model to respond with this schema (e.g. via `response_mime_type="application/json"` and schema pasted into the prompt).
- **Models**:
  - `PhishingAnalysisOutput` — risk_level, risk_score, is_phishing, explanation, suspicious_phrases, feature_importance, domain_analysis, url_analysis, mitigation_steps.
  - `DeepfakeAnalysisOutput` — risk_score, is_deepfake, explanation, detected_artifacts, authenticity_signals, recommendations.
  - `PromptInjectionOutput` — risk_score, is_injection, injection_type, explanation, malicious_payloads, mitigation_steps.
  - `BehaviorAnomalyOutput` — risk_score, is_anomaly, anomaly_type, explanation, anomalies_detected, recommended_actions.

This ensures **explainable, consistent outputs** and a clean mapping to the unified `ThreatDecision` and API response.

---

## 7. What Is Currently Working (Summary)

| Component | Status | Notes |
|-----------|--------|--------|
| Phishing (Tier 1) | Working | Requires trained BernoulliNB + TF-IDF and feature extractor |
| Phishing (Tier 2) | Working | Requires HF pipeline in ai_manager |
| Phishing (Tier 3) | Working | Gemini + PhishingAnalysisOutput |
| URL (Tier 1) | Working | Requires ml_url_engine model |
| URL (Tier 2) | Working | Safe Browsing + VirusTotal |
| URL (Tier 3) | Working | Gemini URL client |
| Prompt (Tier 1) | Stub | Returns safe |
| Prompt (Tier 2) | Working | Requires prompt_pipe |
| Prompt (Tier 3) | Working | Gemini + PromptInjectionOutput |
| Deepfake (Tier 1) | Working | Requires PyTorch model |
| Deepfake (Tier 2) | Working | Requires HF image pipeline |
| Deepfake (Tier 3) | Working | Gemini Vision + DeepfakeAnalysisOutput |
| Anomaly (Tier 3) | Working | Gemini + BehaviorAnomalyOutput |
| Risk fusion | Working | score_url, etc. |
| Chat service | Working | Gemini; multi-key; mock option |
| Threat router | Working | Dispatches by type and tier |

---

## 8. Data Flow (AI Side)

1. Request hits **POST /api/analyze** with `type`, `content`, optional `tier`.
2. **Threat router** selects service by `type`.
3. Service runs **Tier 1 / Tier 2 / Tier 3** (or only the selected tier).
4. **Risk engine** and service logic fuse results → **ThreatDecision**.
5. **ThreatDecision** is persisted (e.g. MongoDB) and returned as **AnalyzeResponse** (risk_score, threat_level, indicators, explanation, key_points, recommended_actions, external_flags, etc.).

All AI outputs are designed to support **explainability** (explanations, indicators, key_points) and **actionability** (recommended_actions, severity_label) as required by the project.
