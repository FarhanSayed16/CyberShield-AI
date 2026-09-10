# CyberSentinel — Product Idea & Selling Plan

**Date:** 2026-09-09  
**For:** Founders + team  
**Length:** Short decision brief (use with `Combined_Product_And_Integration_Plan.md` for engineering detail)

---

## 1. Exact idea

**CyberSentinel** is a **B2B browser security product for companies using AI**.

One Chrome extension + one admin console that does two jobs:

| Job | What it means |
| :--- | :--- |
| **AI Workplace Guard** | See what employees send to ChatGPT / Claude / Gemini; flag secrets & PII (DLP) |
| **Threat Explainer** | Explain phishing links, risky prompts, and suspicious email — with clear actions |

**One-line pitch**

> Install our extension. In minutes you’ll see what your team pastes into AI tools — and get clear warnings when links or prompts look dangerous.

**Who pays:** CTO / Head of Eng at a **10–100 person** startup (India first, then US).  
**Why they buy:** Shadow AI + data leaks + client/DPDP pressure — not “another antivirus.”

**What we are not:** Enterprise browser, SIEM, or two separate apps.

---

## 2. Why this combination works

| From AISentinel (`aiextinct`) | From CyberSentinel (this repo) |
| :--- | :--- |
| Orgs, logins, employee identity | Explainable URL / prompt / email analysis |
| AI-site monitoring + DLP alerts | Gemini-backed “why it’s risky + what to do” |
| Admin events / alerts / verify | Landing + scan / history UX |
| Clear buyer & pricing draft | Detection breadth beyond regex |

**Rule:** Sell the **AI visibility** job. Differentiate with **explainable threats**. Ship on **real accounts** (JWT/orgs), not a shared API key.

---

## 3. What customers get (v1)

1. Admin signs up → organization created  
2. Invites employees → each gets extension tokens  
3. Employees install **one** extension and work normally  
4. Admin sees: AI usage by person/tool · DLP alerts · threat explanations  
5. Soft control: acknowledge alert → close AI tabs / blackout (where built)  

**In v1:** observe + alert + explain.  
**Not in v1:** full anonymization vault, WASM ML, SSO, “block all AI everywhere.”

---

## 4. Selling plan

### Beachhead

- Indian tech startups, 10–100 employees  
- Buyer cares about ChatGPT leaks more than fancy dashboards  
- Setup must work in **&lt; 5 minutes**

### Pricing (starting point)

| Plan | Price (India) | Price (US) | What they get |
| :--- | :--- | :--- | :--- |
| Trial | Free · 14 days · 5 users | Same | Full v1 feel |
| **Starter** | **₹4,999/mo** (up to 10) | **$149/mo** | Extension + AI monitor + DLP + threat explainer (quota) |
| Growth | ₹499/user/mo | $15/user/mo | Higher quota + custom patterns + API proxy later |
| Enterprise | Custom | Custom | SSO / SLA — later |

### Motion (60 days)

| Week | Action | Goal |
| :---: | :--- | :--- |
| 1–2 | 10 CTO discovery calls | Validate pitch |
| 3–4 | 5 design-partner installs | Real usage |
| 5–6 | Ask for Starter pay | First revenue |
| Ongoing | 1 case study + LinkedIn | Pipeline |

**Outreach line**

> Building a tool that shows CTOs exactly what data their team sends to ChatGPT/Claude — and warns on phishing/risky prompts. 5‑min install. Open to a 20‑min call?

**Qualifying question:** *“Do you know what your engineers paste into AI tools today?”*

### Demo script (5 minutes)

1. Admin login → org dashboard  
2. Live ChatGPT paste with API key → **DLP critical alert**  
3. Suspicious URL → **explanation + remediation**  
4. Per-user AI usage chart  
5. Price + install next step  

---

## 5. How we win / lose

| Win if… | Lose if… |
| :--- | :--- |
| One brand, one extension, one login | Two products / two logins |
| First value in 5 minutes | Heavy MDM-only story |
| Honest “observe + explain” | Overselling block / fake intel |
| Charge Starter early | Endless free demos |
| India startup beachhead | Competing with Island on day one |

---

## 6. North star

**5 companies** using weekly within 90 days of combined MVP — **at least 1 paying**.

Success story format:

> “In week one we found X secret pastes to ChatGPT and Y risky links — with explanations the team actually understood.”

---

## 7. Team commitments (short)

| Do next | Don’t do next |
| :--- | :--- |
| Merge on JWT + orgs + one extension | Build WASM / tokenization before billing |
| Ship Starter paywall | Sell simulated geo as real intel |
| Run discovery + 5 pilots | Dual-brand marketing |
| Freeze v1 features | “Full SIEM / enterprise browser” scope |

**Brand recommendation:** keep **CyberSentinel**.  
**Primary wedge:** AI Workplace Guard.  
**Included differentiator:** Threat Explainer.

---

## 8. One slide for investors / partners

```text
Problem:  Teams paste company data into ChatGPT; phishing still hits the same browser.
Product:  One extension + admin console — AI visibility/DLP + explainable threat defense.
Buyer:    CTO at 10–100 person startups (India → US).
Model:    Seat/org SaaS — Starter ~₹5k/mo or $149/mo.
Proof:    Demo in 5 min; north star = 5 active teams, ≥1 paid.
Moat:     Org-aware AI monitoring + explainability (not regex-only DLP).
```

---

*Detail for merge engineering: `doc/Combined_Product_And_Integration_Plan.md`.*
