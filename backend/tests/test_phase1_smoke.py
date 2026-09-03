"""
Phase 1 / Phase 5 smoke regressions — schemas, helpers, enricher shapes.
Run: pytest -q
"""

import pytest
from pydantic import ValidationError

from app.schemas.analyze import AnalyzeRequest, DomainReputationResponse
from app.services.risk_engine import map_threat_level, map_severity
from app.services.remediation import merge_remediation_actions


def test_email_type_accepted_in_analyze_request():
    req = AnalyzeRequest(source="dashboard", type="email", content="base64payload")
    assert req.type == "email"


def test_history_audit_source_accepted():
    req = AnalyzeRequest(source="history_audit", type="url", content="http://example.com")
    assert req.source == "history_audit"


def test_invalid_type_rejected():
    with pytest.raises(ValidationError):
        AnalyzeRequest(source="dashboard", type="not-a-type", content="x")  # type: ignore[arg-type]


def test_map_threat_level_shared_helper():
    assert map_threat_level(10) == "Safe"
    assert map_threat_level(45) == "Suspicious"
    assert map_threat_level(80) == "High Risk"
    assert map_severity("High Risk") == "Critical"


def test_remediation_merges_without_overwrite():
    merged = merge_remediation_actions(
        ["Change password now"],
        "phishing",
        80,
        [],
    )
    assert "Change password now" in merged
    assert len(merged) > 1


def test_domain_reputation_marks_simulated():
    doc = DomainReputationResponse(
        domain="evil.xyz",
        age="2 days",
        risk="High",
        vt_score="14/90 flags",
        is_suspicious_tld=True,
        ssl_valid=False,
    )
    assert doc.simulated is True


@pytest.mark.asyncio
async def test_phishstats_client_returns_dict_or_none(monkeypatch):
    from app.clients import phishstats
    from app.core.config import settings

    monkeypatch.setattr(settings, "PHISHSTATS_API_URL", "")
    assert await phishstats.check("example.com") is None


@pytest.mark.asyncio
async def test_safeprompt_client_returns_none_without_key(monkeypatch):
    from app.clients import safeprompt
    from app.core.config import settings

    monkeypatch.setattr(settings, "SAFEPROMPT_API_KEY", "")
    assert await safeprompt.check("hello") is None
