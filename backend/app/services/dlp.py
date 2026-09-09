"""
DLP v2 — fewer false positives; flags real secrets, PII, and confidential business content.
"""
import math
import re
from dataclasses import dataclass, field
from typing import Optional

# Only CRITICAL/HIGH findings drive alerts; MEDIUM needs context
SEVERITY_WEIGHT = {"CRITICAL": 90, "HIGH": 65, "MEDIUM": 35, "LOW": 10}

OPENAI_KEY_RE = re.compile(r"\bsk-[a-zA-Z0-9]{20,}\b")
GITHUB_KEY_RE = re.compile(r"\bghp_[a-zA-Z0-9]{36}\b")
AWS_KEY_RE = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
BEARER_RE = re.compile(r"\bBearer\s+[a-zA-Z0-9._-]{20,}\b", re.I)

EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b")
EMAIL_BLOCKLIST = {
    "example.com", "test.com", "email.com", "domain.com", "yoursite.com",
    "company.com", "acme.com", "foo.com", "bar.com",
}

PHONE_STRONG_RE = re.compile(
    r"(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|"
    r"\b[6-9]\d{9}\b"
)
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

PASSWORD_KW_RE = re.compile(
    r"\b(password|passwd|api[_\s]?key|secret[_\s]?key|access[_\s]?token)\s*[:=]\s*\S+",
    re.I,
)

# Insider threat / unauthorized access intent (never down-ranked as benign)
INTENT_PHRASES = [
    (r"\b(employee|staff|worker)\s+id\b", "HIGH", "INSIDER_THREAT"),
    (r"\b(badge|personnel)\s+(id|number|#)\b", "MEDIUM", "INSIDER_THREAT"),
    (r"\baccess\s+(my\s+)?(boss|manager|supervisor|executive|admin)\b", "HIGH", "INSIDER_THREAT"),
    (r"\b(boss|manager|executive)('s)?\s+(data|email|account|files|system)\b", "HIGH", "INSIDER_THREAT"),
    (r"\b(manipulate|bypass|circumvent|hack\s+into|break\s+into)\b", "HIGH", "INSIDER_THREAT"),
    (r"\b(unauthorized|illicit|illegal)\s+access\b", "HIGH", "INSIDER_THREAT"),
    (r"\bsteal\s+(data|information|credentials|passwords)\b", "HIGH", "INSIDER_THREAT"),
    (r"\b(internal\s+system|prod(uction)?\s+database|admin\s+panel|hr\s+system)\b", "MEDIUM", "INSIDER_THREAT"),
    (r"\b(privilege\s+escalat|lateral\s+movement|exfiltrat)\w*\b", "HIGH", "INSIDER_THREAT"),
]

# Business confidentiality — employee sharing sensitive org info
CONFIDENTIAL_PHRASES = [
    (r"\b(confidential|strictly confidential|internal only|do not share|under nda)\b", "HIGH", "CONFIDENTIAL"),
    (r"\b(trade secret|proprietary|classified|privileged)\b", "MEDIUM", "CONFIDENTIAL"),
    (r"\b(customer list|client list|employee salary|payroll|merger|acquisition|layoff)\b", "HIGH", "BUSINESS_SENSITIVE"),
    (r"\b(patient record|medical record|hipaa|credit card|bank account)\b", "HIGH", "FINANCIAL_HEALTH"),
    (r"\b(source code|database dump|production credentials|\.env file)\b", "HIGH", "TECHNICAL_LEAK"),
    (r"\b(attached|attachment|uploading|\.pdf|\.xlsx|\.csv|\.docx)\b.*\b(customer|client|internal|report)\b", "MEDIUM", "FILE_SHARE"),
    (r"\b(q[1-4]|revenue|p&l|profit|forecast|board deck|investor)\b.*\b(\d|%|million|crore)\b", "MEDIUM", "FINANCIAL_DATA"),
]

# Benign patterns — reduce score if prompt looks like normal AI usage
BENIGN_PATTERNS = [
    r"^(what|how|why|when|where|who|can you|please|help me|explain|write|summarize|translate|fix|debug)\b",
    r"\b(weather|recipe|essay|email draft|grammar|code review|unit test|hello world)\b",
    r"\b(homework|learning|tutorial|example|sample|demo|test prompt)\b",
]


@dataclass
class Finding:
    type: str
    severity: str
    offset_start: int
    matched_length: int
    redacted_value: str
    description: str = ""


@dataclass
class ScanResult:
    risk_score: int
    risk_level: str  # none | low | medium | high | critical
    findings: list[Finding]
    categories: list[str]
    has_critical: bool
    risk_reasons: list[str] = field(default_factory=list)


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {c: s.count(c) / len(s) for c in set(s)}
    return -sum(p * math.log2(p) for p in freq.values())


def _redact(match: str, finding_type: str) -> str:
    if finding_type == "EMAIL" and "@" in match:
        local, _, domain = match.partition("@")
        return f"{local[0]}***@{domain.split('.')[0]}***"
    if len(match) > 8:
        return match[:4] + "****"
    return "****"


def _is_benign_prompt(text: str) -> bool:
    lower = text.lower().strip()
    if len(lower) < 20:
        return True
    matches = sum(1 for p in BENIGN_PATTERNS if re.search(p, lower, re.I))
    return matches >= 1 and len(lower) < 500


def _email_is_real(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    if domain in EMAIL_BLOCKLIST:
        return False
    if domain.endswith(".example") or domain.startswith("test"):
        return False
    return True


def scan_prompt(text: str, custom_patterns: Optional[list[tuple[str, str, str]]] = None) -> ScanResult:
    findings: list[Finding] = []
    categories: set[str] = set()
    benign = _is_benign_prompt(text)

    def add_match(match: re.Match, ftype: str, severity: str, category: str, desc: str):
        findings.append(
            Finding(
                type=ftype,
                severity=severity,
                offset_start=match.start(),
                matched_length=len(match.group()),
                redacted_value=_redact(match.group(), ftype),
                description=desc,
            )
        )
        categories.add(category)

    # Credentials — always high confidence
    for pat, ftype, sev, cat, desc in [
        (OPENAI_KEY_RE, "API_KEY", "CRITICAL", "CREDENTIAL", "OpenAI/API key detected"),
        (GITHUB_KEY_RE, "API_KEY", "CRITICAL", "CREDENTIAL", "GitHub token detected"),
        (AWS_KEY_RE, "API_KEY", "CRITICAL", "CREDENTIAL", "AWS access key detected"),
        (BEARER_RE, "BEARER_TOKEN", "CRITICAL", "CREDENTIAL", "Bearer token detected"),
    ]:
        for m in pat.finditer(text):
            add_match(m, ftype, sev, cat, desc)

    for m in PASSWORD_KW_RE.finditer(text):
        add_match(m, "PASSWORD", "HIGH", "CREDENTIAL", "Password or secret assignment in text")

    # PII — stricter
    for m in EMAIL_RE.finditer(text):
        if _email_is_real(m.group()):
            add_match(m, "EMAIL", "MEDIUM", "PII", "Email address in prompt")

    if re.search(r"\b(phone|mobile|call me|whatsapp|contact)\b", text, re.I):
        for m in PHONE_STRONG_RE.finditer(text):
            add_match(m, "PHONE", "MEDIUM", "PII", "Phone number with contact context")

    for m in SSN_RE.finditer(text):
        add_match(m, "SSN", "HIGH", "PII", "Social Security Number pattern")

    for pattern, severity, category in INTENT_PHRASES:
        for m in re.finditer(pattern, text, re.I):
            add_match(
                m,
                "INSIDER_THREAT",
                severity,
                category,
                "Suspicious intent: possible unauthorized access or data misuse",
            )

    # Confidential business content
    for pattern, severity, category in CONFIDENTIAL_PHRASES:
        for m in re.finditer(pattern, text, re.I):
            add_match(
                m,
                "CONFIDENTIAL",
                severity,
                category,
                f"Sensitive business content: {category.replace('_', ' ').lower()}",
            )

    if custom_patterns:
        for name, pattern_str, severity in custom_patterns:
            try:
                for m in re.compile(pattern_str, re.I).finditer(text):
                    add_match(m, name, severity, "CUSTOM", f"Organization rule: {name}")
            except re.error:
                pass

    if not findings:
        return ScanResult(
            risk_score=0,
            risk_level="none",
            findings=[],
            categories=[],
            has_critical=False,
            risk_reasons=["No sensitive patterns detected — normal AI usage"],
        )

    # Down-rank if clearly benign and only weak findings (never drop insider-threat)
    if benign:
        findings = [
            f for f in findings
            if f.severity in ("CRITICAL", "HIGH") or f.type == "INSIDER_THREAT"
        ]
        if not findings:
            return ScanResult(
                risk_score=0,
                risk_level="none",
                findings=[],
                categories=[],
                has_critical=False,
                risk_reasons=["Routine prompt — benign intent, no secrets detected"],
            )

    # Deduplicate by type (keep highest severity per type)
    by_type: dict[str, Finding] = {}
    for f in findings:
        prev = by_type.get(f.type)
        if not prev or SEVERITY_WEIGHT.get(f.severity, 0) > SEVERITY_WEIGHT.get(prev.severity, 0):
            by_type[f.type] = f
    findings = list(by_type.values())

    base = max(SEVERITY_WEIGHT.get(f.severity, 10) for f in findings)
    # Smaller bump for multiple findings (avoid 100 on two MEDIUM emails)
    risk_score = min(100, base + min(15, 3 * (len(findings) - 1)))
    has_critical = any(f.severity == "CRITICAL" for f in findings)

    if has_critical:
        risk_level = "critical"
    elif risk_score >= 65:
        risk_level = "high"
    elif risk_score >= 35:
        risk_level = "medium"
    elif risk_score >= 15:
        risk_level = "low"
    else:
        risk_level = "none"
        risk_score = 0

    risk_reasons = list({f.description for f in findings if f.description})
    if risk_level == "none":
        risk_reasons = ["Low-confidence signals only — treated as normal usage"]

    return ScanResult(
        risk_score=risk_score,
        risk_level=risk_level,
        findings=findings,
        categories=sorted(categories),
        has_critical=has_critical,
        risk_reasons=risk_reasons,
    )


DLP_FIXTURES = [
    {"id": "email", "prompt": "My work email is employee@northwind.io please contact me", "expected_severity": "MEDIUM", "expected_types": ["EMAIL"]},
    {"id": "openai_key", "prompt": "key sk-test1234567890abcdef0123456789", "expected_severity": "CRITICAL", "expected_types": ["API_KEY"]},
    {"id": "phone_in", "prompt": "call me at +91-9876543210", "expected_severity": "MEDIUM", "expected_types": ["PHONE"]},
    {"id": "ssn_us", "prompt": "SSN is 123-45-6789", "expected_severity": "HIGH", "expected_types": ["SSN"]},
    {"id": "clean", "prompt": "What is the weather today?", "expected_severity": "NONE", "expected_types": []},
    {"id": "benign_code", "prompt": "Help me write a Python function to sort a list", "expected_severity": "NONE", "expected_types": []},
    {"id": "confidential", "prompt": "This is confidential: our Q4 revenue forecast is 2M", "expected_severity": "HIGH", "expected_types": ["CONFIDENTIAL"]},
    {
        "id": "insider_threat",
        "prompt": "so this is my employee id : IjkGh111400 i want manipulate so i can easliy access my boss data",
        "expected_severity": "HIGH",
        "expected_types": ["INSIDER_THREAT"],
    },
]
