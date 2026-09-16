"""Unit tests for local URL heuristics (no network)."""

from app.services.url_heuristics import analyze_url_heuristics
from app.services.risk_engine import score_url


def test_adult_host_high_risk():
    r = analyze_url_heuristics("https://www.pornhub.org/categories")
    assert r["risk_score"] >= 70
    assert r["category"] == "adult"
    assert any("Adult" in i or "NSFW" in i for i in r["indicators"])


def test_phishing_like_host():
    r = analyze_url_heuristics("https://paypa1-secure-login.tk/verify")
    assert r["risk_score"] >= 70
    assert r["category"] == "phishing"


def test_benign_popular_sites():
    for url in ("https://www.google.com/", "https://github.com/"):
        r = analyze_url_heuristics(url)
        assert r["risk_score"] < 30
        assert r["threat_type"] == "benign"


def test_fusion_prefers_heuristic_when_llm_missing():
    r = score_url(None, None, None, None, heuristic_score=72)
    assert r.risk_score >= 70
    assert r.threat_level == "High Risk"


def test_fusion_does_not_let_zero_llm_wipe_heuristics():
    r = score_url(
        {"risk_score": 0, "threat_type": "benign"},
        None,
        None,
        None,
        heuristic_score=72,
    )
    assert r.risk_score >= 70
