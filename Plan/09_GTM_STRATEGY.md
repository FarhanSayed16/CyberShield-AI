# 09 — Go-To-Market & Business Strategy

## Positioning

> "AISentinel is the visibility and control layer for AI usage inside companies — like a security camera for your team's AI interactions."

**One sentence for a CTO:**
> "Install our Chrome extension and within 5 minutes you'll see exactly which employees are sending what company data to which AI tools."

---

## Target Segments & Pricing

### Segment 1: Indian Tech Startups (Initial Beachhead)
- Size: 10–100 employees
- Pain: No AI governance, DPDP Act concerns growing
- **Pricing:** ₹499/user/month (billed annually) — ₹599 monthly
- Minimum: ₹4,999/month for up to 10 users

### Segment 2: US-based Startups (Second Wave)
- Size: 10–200 employees
- Pain: Security team asking about AI data leaks, SOC2 compliance
- **Pricing:** $15/user/month (annual) — $19 monthly
- Minimum: $149/month for up to 10 users

### Segment 3: Indian Enterprises (Later)
- Size: 500–5000 employees
- Pain: IT/BPO handling client data, regulatory risk
- **Pricing:** Custom enterprise contracts (₹10L–₹50L/year)

---

## Plans

| Plan | Price (India) | Price (US) | Users | Features |
|------|--------------|------------|-------|----------|
| **Starter** | ₹4,999/mo | $149/mo | Up to 10 | Extension + Dashboard + DLP alerts |
| **Growth** | ₹499/user/mo | $15/user/mo | 11–100 | + API Proxy + Custom patterns + Slack alerts |
| **Enterprise** | Custom | Custom | 100+ | + SSO + Compliance reports + SLA |
| **Free Trial** | ₹0 | $0 | Up to 5 | Full features for 14 days |

---

## First 30 Days GTM Plan

### Week 1: Validate the Pain
**Goal:** 10 discovery calls with CTOs/Heads of Engineering

**Outreach channels:**
- LinkedIn: message CTOs of Series A Indian startups with 20–100 employees
- Twitter/X: reply to tweets about AI data leaks, Samsung incident
- Startup communities: YourStory, iSPIRT, ProductHunt India, IndiaHacks Discord
- WhatsApp groups: SAAS India, Bangalore startup founders

**Exact message to send:**
```
Hi [Name], I'm building a tool that shows CTOs exactly what data their 
team is sending to ChatGPT/Claude. Takes 5 min to install. Would you 
spend 20 min telling me what you're currently doing about AI data leaks? 
Happy to share early access.
```

**Qualifying question:** "Do you know what your engineers are sending to AI tools today?"

---

### Week 2: Build MVP (Parallel)
- Build while doing discovery calls
- Let call insights shape prioritization
- Ship ugly early

---

### Week 3: Beta Invites
**Goal:** 5 companies install and use for one week

**Target profile:**
- 15–50 employees
- Engineers use AI tools daily
- CTO is technical and security-aware
- Open to paying ₹2,000–₹5,000/month if it works

**Onboarding flow:**
1. CTO signs up → gets Org token
2. Send Chrome extension ZIP + 3-step install guide
3. CTO invites 3–5 employees
4. 1-on-1 call after 3 days: "What did you see?"
5. Weekly check-in

---

### Week 4: Charge
**Goal:** First paying customer

**Approach:**
- If they found value: "We're moving to paid. ₹4,999/month — same as one developer hour. Worth it?"
- If they hesitate: offer 1 extra month free + priority feature requests
- Don't give it away for free after initial trial — paying validates problem

---

## Customer Discovery Questions

Ask these in discovery calls:
1. "How many employees are using ChatGPT/Claude at your company?"
2. "Has anyone ever asked you 'what are people sending to AI tools?'"
3. "Have you had any incidents or near-misses with confidential data in AI tools?"
4. "Do you have a company AI policy? Is it being followed?"
5. "What would you pay monthly to know exactly what's being sent to AI tools?"
6. "If you could only have ONE thing — visibility, blocking, or cost tracking — which would you pick?"

---

## Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-----------------|-----------------|
| Discovery calls | 20 | 50 |
| Beta installs | 5 | 30 |
| Paying customers | 1 | 10 |
| MRR | ₹5,000 | ₹50,000 |
| Churn | — | < 5% |
| NPS | — | > 40 |
| Events captured/day | — | 10,000+ |

---

## Competitive Response Playbook

### "We already use LiteLLM / Portkey"
> "Those tools only see API traffic. 77% of AI usage happens in the browser — ChatGPT.com, Claude.ai. Our Chrome extension captures all of that. Do your employees use personal AI accounts? LiteLLM can't see that."

### "We blocked ChatGPT at the firewall"
> "How's that working? Employees use their phones on 4G. Or hotspots. We see that too. Blocking doesn't work — visibility + policy does."

### "We use Microsoft Copilot for everything"
> "Copilot is great for sanctioned usage. Our data shows employees still use personal ChatGPT and Claude in addition to Copilot — often for sensitive tasks. We make that visible."

### "This feels like employee surveillance"
> "It's exactly like a firewall log or email DLP — standard security practice. Employees see their own data. It's about protecting the company, not spying on people. Most CTOs frame it as: 'We want to help you use AI safely, not catch you out.'"

---

## YC-Style Investor Pitch Outline

**Problem (1 slide):**
77% of employees are sending company data to AI tools. 98% of companies have no visibility into what's being sent. Shadow AI is the #1 emerging data risk.

**Solution (1 slide):**
AISentinel is a Chrome extension + backend that captures every AI prompt sent by your employees and shows you exactly what's being shared — in real time.

**Why now (1 slide):**
AI adoption doubled in 12 months. DPDP Act + GDPR AI obligations are live. Board-level conversations about AI risk happening everywhere. The window to become the default control layer is open now.

**Market (1 slide):**
100M+ enterprise employees using AI globally. At $15/user/month: $1.8B TAM in US alone. India: 5M tech workers at ₹499/month = $400M SAM.

**Traction (1 slide):**
[Your numbers here after beta]

**Team (1 slide):**
[Your background here]

**Ask (1 slide):**
Raising $500K / ₹4Cr seed to: hire 1 backend engineer, run first sales sprint, 12 months runway.

---

## Expansion Path to $10M ARR

```
Month 0–6:   Visibility tool (prompts + DLP alerts)
             → 200 customers × $500/month = $100K MRR

Month 6–12:  Add blocking + enforcement rules  
             → Enterprise upsell: $2K–$10K/month
             → 100 enterprise × $2,000 = $200K MRR

Month 12–18: Multi-model router (cost optimizer)
             → "Save 40% on AI costs" as primary hook
             → API usage billing (% of AI spend managed)
             → 500 companies × $800 avg = $400K MRR

Month 18–24: Compliance reports (SOC2, GDPR, DPDP)
             → Enterprise contracts + MSSP channel
             → $1M+ MRR is achievable
```

---

## Moats (What Keeps Competitors Out)

1. **Data network effect:** The more prompts captured, the better the DLP models
2. **Integration lock-in:** Once proxy is set in developer tooling, removing is pain
3. **Extension stickiness:** Once employees have it installed, removing requires IT action
4. **Compliance dependency:** Once used for DPDP/SOC2 audits, can't remove it
5. **First-mover in India:** No serious local competitor for India-specific compliance (DPDP, Aadhaar DLP)
