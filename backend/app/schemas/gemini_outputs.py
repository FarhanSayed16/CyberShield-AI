"""
CyberSentinel AI — Tier 3 Advanced Agent Data Models
These Pydantic models perfectly mirror the TypeScript definitions in the frontend,
forcing the Gemini AI model to return strongly typed JSON for premium UI rendering.
"""

from pydantic import BaseModel, Field
from typing import List, Optional

# --- 1. Phishing Detection Output ---

class IndicatorOfCompromise(BaseModel):
    type: str = Field(..., description="e.g., URL, Email, IP Address")
    value: str = Field(..., description="The highly suspicious string itself")
    severity: str = Field(..., description="Low, Medium, High, Critical")

class FeatureImportance(BaseModel):
    feature: str = Field(..., description="The name of the feature (e.g., Urgency Language)")
    weight: float = Field(..., description="Impact weight, usually 0.0 to 1.0")
    description: str = Field(..., description="Why this feature affected the score")

class DomainAnalysis(BaseModel):
    sender_domain: Optional[str] = Field(None, description="The extracted domain from the sender")
    claimed_brand: Optional[str] = Field(None, description="The brand the attacker is impersonating")
    domain_mismatch: bool = Field(..., description="True if sender domain doesn't match the claimed brand")
    domain_age_signal: str = Field(..., description="Qualitative estimate if WHOIS lookup wasn't performed, e.g., 'Likely freshly registered'")

class UrlAnalysisItem(BaseModel):
    url: str = Field(..., description="The extracted link")
    is_suspicious: bool = Field(..., description="True if link points to known bad or obscured path")
    reason: str = Field(..., description="Why it is suspicious")

class PhishingAnalysisOutput(BaseModel):
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: int = Field(..., description="0 to 100")
    phishing_probability: float = Field(..., description="0.0 to 1.0 likelihood")
    confidence_score: float = Field(..., description="0.0 to 1.0 AI confidence in decision")
    threat_category: str = Field(..., description="e.g., Credential Harvesting, Malware Distribution")
    is_phishing: bool = Field(..., description="Definitive boolean")
    explanation: str = Field(..., description="User-friendly text explaining the AI's reasoning")
    suspicious_phrases: List[str] = Field(default_factory=list, description="Exact substrings from input that trigger red flags")
    indicators_of_compromise: List[IndicatorOfCompromise] = Field(default_factory=list)
    feature_importance: List[FeatureImportance] = Field(default_factory=list)
    mitigation_steps: List[str] = Field(default_factory=list)
    domain_analysis: DomainAnalysis
    url_analysis: List[UrlAnalysisItem] = Field(default_factory=list)

# --- 2. Deepfake & Synthetic Content Output ---

class DeepfakeAnalysisOutput(BaseModel):
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: int = Field(..., description="0 to 100")
    is_deepfake: bool = Field(..., description="Definitive boolean")
    confidence_score: float = Field(..., description="0.0 to 1.0 AI confidence in decision")
    explanation: str = Field(..., description="User-friendly text explaining why the content looks artificial or genuine")
    detected_artifacts: List[str] = Field(default_factory=list, description="Specific anomalies like 'asymmetrical shadows' or 'metallic voice resonance'")
    authenticity_signals: List[str] = Field(default_factory=list, description="Natural elements suggesting human origin")
    recommendations: List[str] = Field(default_factory=list, description="Actions the user should take")

# --- 3. Prompt Injection Output ---

class PromptInjectionOutput(BaseModel):
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: int = Field(..., description="0 to 100")
    is_injection: bool = Field(..., description="Definitive boolean")
    confidence_score: float = Field(..., description="0.0 to 1.0 AI confidence in decision")
    injection_type: str = Field(..., description="e.g., Developer Mode Jailbreak, System Prompt Leak, XSS Payload")
    explanation: str = Field(..., description="User-friendly text explaining what the hacker was trying to achieve")
    malicious_payloads: List[str] = Field(default_factory=list, description="The specific substrings of text carrying the exploit")
    mitigation_steps: List[str] = Field(default_factory=list, description="Advice on sanitizing before passing to LLM")

# --- 4. Behavior Anomaly Output ---

class BehaviorAnomalyOutput(BaseModel):
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: int = Field(..., description="0 to 100")
    is_anomaly: bool = Field(..., description="Definitive boolean")
    confidence_score: float = Field(..., description="0.0 to 1.0 AI confidence in decision")
    anomaly_type: str = Field(..., description="e.g., Impossible Travel, Mass Data Exfiltration, Privilege Escalation")
    explanation: str = Field(..., description="User-friendly explanation of why this activity deviates from the baseline")
    anomalies_detected: List[str] = Field(default_factory=list, description="Specific triggers against the user's historical baseline profile")
    recommended_actions: List[str] = Field(default_factory=list, description="Steps for SecOps, e.g., 'Force password reset', 'Revoke session token'")
