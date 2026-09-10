"""
Local URL risk heuristics used when remote ML / Gemini are unavailable or fail.
Provides deterministic signals for phishing-like URLs and workplace-policy categories.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

# High-signal adult / NSFW hosts (workplace policy — not malware)
_ADULT_HOST_MARKERS = (
    "pornhub",
    "xvideos",
    "xnxx",
    "xhamster",
    "redtube",
    "youporn",
    "onlyfans",
    "chaturbate",
    "stripchat",
    "brazzers",
    "spankbang",
    "missav",
    "hqporner",
    "eporner",
    "rule34",
    "nhentai",
    "hentai",
    "sex.com",
    "porn.com",
    "adultfriendfinder",
)

_PHISHING_HOST_HINTS = (
    "paypa1",
    "paypai",
    "appleid-",
    "apple-id",
    "secure-login",
    "account-verify",
    "verify-account",
    "update-billing",
    "signin-",
    "login-",
    "banking-",
    "microsoft-secure",
    "google-secure",
    "amaz0n",
    "faceb00k",
)

_SUSPICIOUS_TLDS = {
    "zip",
    "mov",
    "tk",
    "gq",
    "ml",
    "cf",
    "ga",
    "top",
    "xyz",
    "click",
    "country",
    "stream",
    "gdn",
    "loan",
    "work",
    "cam",
    "rest",
}

_IP_HOST_RE = re.compile(
    r"^(\d{1,3}\.){3}\d{1,3}$|^\[?[0-9a-fA-F:]+\]?$"
)


def analyze_url_heuristics(url: str) -> dict:
    """
    Return {risk_score:0-100, indicators:[], category, threat_type, confidence}.
    """
    raw = (url or "").strip()
    indicators: list[str] = []
    score = 0
    category = "unknown"
    threat_type = "benign"

    try:
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    except Exception:
        return {
            "risk_score": 55,
            "indicators": ["Malformed URL"],
            "category": "invalid",
            "threat_type": "malicious_url",
            "confidence": 0.6,
        }

    host = (parsed.hostname or "").lower().rstrip(".")
    path = (parsed.path or "").lower()
    full = f"{host}{path}"
    scheme = (parsed.scheme or "").lower()

    if not host:
        indicators.append("Missing hostname")
        score = max(score, 60)
        threat_type = "malicious_url"

    # Adult / NSFW workplace category
    if any(m in host or m in full for m in _ADULT_HOST_MARKERS) or any(
        tok in full for tok in ("/porn", "/xxx", "nsfw")
    ):
        indicators.append("Adult / NSFW site (workplace policy)")
        score = max(score, 72)
        category = "adult"
        threat_type = "malicious_url"  # policy-risk; UI maps via score

    # Credential-harvest / phishing lexical signals
    if any(h in host for h in _PHISHING_HOST_HINTS):
        indicators.append("Phishing-like hostname pattern")
        score = max(score, 78)
        category = "phishing"
        threat_type = "malicious_url"

    if _IP_HOST_RE.match(host or ""):
        indicators.append("Raw IP address host")
        score = max(score, 55)
        threat_type = "malicious_url"

    labels = host.split(".") if host else []
    is_ip = bool(host and _IP_HOST_RE.match(host))
    if not is_ip and len(labels) >= 4:
        indicators.append("Excessive subdomain depth")
        score = max(score, min(100, score + 12))

    tld = labels[-1] if labels else ""
    if not is_ip and tld in _SUSPICIOUS_TLDS:
        indicators.append(f"Suspicious TLD .{tld}")
        score = max(score, 40)

    if scheme == "http":
        indicators.append("Unencrypted HTTP")
        score = max(score, min(100, score + 8))

    if "@" in (parsed.netloc or ""):
        indicators.append("Credentials embedded in URL (@)")
        score = max(score, 70)
        threat_type = "malicious_url"

    if re.search(r"(login|signin|verify|secure|account|password|bank).*\.(ru|cn|tk|ml|gq|cf)", host):
        indicators.append("Sensitive keyword + risky TLD")
        score = max(score, 75)
        threat_type = "malicious_url"

    # Brand impersonation with hyphenated extras
    brands = ("paypal", "apple", "microsoft", "google", "amazon", "facebook", "instagram", "netflix", "binance")
    for b in brands:
        if b in host and not host.endswith(f"{b}.com") and not host.endswith(f"{b}.net"):
            # e.g. paypal-secure.tk, appleid-verify.com
            if "-" in host or host.count(".") >= 2:
                indicators.append(f"Possible {b} brand impersonation")
                score = max(score, 80)
                category = "phishing"
                threat_type = "malicious_url"
                break

    # Shortener misuse is medium unless combined with other signals
    shorteners = ("bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd")
    if host in shorteners:
        indicators.append("URL shortener")
        score = max(score, 35)

    score = max(0, min(100, int(score)))
    if score >= 70:
        confidence = 0.85
    elif score >= 40:
        confidence = 0.7
    elif indicators:
        confidence = 0.55
    else:
        confidence = 0.5
        category = category if category != "unknown" else "benign"

    if score < 30 and not indicators:
        threat_type = "benign"
        category = "benign"

    return {
        "risk_score": score,
        "indicators": indicators,
        "category": category,
        "threat_type": threat_type if score >= 30 else "benign",
        "confidence": confidence,
    }
