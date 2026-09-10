"""
CyberSentinel AI — URL Analysis Service
Full pipeline: Local heuristics / HF ML + Gemini URL + Safe Browsing + VirusTotal
→ Risk Fusion → Explain → Recommend.
"""

import asyncio
from loguru import logger

from app.services.threat_router import ThreatDecision
from app.services.risk_engine import score_url, map_threat_level, map_severity
from app.services.ml_url_engine import ml_engine
from app.services.url_heuristics import analyze_url_heuristics


def _local_explanation(risk_score: int, indicators: list, degraded: bool) -> dict:
    if risk_score >= 70:
        summary = "High-risk URL signals detected."
        actions = [
            "Do not enter credentials or payment details on this page.",
            "Close the tab if this visit was unexpected.",
            "Report the URL to your security team.",
        ]
    elif risk_score >= 40:
        summary = "Suspicious URL signals detected — proceed with caution."
        actions = [
            "Verify the domain carefully before continuing.",
            "Avoid sharing sensitive information.",
        ]
    else:
        summary = "No strong malicious URL signals from local analysis."
        actions = ["Monitor as usual."]

    if degraded:
        summary = f"{summary} (AI analysis unavailable — local heuristics used.)"

    key_points = indicators[:5] if indicators else [
        "Local URL heuristics evaluated hostname and path patterns."
    ]
    return {"summary_text": summary, "key_points": key_points, "actions": actions}


def _merge_indicators(*groups) -> list:
    seen = set()
    out = []
    for group in groups:
        for item in group or []:
            if not item or item in seen:
                continue
            seen.add(item)
            out.append(item)
    return out


async def analyze_url(url: str, tier: str = "auto") -> ThreatDecision:
    """Run the complete URL analysis pipeline or isolated tiers."""
    from app.clients import gemini_url, gemini_explanation, gemini_recommendation
    from app.clients import google_safe_browsing, virustotal

    logger.info(f"🔗 URL Analysis: url={url[:80]} tier={tier}")
    snippet = url[:200]
    local = analyze_url_heuristics(url)
    heuristic_score = int(local.get("risk_score", 0))

    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 Custom ML Analysis...")
        ml_risk_score = 0
        feature_map = {}
        try:
            prob, feature_map = await ml_engine.evaluate_url(url)
            ml_risk_score = int(prob * 100)
            logger.info(f"⚡ URL ML Tier 1 Score: {ml_risk_score}%")
        except Exception as e:
            logger.error(f"URL ML Tier 1 failed: {e}")
            ml_risk_score = heuristic_score
            feature_map = {"local_heuristics": local, "source": "heuristics-fallback"}

        indicators = _merge_indicators(
            feature_map.get("indicators"),
            (feature_map.get("local_heuristics") or {}).get("indicators"),
            local.get("indicators"),
        )
        threat_level = map_threat_level(ml_risk_score)
        return ThreatDecision(
            threat_type="malicious_url" if ml_risk_score > 30 else "benign",
            risk_score=ml_risk_score,
            threat_level=threat_level,
            confidence=float(local.get("confidence", 0.6)),
            indicators=indicators,
            explanation=(
                f"Tier 1 local/ML: {'policy or malicious URL signals' if ml_risk_score > 30 else 'no strong threat'}."
            ),
            severity_label=map_severity(threat_level),
            advanced_analysis={"tier1_ml_score": ml_risk_score, "ml_features": feature_map},
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 External Threat Intel Analysis...")
        sb_result, vt_result = await asyncio.gather(
            google_safe_browsing.check(url),
            virustotal.scan(url),
            return_exceptions=True,
        )
        if isinstance(sb_result, Exception):
            sb_result = None
        if isinstance(vt_result, Exception):
            vt_result = None

        vt_positives = vt_result.get("positives") if isinstance(vt_result, dict) else None
        vt_total = vt_result.get("total") if isinstance(vt_result, dict) else None
        risk = score_url(None, sb_result, vt_positives, vt_total, heuristic_score=heuristic_score)

        external_flags = {}
        if sb_result:
            external_flags["safe_browsing"] = sb_result
        if vt_result and isinstance(vt_result, dict):
            external_flags["virustotal_positives"] = vt_positives
            external_flags["virustotal_total_engines"] = vt_total

        return ThreatDecision(
            threat_type="malicious_url" if risk.risk_score > 30 else "benign",
            risk_score=risk.risk_score,
            threat_level=risk.threat_level,
            confidence=0.8,
            indicators=local.get("indicators", []),
            explanation=f"Tier 2 external intel analysis (SB/VT) + heuristics: {risk.threat_level}",
            external_flags=external_flags if external_flags else None,
            severity_label=risk.severity_label,
            advanced_analysis={"tier2_external_intel": True, "heuristics": local},
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        gemini_result = await gemini_url.analyze(url)
        risk = score_url(gemini_result, None, None, None, heuristic_score=heuristic_score)
        indicators = _merge_indicators(
            (gemini_result or {}).get("indicators"),
            local.get("indicators"),
        )
        threat_type = (gemini_result or {}).get("threat_type") or local.get("threat_type") or "malicious_url"
        confidence = float((gemini_result or {}).get("confidence") or local.get("confidence") or 0.5)
        degraded = gemini_result is None
        expl = _local_explanation(risk.risk_score, indicators, degraded)

        return ThreatDecision(
            threat_type=threat_type if risk.risk_score > 30 else "benign",
            risk_score=risk.risk_score,
            threat_level=risk.threat_level,
            confidence=confidence,
            indicators=indicators,
            explanation=expl["summary_text"],
            key_points=expl["key_points"],
            recommended_actions=expl["actions"],
            severity_label=risk.severity_label,
            advanced_analysis={"tier3_gemini": bool(gemini_result), "heuristics": local, "degraded": degraded},
        )

    # --- AUTO ORCHESTRATION ---
    ml_risk_score = 0
    feature_map: dict = {}
    try:
        prob, feature_map = await ml_engine.evaluate_url(url)
        ml_risk_score = int(prob * 100)
        logger.info(f"⚡ URL ML Tier 1 Score: {ml_risk_score}%")
    except Exception as e:
        logger.error(f"URL ML Tier 1 failed: {e}")
        ml_risk_score = heuristic_score
        feature_map = {"local_heuristics": local, "source": "heuristics-fallback"}

    gemini_result, sb_result, vt_result = await asyncio.gather(
        gemini_url.analyze(url),
        google_safe_browsing.check(url),
        virustotal.scan(url),
        return_exceptions=True,
    )

    if isinstance(gemini_result, Exception):
        logger.warning(f"Gemini URL agent failed: {gemini_result}")
        gemini_result = None
    if isinstance(sb_result, Exception):
        logger.warning(f"Safe Browsing failed: {sb_result}")
        sb_result = None
    if isinstance(vt_result, Exception):
        logger.warning(f"VirusTotal failed: {vt_result}")
        vt_result = None

    # Prefer stronger of ML / pure heuristics for fusion input
    fused_heuristic = max(heuristic_score, ml_risk_score)

    vt_positives = vt_result.get("positives") if isinstance(vt_result, dict) else None
    vt_total = vt_result.get("total") if isinstance(vt_result, dict) else None
    risk = score_url(
        gemini_result,
        sb_result,
        vt_positives,
        vt_total,
        heuristic_score=fused_heuristic,
    )

    if ml_risk_score > 0:
        risk.risk_score = max(risk.risk_score, ml_risk_score)
        risk.threat_level = map_threat_level(risk.risk_score)
        risk.severity_label = map_severity(risk.threat_level)

    indicators = _merge_indicators(
        (gemini_result or {}).get("indicators") if isinstance(gemini_result, dict) else [],
        feature_map.get("indicators"),
        (feature_map.get("local_heuristics") or {}).get("indicators"),
        local.get("indicators"),
    )

    if isinstance(gemini_result, dict) and gemini_result.get("threat_type"):
        threat_type = gemini_result["threat_type"]
    else:
        threat_type = local.get("threat_type") or (
            "malicious_url" if risk.risk_score > 30 else "benign"
        )

    if isinstance(gemini_result, dict) and gemini_result.get("confidence") is not None:
        confidence = float(gemini_result.get("confidence", 0.5))
    else:
        confidence = float(local.get("confidence", 0.55))

    degraded = gemini_result is None
    local_expl = _local_explanation(risk.risk_score, indicators, degraded)

    explanation_result = await gemini_explanation.explain(
        threat_type=threat_type,
        risk_score=risk.risk_score,
        indicators=indicators,
        raw_input_snippet=snippet,
    )
    if (
        not explanation_result
        or explanation_result.get("summary_text") in (None, "", "Analysis completed.")
        or degraded
    ):
        # Prefer honest local copy when Gemini is down or returned stub text
        if degraded or explanation_result.get("summary_text") == "Analysis completed.":
            explanation_result = {
                "summary_text": local_expl["summary_text"],
                "key_points": local_expl["key_points"],
            }

    recommendation_result = await gemini_recommendation.recommend(
        threat_type=threat_type,
        risk_score=risk.risk_score,
        indicators=indicators,
        raw_input_snippet=snippet,
    )
    stub_actions = ["No action required. Content appears safe."]
    if (
        degraded
        or not recommendation_result
        or recommendation_result.get("actions") == stub_actions
    ):
        recommendation_result = {"actions": local_expl["actions"]}

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
        explanation=explanation_result.get("summary_text", local_expl["summary_text"]),
        key_points=explanation_result.get("key_points", local_expl["key_points"]),
        recommended_actions=recommendation_result.get("actions", local_expl["actions"]),
        external_flags=external_flags if external_flags else None,
        severity_label=risk.severity_label,
        advanced_analysis={
            "tier1_ml_score": ml_risk_score,
            "ml_features": feature_map,
            "tier3_gemini": bool(gemini_result),
            "heuristics": local,
            "degraded": degraded,
        },
    )
