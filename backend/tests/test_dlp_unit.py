"""Phase 6 — DLP unit fixtures (no HTTP)."""

from app.services.dlp import DLP_FIXTURES, scan_prompt


def test_openai_key_critical():
    r = scan_prompt("my api key is sk-test1234567890abcdef0123456789")
    assert r.risk_level == "critical"
    assert r.has_critical


def test_clean_prompt():
    r = scan_prompt("What is the weather today?")
    assert r.risk_level == "none"
    assert r.risk_score == 0


def test_benign_coding():
    r = scan_prompt("Help me write a Python function to sort a list of numbers")
    assert r.risk_level == "none"


def test_ssn_high():
    r = scan_prompt("SSN is 123-45-6789")
    assert r.risk_level in ("high", "critical")


def test_dlp_fixtures_matrix():
    for fx in DLP_FIXTURES:
        r = scan_prompt(fx["prompt"])
        if fx["expected_severity"] == "NONE":
            assert r.risk_level == "none", fx["id"]
        else:
            assert r.risk_level == fx["expected_severity"].lower(), f"{fx['id']}: got {r.risk_level}"
