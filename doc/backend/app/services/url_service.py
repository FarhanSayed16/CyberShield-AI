"""
CyberSentinel AI — URL Analysis Service
Full pipeline: Gemini URL agent + Safe Browsing + VirusTotal → Risk Fusion → Explain → Recommend.
"""

import asyncio
from loguru import logger

from app.services.threat_router import ThreatDecision
from app.services.risk_engine import score_url
from app.core.ai_models import ai_manager
from app.services.ml_url_engine import ml_engine


async def analyze_url(url: str, tier: str = "auto") -> ThreatDecision:
    """Run the complete URL analysis pipeline or isolated tiers."""
    from app.clients import gemini_url, gemini_explanation, gemini_recommendation
    from app.clients import google_safe_browsing, virustotal

    logger.info(f"🔗 URL Analysis: url={url[:80]} tier={tier}")
    snippet = url[:200]

    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 Custom ML Analysis...")
        # Step 0: Fast ML Validation (Tier 1)
        ml_risk_score = 0
        feature_map = {}
        try:
            prob, feature_map = ml_engine.evaluate_url(url)
            ml_risk_score = int(prob * 100)
        except Exception as e:
            logger.error(f"URL ML Tier 1 failed: {e}")
        
        return ThreatDecision(
            threat_type="malicious_url" if ml_risk_score > 50 else "benign",
            risk_score=ml_risk_score,
            threat_level="High Risk" if ml_risk_score >= 70 else "Suspicious" if ml_risk_score >= 30 else "Safe",
            confidence=0.8 if ml_risk_score > 50 else 0.5,
            explanation=f"Tier 1 Local ML: {'Malicious URL detected' if ml_risk_score > 50 else 'No threat detected'}.",
            severity_label="Critical" if ml_risk_score >= 80 else "Warning" if ml_risk_score >= 40 else "Informational",
            advanced_analysis={"tier1_ml_score": ml_risk_score, "ml_features": feature_map}
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 External Threat Intel Analysis...")
        # Step 1: Call External APIs IN PARALLEL
        sb_result, vt_result = await asyncio.gather(
            google_safe_browsing.check(url),
            virustotal.scan(url),
            return_exceptions=True,
        )
        if isinstance(sb_result, Exception): sb_result = None
        if isinstance(vt_result, Exception): vt_result = None

        vt_positives = vt_result.get("positives") if isinstance(vt_result, dict) else None
        vt_total = vt_result.get("total") if isinstance(vt_result, dict) else None
        risk = score_url(None, sb_result, vt_positives, vt_total)

        external_flags = {}
        if sb_result: external_flags["safe_browsing"] = sb_result
        if vt_result and isinstance(vt_result, dict):
            external_flags["virustotal_positives"] = vt_positives
            external_flags["virustotal_total_engines"] = vt_total

        return ThreatDecision(
            threat_type="malicious_url" if risk.risk_score > 30 else "benign",
            risk_score=risk.risk_score,
            threat_level=risk.threat_level,
            confidence=0.8,
            explanation=f"Tier 2 external intel analysis (SB/VT): {risk.threat_level}",
            external_flags=external_flags if external_flags else None,
            severity_label=risk.severity_label,
            advanced_analysis={"tier2_external_intel": True}
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        gemini_result = await gemini_url.analyze(url)
        if isinstance(gemini_result, Exception): gemini_result = None
        
        risk = score_url(gemini_result, None, None, None)
        indicators = gemini_result.get("indicators", []) if gemini_result else []
        threat_type = gemini_result.get("threat_type", "malicious_url") if gemini_result else "malicious_url"
        confidence = gemini_result.get("confidence", 0.5) if gemini_result else 0.5
        
        return ThreatDecision(
            threat_type=threat_type if risk.risk_score > 30 else "benign",
            risk_score=risk.risk_score,
            threat_level=risk.threat_level,
            confidence=confidence,
            indicators=indicators,
            explanation="Tier 3 Gemini URL static analysis payload run.",
            severity_label=risk.severity_label,
            advanced_analysis={"tier3_gemini": True}
        )

    # --- AUTO ORCHESTRATION ---
    # Step 0: Fast ML Validation (Tier 1)
    ml_risk_score = 0
    feature_map = {}
    try:
        prob, feature_map = ml_engine.evaluate_url(url)
        ml_risk_score = int(prob * 100)
        logger.info(f"⚡ URL ML Tier 1 Score: {ml_risk_score}%")
    except Exception as e:
        logger.error(f"URL ML Tier 1 failed: {e}")

    # Step 1: Call AI agent + external APIs IN PARALLEL
    gemini_result, sb_result, vt_result = await asyncio.gather(
        gemini_url.analyze(url),
        google_safe_browsing.check(url),
        virustotal.scan(url),
        return_exceptions=True,
    )

    # Step 2: Handle failures gracefully
    if isinstance(gemini_result, Exception):
        logger.warning(f"Gemini URL agent failed: {gemini_result}")
        gemini_result = None
    if isinstance(sb_result, Exception):
        logger.warning(f"Safe Browsing failed: {sb_result}")
        sb_result = None
    if isinstance(vt_result, Exception):
        logger.warning(f"VirusTotal failed: {vt_result}")
        vt_result = None

    # Step 3: Fuse into risk score
    vt_positives = vt_result.get("positives") if isinstance(vt_result, dict) else None
    vt_total = vt_result.get("total") if isinstance(vt_result, dict) else None
    risk = score_url(gemini_result, sb_result, vt_positives, vt_total)
    
    # Blend ML Score
    if ml_risk_score > 0:
        # Boost confidence/risk by averaging if ML disagrees, or maxing it if it's very high.
        risk.risk_score = max(risk.risk_score, ml_risk_score)
        if risk.risk_score >= 70:
            risk.threat_level = "High Risk"
            risk.severity_label = "Critical"
        elif risk.risk_score >= 30:
            risk.threat_level = "Suspicious"
            risk.severity_label = "Warning"

    # Step 4: Get indicators from Gemini result
    indicators = gemini_result.get("indicators", []) if gemini_result else []
    threat_type = gemini_result.get("threat_type", "malicious_url") if gemini_result else "malicious_url"
    confidence = gemini_result.get("confidence", 0.5) if gemini_result else 0.5

    # Step 5: Get explanation
    explanation_result = await gemini_explanation.explain(
        threat_type=threat_type,
        risk_score=risk.risk_score,
        indicators=indicators,
        raw_input_snippet=snippet,
    )

    # Step 6: Get recommendation
    recommendation_result = await gemini_recommendation.recommend(
        threat_type=threat_type,
        risk_score=risk.risk_score,
        indicators=indicators,
        raw_input_snippet=snippet,
    )

    # Step 7: Build external flags
    external_flags = {}
    if sb_result and not isinstance(sb_result, Exception):
        external_flags["safe_browsing"] = sb_result
    if vt_result and isinstance(vt_result, dict):
        external_flags["virustotal_positives"] = vt_result.get("positives")
        external_flags["virustotal_total_engines"] = vt_result.get("total")

    return ThreatDecision(
        threat_type=threat_type if risk.risk_score > 30 else "benign",
        risk_score=risk.risk_score,
        threat_level=risk.threat_level,
        confidence=confidence,
        indicators=indicators,
        explanation=explanation_result.get("summary_text", ""),
        key_points=explanation_result.get("key_points", []),
        recommended_actions=recommendation_result.get("actions", []),
        external_flags=external_flags if external_flags else None,
        severity_label=risk.severity_label,
    )
