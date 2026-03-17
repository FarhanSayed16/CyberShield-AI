# CyberSentinel AI

## Explainable Personal Cyber Defense Assistant

---

# 1. Project Overview

**CyberSentinel AI** is an intelligent cyber defense platform designed to detect, analyze, and explain modern cyber threats using AI and machine learning.

The system works as a **personal cybersecurity assistant** that monitors suspicious digital activity such as phishing messages, malicious URLs, and prompt injection attacks.

CyberSentinel consists of three integrated layers:

1. **Floating AI Security Assistant (User Alert Interface)**
2. **Browser Monitoring Extension**
3. **Explainable Cyber Threat Intelligence Dashboard**

The platform not only detects threats but also explains **why a threat was detected**, providing transparency through Explainable AI.

---

# 2. Core System Architecture

The architecture follows a **modular microservice-inspired design**, enabling scalable threat detection and real-time monitoring.

```
User Browser / Application
        │
        ▼
Browser Extension (Monitoring Layer)
        │
        ▼
CyberSentinel API Gateway
        │
        ▼
Input Processing & Feature Extraction
        │
        ▼
Threat Detection Engine
 ├── Phishing Detection Model
 ├── Malicious URL Classifier
 └── Prompt Injection Detector
        │
        ▼
Explainable AI Engine
        │
        ▼
Risk Scoring Engine
        │
        ▼
Recommendation Engine
        │
        ▼
Threat Intelligence Database
        │
        ▼
Security Dashboard (React)
        │
        ▼
Floating CyberSentinel AI Assistant
```

---

# 3. Technology Stack

To build a powerful and scalable prototype, the system uses a **modern full-stack architecture**.

## Frontend (Dashboard Interface)

Framework:

* **React.js**
* **Vite (fast build tool)**

UI Components:

* **TailwindCSS** – UI styling
* **ShadCN UI / Material UI** – dashboard components
* **Recharts / Chart.js** – data visualization

Capabilities:

* Threat monitoring dashboard
* Risk analytics
* Threat logs
* Interactive scanning interface

---

## Backend (API & Processing Layer)

Framework:

* **FastAPI**

Reasons:

* High performance
* Built-in async support
* Automatic API documentation
* Ideal for ML inference APIs

Backend Responsibilities:

* API gateway
* Threat detection orchestration
* Feature extraction
* Risk scoring
* Recommendation generation

---

## AI / Machine Learning Layer

Libraries:

* **Scikit-learn**
* **XGBoost**
* **Transformers (HuggingFace)**

Models Used:

### Phishing Detection

Technique:

```
TF-IDF + Logistic Regression / XGBoost
```

Purpose:

* Detect phishing messages
* Analyze suspicious email content

---

### Malicious URL Detection

Technique:

```
Random Forest / XGBoost Classifier
```

Features extracted:

* URL length
* Domain entropy
* Suspicious keywords
* Number of special characters
* Domain similarity

---

### Prompt Injection Detection

Technique:

```
Transformer-based classification
```

Model:

```
DistilBERT / RoBERTa
```

Purpose:

Detect malicious prompts attempting to manipulate AI systems.

---

## Explainable AI (XAI)

Tools:

* **SHAP (SHapley Additive Explanations)**
* **LIME**

Purpose:

Explain model predictions by highlighting:

* important words
* suspicious URL patterns
* risk indicators

Example explanation output:

```
Detection Reason:
• Suspicious keyword "verify"
• Domain similarity to known phishing domains
• Unusual URL structure
```

---

# 4. Browser Monitoring Extension

Technology:

* **Chrome Extension API**
* **JavaScript**
* **React (optional popup UI)**

Responsibilities:

* Monitor visited URLs
* Detect suspicious links
* Capture suspicious text inputs
* Send data to backend API

Workflow:

```
Browser Activity
      │
      ▼
Extension Script
      │
      ▼
CyberSentinel API
      │
      ▼
Threat Analysis
```

---

# 5. Floating CyberSentinel AI Assistant

Purpose:

Provide real-time security alerts to users.

Possible Implementation:

* **Electron-based desktop widget**
  or
* **React floating component within dashboard**

Capabilities:

* Display threat alerts
* Provide quick access to dashboard
* Show security status

Example:

```
CyberSentinel AI
System Status: Monitoring
Threat Level: Safe
```

Alert example:

```
⚠ Threat Detected

Type: Malicious URL
Risk Score: 86%

Reason:
Suspicious domain structure
```

---

# 6. API Layer

FastAPI exposes several endpoints used by the extension and dashboard.

## Threat Detection API

```
POST /api/analyze
```

Input:

```
{
  "type": "url",
  "content": "http://amaz0n-login-security.com"
}
```

Output:

```
{
  "threat_type": "Malicious URL",
  "risk_score": 86,
  "confidence": 0.91,
  "explanation": [
    "Suspicious domain similarity",
    "Excessive special characters"
  ],
  "recommended_action": "Avoid visiting this website"
}
```

---

## Threat History API

```
GET /api/threats
```

Returns threat logs.

---

## Threat Statistics API

```
GET /api/stats
```

Used for dashboard analytics.

---

# 7. Database Layer

Database:

* **PostgreSQL**

Used to store:

* threat logs
* user activity metadata
* detection results
* system analytics

Optional caching:

* **Redis**

Used for:

* API response caching
* temporary threat session storage

---

# 8. Deployment Architecture

```
Client Browser
      │
      ▼
Chrome Extension
      │
      ▼
FastAPI Backend (Docker)
      │
      ├── ML Inference Service
      ├── Explainability Engine
      └── Threat Analysis Service
      │
      ▼
PostgreSQL Database
      │
      ▼
React Dashboard (Hosted on Vercel / Netlify)
```

---

# 9. DevOps & Deployment Tools

Containerization:

* **Docker**

Deployment Platforms:

* **Render**
* **Railway**
* **AWS EC2**
* **Vercel (Frontend)**

CI/CD:

* **GitHub Actions**

---

# 10. Security Design Considerations

CyberSentinel follows **secure-by-design principles**:

* Input sanitization
* API authentication
* Rate limiting
* Logging & monitoring
* Privacy-preserving data handling

---

# 11. Final System Capabilities

CyberSentinel AI provides:

* AI-powered threat detection
* Explainable AI decision support
* Real-time threat alerts
* Browser activity monitoring
* Security analytics dashboard

This architecture allows the system to scale from a **hackathon prototype** into a **full cybersecurity defense platform**.

---

# 12. Future Expansion

The system can be extended with:

* Deepfake detection models
* User behavior anomaly detection
* Enterprise security monitoring
* Threat intelligence feeds
* SIEM integrations

---
