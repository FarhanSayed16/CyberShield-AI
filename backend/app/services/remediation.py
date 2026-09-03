from typing import List, Optional


def get_remediation_steps(threat_type: str, risk_score: int, indicators: List[str]) -> List[str]:
    """Generate context-aware, actionable remediation steps based on the threat."""
    
    if risk_score < 30:
        return ["No immediate action required. Monitor as usual."]
        
    steps = []
    
    if threat_type == "phishing" or "credential theft" in threat_type.lower():
        steps.extend([
            "1. Immediately change passwords for any accounts accessed recently.",
            "2. Enable Multi-Factor Authentication (MFA) if not already active.",
            "3. Do not interact further with the suspicious link or embedded forms."
        ])
    elif threat_type == "malware" or threat_type == "ransomware":
        steps.extend([
            "1. Disconnect the affected device from the network to prevent lateral movement.",
            "2. Run a full-system antivirus scan immediately.",
            "3. Do not download or execute any unknown files."
        ])
    elif "sql injection" in threat_type.lower() or "cross-site scripting" in threat_type.lower():
        steps.extend([
            "1. Sanitize all user inputs on the affected endpoint.",
            "2. Implement a Web Application Firewall (WAF) rule to block the offending pattern.",
            "3. Check database logs for any unauthorized data exfiltration."
        ])
    else:
        steps.extend([
            "1. Review the provided indicators of compromise (IoCs).",
            "2. Block the suspicious domains or IPs on your firewall.",
            "3. Alert your security operations center (SOC)."
        ])

    # Dynamic additions based on indicators
    if any("port" in i.lower() for i in indicators) or any("protocol" in i.lower() for i in indicators):
        steps.append("- Network Isolation: Consider closing unusual outbound ports flagged in the indicators.")

    return steps


def merge_remediation_actions(
    existing: Optional[List[str]],
    threat_type: str,
    risk_score: int,
    indicators: List[str],
) -> List[str]:
    """Keep Gemini/agent actions and append unique template remediation steps."""
    template = get_remediation_steps(threat_type, risk_score, indicators)
    merged: List[str] = []
    seen: set[str] = set()
    for action in list(existing or []) + template:
        key = action.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(action)
    return merged
