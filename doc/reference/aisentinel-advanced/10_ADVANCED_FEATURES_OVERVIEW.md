# 10 — Advanced Extension Features: Deep Conceptual Overview

## Why Basic DLP Extensions Fail (and Why That Creates Your Opportunity)

Before we talk about what to build, it is worth deeply understanding *why* the current generation of DLP (Data Loss Prevention) browser extensions is fundamentally broken. Understanding this failure mode will clarify every architectural decision in the files that follow.

A standard DLP extension works like this: it scans text before it is submitted to an AI tool, runs it against a list of regex patterns (email addresses, credit card numbers, Social Security Numbers), and if any match fires, it blocks the submission with a red "Access Denied" wall. This feels like security. It is not.

The failure has three dimensions.

**First, it is adversarially fragile.** Regex can be bypassed trivially. Add a space inside a credit card number. Abbreviate a company name. Spell out digits as words. Any moderately motivated employee who wants to paste something will find a way around a pattern matcher in under 30 seconds. You have not prevented the leak — you have just ensured that only careless employees are caught.

**Second, it destroys productivity and trust.** False positives are enormous. A developer writing documentation that mentions "API keys should look like sk-xxxx" gets blocked. A sales rep writing a proposal that includes the word "confidential" gets blocked. After the third false block in a day, employees start treating the extension as the enemy, and they will find ways to disable or circumvent it. Security theater is worse than no security, because it creates false confidence.

**Third, it has zero context awareness.** A regex does not know whether an email address is the user's own personal email in an example prompt, or a list of 10,000 customer emails they just exported from the CRM. The text looks identical to a pattern matcher. The risk profile is wildly different.

The five features described in this document attack each of these failure modes in a fundamentally different way. Together they transform the extension from a blunt blocker into an intelligent layer that makes secure AI usage *easier* than insecure usage — which is the only architecture that actually works at scale.

---

## Feature 1: Bi-Directional Prompt Anonymization (The Tokenization Engine)

### The Core Idea

Think about how your bank works when you save a credit card to Amazon. Amazon never stores your actual card number. Instead, your bank gives them a "token" — a random string like `tok_4xZ9mQ2r` — that is meaningless to anyone who steals it, but which the bank will exchange for the real card number when Amazon needs to charge you. This is called payment tokenization, and it has been solving the exact same problem (sending sensitive data through an untrusted third party) for two decades in fintech.

Prompt anonymization applies the same concept to AI interactions. When a developer types "Fix the authentication bug in our `PaymentService` class — the production database is at `db.internal.acme.com:5432` and the service account password is `Acme@Prod2024`," your extension intercepts this before it leaves the browser. It replaces every sensitive entity with a synthetic placeholder token that preserves the *structure* of the information without revealing the *content*:

```
Fix the authentication bug in our `<SERVICE_1>` class — the production 
database is at `<HOSTNAME_1>` and the service account password is `<SECRET_1>`.
```

The AI receives this sanitized version. It reasons over the structure and returns something like: "In `<SERVICE_1>`, the connection string for `<HOSTNAME_1>` should be stored in environment variables rather than hardcoded..." Your extension then intercepts the response, scans it for the tokens, and substitutes the real values back before the text appears in the browser UI. The developer sees the real answer. The AI never saw the real data. The leak never happened.

### Why This Is Technically Hard (and What Makes Your Implementation Special)

The naive version of this — find-and-replace on a string — is easy to implement but dangerous to ship. Several deep problems arise:

**Semantic coherence:** If you replace "Apple Inc." with `<COMPANY_1>`, the AI must produce an answer that makes sense when you put "Apple Inc." back. This works for proper nouns and structured data (hostnames, keys, phone numbers) but breaks for things like industry-specific terminology where the word itself carries meaning to the AI. Your anonymization must be selective: replace *identifying* information, not *contextual* information.

**Streaming response handling:** Modern AI APIs return responses as Server-Sent Events (SSE) — a stream of small text chunks, not a single JSON blob. A token like `<SERVICE_1>` might arrive across multiple chunks: `<SERV` in one chunk and `ICE_1>` in the next. A naive find-and-replace on each chunk independently will miss split tokens. Your response interceptor must maintain a rolling buffer and only emit text that has been fully scanned for token boundaries.

**Token collision and ordering:** If the prompt mentions "Apple Inc." three times, all three must be replaced with `<COMPANY_1>` (the same token), not three different ones, or the substituted response will be incoherent. The token map must be built before transmission and consistently applied.

**Non-idempotent entities:** Some entities change meaning when anonymized. A date like "yesterday" is already abstract. A date like "2024-01-15" may be significant. Your classifier must distinguish between entities where anonymization adds security value and entities where it destroys contextual value.

### What the Token Map Looks Like

The token map is an in-memory object (never persisted to storage, never sent to the backend) that lives only for the duration of a single AI conversation session:

```
TokenMap {
  "<COMPANY_1>"   → "Apple Inc.",
  "<COMPANY_2>"   → "Acme Corp",
  "<HOSTNAME_1>"  → "db.internal.acme.com",
  "<SECRET_1>"    → "Acme@Prod2024",
  "<EMAIL_1>"     → "john.doe@acme.com",
  "<PHONE_1>"     → "+91 9876543210",
}
```

The reverse map (for substituting back) is just the same map inverted. It stays in memory, is never written to `localStorage` or `chrome.storage`, and is cleared when the page navigates or the session ends.

---

## Feature 2: Clipboard Lineage and Origin Tracking

### The Core Idea

Consider a scenario. An employee opens a Google Doc marked "CONFIDENTIAL — Trade Secret" on your company's internal Google Workspace. They select 500 words and press Cmd+C. Then they switch to a new tab and open ChatGPT. They press Cmd+V and submit. A regex-based extension sees 500 words of plain text with no obvious patterns. It passes. The trade secret is now in OpenAI's training pipeline.

The fundamental problem is that once text enters the clipboard, it becomes anonymous. Clipboard Lineage solves this by tracking the *origin* of clipboard contents — specifically, *which domain* the text was copied from — and then enforcing your company's domain sensitivity policies at paste-time on any AI interface.

The insight is simple: a copy event and a paste event are two distinct moments in time, but they belong to the same data journey. If you observe the copy event, tag the data, and then recognize the tag at paste-time, you have full lineage.

### The Sensitivity Domain Registry

This feature depends on a configuration maintained by the admin in the AISentinel dashboard: a list of domains categorized by their sensitivity level:

```
CRITICAL:  jira.acme.com, salesforce.com, figma.com/file/*, drive.google.com/document/*
HIGH:      github.com/acme-org/*, notion.so, linear.app  
MEDIUM:    slack.com, confluence.acme.com
LOW:       docs.google.com (public), stackoverflow.com
```

When text is copied from a `CRITICAL` domain, any paste into an AI interface triggers a hard block (with a JIT explanation). `HIGH` triggers the JIT override window. `MEDIUM` logs silently. `LOW` is ignored.

### The Hashing Strategy

You cannot store the actual copied text — that would make the extension itself a surveillance tool. Instead, you hash the clipboard contents using SHA-256 (available natively in Web Crypto API) and store only the hash along with the metadata:

```
ClipboardEntry {
  hash:        "a4f3c9e2...",  // SHA-256 of copied text
  source_domain: "jira.acme.com",
  source_url:    "https://jira.acme.com/browse/SEC-1234",
  sensitivity:   "CRITICAL",
  timestamp:    1716300000000,
}
```

At paste-time on an AI interface, you hash the pasted text and look it up. If it matches a registered entry and the source was sensitive, you enforce the policy. The actual text was never stored anywhere in the extension — only its fingerprint.

---

## Feature 3: Dynamic Shadow AI UI Detection

### The Core Idea

Every security whitelist is a losing game against a moving target. There are now hundreds of AI-powered tools — custom internal Gradio apps, Hugging Face Spaces, self-hosted Ollama UIs, LangChain agents, custom enterprise chatbots. A blocklist approach requires your security team to manually add each new tool as it appears, which is impossible to maintain at the pace AI tooling is evolving.

Dynamic Shadow AI Detection inverts the model. Instead of asking "is this URL on our blocked list?", it asks "does this web page behave like an AI interface?". It analyzes the structural and behavioral characteristics of the page and assigns a confidence score. If the confidence exceeds a threshold, it applies your policies regardless of whether the domain has ever been seen before.

### The Signal Hierarchy

Different signals carry different levels of confidence that a page is an AI interface. Building a weighted scoring system is more reliable than any single check:

**Network behavior signals (highest confidence):** AI interfaces almost universally communicate via Server-Sent Events (SSE) or WebSockets for streaming responses. Detecting `Content-Type: text/event-stream` responses, or seeing WebSocket connections emitting rapid small messages, is a very strong signal. False positive rate is extremely low.

**DOM structural signals (high confidence):** AI chat interfaces share a highly distinctive DOM pattern: a large text input area (textarea or contenteditable div), a submit mechanism (button or Enter handler), and an output container that receives incrementally appended text. This combination is uncommon outside of AI tools.

**JavaScript environment signals (medium confidence):** Many AI frontends load specific libraries — `marked.js` or `highlight.js` for Markdown rendering, or specific React component patterns from popular AI UI kits. Detecting these libraries in `window` or in loaded scripts is a supporting signal.

**URL pattern signals (low confidence, used as tiebreaker):** Paths like `/chat`, `/playground`, `/generate`, `/completions`, or query parameters like `?model=` appear frequently on AI tools. These alone are too broad to use exclusively, but they contribute to the composite score.

### The Confidence Scoring Model

```
Signal                                         Weight
─────────────────────────────────────────────────────
SSE stream detected (text/event-stream)          40
WebSocket with rapid small messages              35
Large textarea + incremental output container    25
Submit button adjacent to input                  15
Markdown renderer library detected              10
URL path matches /chat|/generate|/playground     10
Token-like streaming text in output div          15
─────────────────────────────────────────────────────
THRESHOLD for policy enforcement:               60
THRESHOLD for admin notification (unknown AI):  75
```

Any page scoring ≥ 60 gets policies applied. Any page scoring ≥ 75 AND not in the known platform list gets reported to the admin as a newly discovered AI tool.

---

## Feature 4: Local WebAssembly/WebGPU AI Auditing

### The Core Idea

Every other feature in this list sends event metadata (never raw prompt text) to the AISentinel backend server. But some customers — particularly in regulated industries like healthcare, defense contracting, or banking — operate under restrictions that prohibit sending ANY data, even metadata, to external servers. For them, a cloud-dependent security solution is a non-starter.

Local AI Auditing solves this by running a small machine learning model *inside the browser extension itself*, using WebAssembly (for CPU) or WebGPU (for GPU) as the execution runtime. The prompt text is analyzed entirely on the user's local machine. The inference result (a classification label and confidence score) is what gets sent to the backend — never the text itself.

The technology that makes this possible is **ONNX Runtime Web** combined with the **Transformers.js** library. ONNX (Open Neural Network Exchange) is a format that can represent virtually any ML model, and ONNX Runtime Web is a pure-JavaScript runtime that can execute these models in a browser environment at surprisingly good speed. A quantized DistilBERT model — about 67MB compressed — can run inference in 80–200ms on a modern laptop CPU, well within acceptable latency.

### What the Local Model Does

The local model performs two classification tasks that are too nuanced for regex but too privacy-sensitive to send to a server:

**Sensitivity classification:** Given a prompt, classify it into one of: `safe`, `low_risk`, `medium_risk`, `high_risk`, `critical`. This is a fine-tuned text classifier trained on labeled enterprise prompts. The "critical" category captures things like: detailed technical specifications, financial projections with specific numbers, personnel information, and system architecture details.

**Intent classification:** Is this prompt trying to do something that could amplify a leak? Categories include: `data_extraction` (asking the AI to summarize or reformat data), `code_generation_with_secrets` (asking for code that embeds credentials), `competitive_intelligence` (asking about competitor analysis using internal data), `normal`.

These two classifications, combined, determine the policy action — entirely locally.

### The Model Lifecycle in a Chrome Extension

Running ML inference in a Chrome extension has specific constraints not found in normal web apps. The background service worker (where you want to run inference, to avoid blocking the UI thread) has a maximum lifetime — Chrome can terminate it after a few minutes of inactivity. This means the model must be re-loaded on demand, which takes 2–5 seconds the first time. The solution is a combination of:

An **offscreen document** (a Chrome MV3 API that provides a persistent hidden page) holds the model loaded and warm. The model is downloaded once and cached in the browser's Cache API (not `chrome.storage`, which has a 10MB limit). On subsequent loads, it initializes in under 200ms from the local cache. The offscreen document stays alive as long as the extension is active and communicates with content scripts via the background service worker using message passing.

---

## Feature 5: Just-In-Time (JIT) Micro-Training Overlay

### The Core Idea

Security training fails for a fundamental reason: it happens at the wrong time. An annual 2-hour security training video watched at 2x speed does not change behavior at the moment of temptation, which is the only moment that matters. Every other feature in this list is defensive — it catches or prevents a potential leak. JIT Micro-Training is the only *educational* feature, and in many ways it is the most powerful because it prevents the *intent to leak* from forming in the first place.

The JIT overlay activates when a policy would normally block or flag a submission. Instead of a blunt "BLOCKED" screen, it shows a contextual, educational overlay that:

Explains *specifically* what was detected and *why* it is risky — not in legal jargon but in one sentence a non-security person understands. Shows the exact text that triggered the flag, highlighted within the prompt. Offers a concrete, actionable suggestion (e.g., "Try removing the highlighted portions before submitting" or "Use our internal AI tool [link] which is approved for this type of content"). Allows the employee to proceed with an explanation (which is logged for compliance) or cancel. Tracks how many times each employee has seen each type of warning, and adjusts the UX accordingly — a first-time offender sees full educational content; a repeat offender sees a shorter "you know why this is flagged" message with more friction to override.

### The Psychology Behind the Design

The design is deliberately not adversarial. It does not say "you are trying to leak company data." It says "we detected something that looks like it might be sensitive — can you confirm you've reviewed it?" This distinction matters enormously for employee relations and compliance culture. The goal is to transform security from a cop standing at a door into a knowledgeable colleague who asks a quick question before you go into an important meeting.

The 5-second question format is important too. It is long enough that the employee must consciously engage, but short enough that it does not feel like a punishment for legitimate use. Research in behavioral security (specifically, "friction by design" from Stanford and Carnegie Mellon labs) shows that adding 3–8 seconds of conscious deliberation to a risky action reduces the rate of proceeding by 40–60% even when the friction is completely bypassable.

### The Compliance Logging Value

Every JIT interaction — whether the employee cancels, reviews, or overrides — is logged to the backend with full context. This creates a compliance audit trail that is genuinely valuable: it proves that employees were informed of the risk at the moment of action, which is a defensible position under GDPR, DPDP Act, and most enterprise security frameworks. "Our DLP blocked it" is a weak compliance story. "Our system flagged it, the employee acknowledged the risk and documented their justification, and we have a log" is a strong one.

---

## How These Five Features Work Together

These features are not independent modules — they compose into a layered defense architecture where each layer handles what the previous could not:

Layer 1 is **dynamic detection** (Feature 3), which ensures policies apply everywhere, not just known AI sites. Layer 2 is **clipboard lineage** (Feature 2), which catches copy-paste attacks that bypass text-level scanning. Layer 3 is **local model auditing** (Feature 4), which provides semantic understanding that regex cannot. Layer 4 is **tokenization** (Feature 1), which transforms the extension from a blocker into an enabler — allowing risky prompts to be used safely rather than simply refused. Layer 5 is **JIT training** (Feature 5), which handles the cases where human judgment is needed and simultaneously builds security culture.

The result is a system where most interactions are completely frictionless (clean prompts pass through untouched), risky interactions are made safe automatically (tokenization handles them without employee awareness), genuinely sensitive interactions are interrupted for education rather than blunt blocking, and unknown AI interfaces are automatically discovered and brought under policy governance.
