import pytest
from app.services.risk_engine import score_text, score_url, score_prompt, score_deepfake

def test_score_text():
    # Test safe text
    # llm_score = 10, phishstats_flagged = False
    # final = 0.8 * 10 + 0 = 8
    result = score_text({"risk_score": 10}, phishstats_flagged=False)
    assert result.risk_score == 8
    assert result.threat_level == "Safe"

    # Test malicious text with phishstats hit
    # llm_score = 90, phishstats_flagged = True
    # ps_boost = 20, final = 0.8 * 90 + 0.2 * 20 = 72 + 4 = 76
    result = score_text({"risk_score": 90}, phishstats_flagged=True)
    assert result.risk_score == 76
    assert result.threat_level == "High Risk"

def test_score_url():
    # Test clean url
    # llm = 10, final = 0.5 * 10 = 5
    result = score_url({"risk_score": 10}, safe_browsing=None, virustotal_positives=0)
    assert result.risk_score == 5
    
    # Test VT hit
    # llm_score = 80, safe_browsing = "MALWARE", virustotal_positives=50, total=90
    # vt_ratio = 50/90, vt_boost = int(50/90*200) = 111 -> capped 100
    # final = 0.5*80 + 0.25*100 + 0.15*100 = 40 + 25 + 15 = 80
    result = score_url({"risk_score": 80}, safe_browsing="MALWARE", virustotal_positives=50, virustotal_total_engines=90)
    assert result.risk_score == 80

def test_score_prompt():
    # Test SafePrompt category override
    # llm_score = 80, safeprompt_risk="high" -> sp_boost = 25
    # final = 0.8 * 80 + 0.2 * 25 = 64 + 5 = 69
    result = score_prompt({"risk_score": 80}, safeprompt_risk="high")
    assert result.risk_score == 69
    assert result.threat_level == "High Risk"

    # Test baseline
    # llm = 80, sp_boost=0, final = 0.8*80 = 64
    result = score_prompt({"risk_score": 80})
    assert result.risk_score == 64

def test_score_deepfake():
    # Test Hive AI flag
    # llm = 80, hive class = manipulated -> hive_score = 80
    # final = 0.6*80 + 0.4*80 = 48 + 32 = 80
    result = score_deepfake({"risk_score": 80}, hive_result={"classification": "manipulated"})
    assert result.risk_score == 80
    
    # Test baseline
    # llm = 50, hive = None, final = 0.6 * 50 = 30
    result = score_deepfake({"risk_score": 50}, hive_result=None)
    assert result.risk_score == 30
