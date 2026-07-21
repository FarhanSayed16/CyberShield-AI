"""
CyberSentinel AI — Mock Agent Responses
Hardcoded responses for parallel development (before live agents are ready).
"""

import copy
from datetime import datetime, timezone

MOCK_RESPONSES = {
    "phishing": {
        "agent": "phishing",
        "output": {
            "threat_type": "phishing",
            "risk_score": 92,
            "confidence": 0.9,
            "indicators": ["urgency language", "credential request", "suspicious URL"],
            "raw_reasons": [
                "Uses urgency about account suspension.",
                "Asks for password verification via unknown link.",
            ],
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
    "url": {
        "agent": "url",
        "output": {
            "threat_type": "malicious_url",
            "risk_score": 87,
            "confidence": 0.91,
            "indicators": ["domain similarity", "suspicious keyword", "unusual domain pattern"],
            "url_features": {
                "suspicious_keywords": ["login", "verify"],
                "num_subdomains": 1,
                "length": 29,
            },
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
    "prompt": {
        "agent": "prompt",
        "output": {
            "threat_type": "prompt_injection",
            "risk_score": 85,
            "confidence": 0.93,
            "indicators": ["instruction override", "system prompt extraction"],
            "categories": ["override_instructions", "secret_extraction"],
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
    "deepfake": {
        "agent": "deepfake",
        "output": {
            "threat_type": "deepfake",
            "risk_score": 78,
            "confidence": 0.82,
            "indicators": [
                "inconsistent lighting",
                "blurred boundaries",
                "unnatural skin smoothness",
            ],
            "manipulation_type": "face_swap",
            "analysis_details": {
                "visual_artifacts": ["lighting mismatch", "pixelated boundary"],
                "hive_ai_result": "likely_manipulated",
            },
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
    "explanation": {
        "agent": "explanation",
        "output": {
            "summary_text": (
                "This input was flagged because it contains multiple suspicious indicators "
                "commonly associated with cyber threats."
            ),
            "key_points": [
                "Contains patterns associated with known attack techniques.",
                "Confidence level is high based on multiple matching indicators.",
                "External verification sources corroborate the threat assessment.",
            ],
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
    "recommendation": {
        "agent": "recommendation",
        "output": {
            "severity_label": "Critical",
            "actions": [
                "Do not interact with this content.",
                "Report to your security team or IT department.",
                "Run a security scan on your device.",
                "If credentials were entered, change your passwords immediately.",
            ],
        },
        "meta": {"model": "gemini-1.5-flash", "version": "v1"},
    },
}


# --- Benign mock variants ---
MOCK_BENIGN = {
    "phishing": {
        "threat_type": "benign", "risk_score": 8, "confidence": 0.95,
        "indicators": [], "raw_reasons": [],
    },
    "url": {
        "threat_type": "benign", "risk_score": 5, "confidence": 0.97,
        "indicators": [], "url_features": {},
    },
    "prompt": {
        "threat_type": "benign", "risk_score": 3, "confidence": 0.97,
        "indicators": [], "categories": [],
    },
    "deepfake": {
        "threat_type": "benign", "risk_score": 8, "confidence": 0.94,
        "indicators": [], "manipulation_type": "none",
        "analysis_details": {"visual_artifacts": [], "hive_ai_result": "authentic"},
    },
}


def get_mock_response(agent_name: str) -> dict:
    """Return a deep copy of the mock response for a given agent."""
    if agent_name in MOCK_RESPONSES:
        resp = copy.deepcopy(MOCK_RESPONSES[agent_name])
        if "meta" in resp:
            resp["meta"]["generated_at"] = datetime.now(timezone.utc).isoformat()
        # Return just the output dict for agent clients
        return resp.get("output", resp)
    return {"error": f"No mock for agent: {agent_name}"}
