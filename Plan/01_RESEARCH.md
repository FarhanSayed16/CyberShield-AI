# 01 — Market Research & Competitive Analysis

## 🔥 The Problem (Validated by Data)

### Shadow AI Statistics (2025–2026)

| Metric | Number | Source |
|--------|--------|--------|
| Enterprise employees using GenAI at work | 45–67% | LayerX / Salesforce 2025 |
| Of those, who copy-paste company data into AI | 77% | LayerX Security 2025 |
| Pastes from **unmanaged personal accounts** | 82% | LayerX / Harmonic 2025 |
| Organizations reporting unsanctioned AI use | 98% | CrowdStrike 2026 |
| Companies with formal AI security policy | 18% | Salesforce 2026 |
| Additional cost per breach when Shadow AI involved | ~$700,000 | IBM Cost of Breach 2025 |
| Orgs expecting shadow AI incident in next 12 months | 49% | CrowdStrike 2026 |
| AI-related vulnerabilities as fastest-growing cyber risk | 87% of respondents | World Economic Forum 2026 |

### The Core Gap
> Existing enterprise controls (DLP, CASB, firewalls) were built for file transfers and email. They cannot see *inside* AI prompts. An employee pasting your trade secrets into ChatGPT looks like normal HTTPS traffic.

---

## 🏢 Real-World Incidents

| Company | Incident | Year |
|---------|----------|------|
| Samsung | 3 engineers leaked chip source code + meeting transcripts via ChatGPT | 2023 |
| Major Pharma (unnamed) | Clinical trial data uploaded to multiple AI tools — potential FDA violation | 2025 |
| General enterprise | 20% of all data breaches now linked to Shadow AI | 2025 |

---

## 🌐 Competitive Landscape

### Category 1: LLM API Gateways (Developer-focused)

| Product | What it does | Gap vs AISentinel |
|---------|-------------|-------------------|
| **LiteLLM** | Open-source proxy, 100+ LLM providers, unified API | API-only, no browser capture, no employee identity |
| **Portkey** | LLM proxy with caching, routing, observability | Single-team focus, no employee management |
| **Helicone** | Observability proxy, Rust-based | Developer tool only, no non-technical UI |
| **Bifrost (Maxim AI)** | High-perf gateway, 11µs latency | Enterprise infra focus, no Shadow AI capture |
| **Kong AI Gateway** | Enterprise API management + AI plugins | Complex setup, no browser-level capture |
| **Cloudflare AI Gateway** | Routes API traffic to 350+ models | No identity layer, no employee management |
| **TrueFoundry** | Enterprise AI governance control plane | Heavy/complex, no Chrome extension |

### Category 2: Browser/Endpoint DLP (Security-focused)

| Product | What it does | Gap vs AISentinel |
|---------|-------------|-------------------|
| **LayerX Security** | Browser security for SaaS + AI | Expensive enterprise-only, not AI-native |
| **Nightfall AI** | DLP for cloud apps | API integrations, not prompt-level |
| **Zscaler** | CASB/DLP network-level | No prompt content analysis |
| **Microsoft Purview** | M365-centric DLP | Locked into Microsoft ecosystem |

### Category 3: AI-Specific Governance

| Product | What it does | Gap vs AISentinel |
|---------|-------------|-------------------|
| **Pomerium** | Identity-aware proxy, sits in front of LLM gateways | Infrastructure layer, no UI/dashboard for non-devs |
| **Lasso Security** | Browser extension for AI security | US-only, enterprise pricing, limited routing |

---

## 🎯 The Gap AISentinel Fills

```
                    [API Traffic]         [Browser Traffic]
                         |                       |
Existing tools cover: ✅ LiteLLM, Portkey    ❌ NOBODY covers this well
                         |                       |
AISentinel covers:    ✅ API Proxy          ✅ Chrome Extension
                         |                       |
                    [Developer use]        [Employee use (77% of volume)]
```

**The key insight:** 77% of AI data leaks happen through browser-based usage (ChatGPT.com, Claude.ai). Existing gateways only cover API traffic. AISentinel covers both.

---

## 💰 Market Sizing

### TAM (Total Addressable Market)
- Global enterprise AI governance market: projected $8.9B by 2028 (Gartner)
- AI security market: $35B+ by 2030 (Forrester)
- Every company with 10+ employees using AI is a potential customer

### SAM (Serviceable Addressable Market — India + US Tech Startups)
- ~500,000 tech startups globally
- Average 20–50 employees using AI tools
- At $20/user/month: $200–$1000/company/month
- 10,000 customers × $500/month = **$5M ARR at 1% penetration**

### SOM (Serviceable Obtainable Market — Year 1)
- Target: 100–500 paying teams
- Revenue: $50K–$500K ARR
- Achievable with 2–3 person founding team

---

## 🇮🇳 India-Specific Opportunity

### Regulatory Tailwinds
- **DPDP Act 2023** (Digital Personal Data Protection): Companies must demonstrate data processing controls
- **CERT-In compliance**: Security incident reporting mandates
- **RBI AI guidelines**: Financial sector AI governance requirements growing

### Market Dynamics
- Indian enterprises are rapidly adopting AI but have **zero governance**
- IT/BPO sector: massive risk — employees process client data + paste into AI
- Indian startups: cost-conscious, willing to pay if ROI is clear
- Pricing sweet spot: ₹500–₹2,000/user/month (vs $20–50/user in US)

### Competitive Moat in India
- No major international competitor has India-focused pricing or DPDP compliance
- Local support + language-aware DLP (Hindi, regional language PII detection)
- India sales motion: CTO/CISO WhatsApp outreach, product-led growth

---

## 🔑 Strategic Differentiation Summary

1. **Both API + Browser** — only solution covering 100% of AI traffic vectors
2. **Employee identity** — role-based access (intern vs CEO), not just API-key level
3. **Non-technical dashboard** — CTO can see risk without touching a terminal
4. **India-first pricing** — ₹500/user vs $30/user from US competitors
5. **DPDP + GDPR ready** — compliance layer built-in from day 1
6. **Shadow AI detection** — detects use of personal AI accounts
