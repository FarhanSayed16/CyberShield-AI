"""
Shared USE_MOCK_AGENTS helpers for Tier-3 Gemini structured outputs.
"""

from app.schemas.gemini_outputs import (
    PhishingAnalysisOutput,
    DomainAnalysis,
    PromptInjectionOutput,
    DeepfakeAnalysisOutput,
    BehaviorAnomalyOutput,
)


def mock_phishing_output() -> PhishingAnalysisOutput:
    return PhishingAnalysisOutput(
        risk_level="HIGH",
        risk_score=88,
        phishing_probability=0.9,
        confidence_score=0.92,
        threat_category="Credential Harvesting",
        is_phishing=True,
        explanation="[MOCK] Simulated phishing analysis for offline development.",
        suspicious_phrases=["verify your account", "urgent"],
        indicators_of_compromise=[],
        feature_importance=[],
        mitigation_steps=["Do not click links", "Report as phishing"],
        domain_analysis=DomainAnalysis(
            sender_domain="example-secure-login.com",
            claimed_brand="Example Bank",
            domain_mismatch=True,
            domain_age_signal="Unknown (mock)",
        ),
        url_analysis=[],
    )


def mock_prompt_output() -> PromptInjectionOutput:
    return PromptInjectionOutput(
        risk_level="HIGH",
        risk_score=82,
        is_injection=True,
        confidence_score=0.9,
        injection_type="Jailbreak",
        explanation="[MOCK] Simulated prompt-injection analysis.",
        malicious_payloads=["Ignore previous instructions"],
        mitigation_steps=["Sanitize untrusted prompts", "Apply allow-lists"],
    )


def mock_deepfake_output() -> DeepfakeAnalysisOutput:
    return DeepfakeAnalysisOutput(
        risk_level="MEDIUM",
        risk_score=55,
        is_deepfake=False,
        confidence_score=0.8,
        explanation="[MOCK] Simulated deepfake analysis.",
        detected_artifacts=[],
        authenticity_signals=["Natural lighting (mock)"],
        recommendations=["Verify source authenticity"],
    )


def mock_anomaly_output() -> BehaviorAnomalyOutput:
    return BehaviorAnomalyOutput(
        risk_level="LOW",
        risk_score=20,
        is_anomaly=False,
        confidence_score=0.75,
        anomaly_type="None",
        explanation="[MOCK] Simulated behavior anomaly analysis.",
        anomalies_detected=[],
        recommended_actions=["Continue monitoring"],
    )
