"""
CyberSentinel AI — Phishing Analysis Service (3-Tier Architecture)
Tier 1: Remote ML (/predict/text) or lexical heuristics
Tier 2: Remote ML enrichment when HF_API_URL is set
Tier 3: Advanced Gemini Analysis with Structured JSON Output
"""

import asyncio
from loguru import logger
import google.generativeai as genai

from app.core.config import settings
from app.services.threat_router import ThreatDecision
from app.schemas.analyze import ExternalFlags
from app.core.prompts import PHISHING_SYSTEM_INSTRUCTION
from app.schemas.gemini_outputs import PhishingAnalysisOutput

# --- API Key Management (from chat_service pattern) ---
_API_KEYS = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
_CURRENT_KEY_INDEX = 0

def _get_next_api_key() -> str:
    global _CURRENT_KEY_INDEX
    if not _API_KEYS:
         raise ValueError("No Gemini API keys configured.")
    key = _API_KEYS[_CURRENT_KEY_INDEX]
    _CURRENT_KEY_INDEX = (_CURRENT_KEY_INDEX + 1) % len(_API_KEYS)
    return key


# === TIER 1: BASIC (Remote ML or lexical heuristics) ===
_PHISH_HINTS = (
    "verify your account", "urgent", "suspended", "click here", "password",
    "confirm your identity", "unusual activity", "limited time", "act now",
    "wire transfer", "gift card", "crypto wallet",
)

async def evaluate_tier_1_basic(text: str) -> dict:
    """
    Tier 1: Prefer remote ML (/predict/text) when HF_API_URL is set.
    Otherwise use lightweight lexical heuristics (Gemini-only free deploy).
    """
    from app.clients import hf_ml

    remote = await hf_ml.predict_text(text)
    if remote:
        return remote

    # Local models are intentionally not loaded on free-tier hosts (OOM).
    lower = (text or "").lower()
    hits = sum(1 for h in _PHISH_HINTS if h in lower)
    score = min(95, hits * 18)
    flagged = score >= 54
    return {
        "flagged": flagged,
        "score": score,
        "label": "PHISHING" if flagged else "SAFE",
        "source": "heuristic",
    }


# === TIER 2: MODERATE (Remote HF when configured) ===
async def evaluate_tier_2_moderate(text: str) -> dict:
    """
    Tier 2: Remote ML enrichment when HF_API_URL is set; otherwise no-op safe.
    """
    from app.clients import hf_ml

    remote = await hf_ml.predict_text(text)
    if remote:
        return remote
    return {"confidence": 0.0, "label": "SAFE", "hf_score": 0.0, "source": "unavailable"}


# === TIER 3: ADVANCED (Gemini LLM) ===
async def evaluate_tier_3_advanced(text: str) -> PhishingAnalysisOutput:
    """
    Tier 3: Full semantic analysis using Gemini. Forces output to match our strict JSON Schema.
    """
    if settings.USE_MOCK_AGENTS:
        from app.clients.mock_tier3 import mock_phishing_output
        return mock_phishing_output()

    if not _API_KEYS:
        # Fallback dummy if no keys
        return PhishingAnalysisOutput(
            risk_level="MEDIUM", risk_score=50, phishing_probability=0.5, confidence_score=0.9,
            threat_category="Unknown", is_phishing=True, explanation="API offline.", domain_analysis={"domain_mismatch": False, "domain_age_signal": "Unknown"}
        )

    for attempt in range(len(_API_KEYS)):
        current_key = _get_next_api_key()
        try:
            genai.configure(api_key=current_key)
            sys_instr = f"{PHISHING_SYSTEM_INSTRUCTION}\n\nRespond EXACTLY with this JSON schema:\n{PhishingAnalysisOutput.model_json_schema()}"
            
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                system_instruction=sys_instr
            )
            
            # Request JSON schema response
            response = await asyncio.to_thread(
                model.generate_content,
                text,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            
            if response.text:
                return PhishingAnalysisOutput.model_validate_json(response.text)
                
        except Exception as e:
             error_str = str(e).lower()
             if "429" in error_str or "quota" in error_str:
                 continue
             logger.error(f"Tier 3 Gemini Error: {e}")
             break
             
    # Default fallback
    return PhishingAnalysisOutput(
        risk_level="LOW", risk_score=0, phishing_probability=0.0, confidence_score=0.0,
        threat_category="Benign", is_phishing=False, explanation="Analysis failed.", domain_analysis={"domain_mismatch": False, "domain_age_signal": "Unknown"}
    )


# === ORCHESTRATOR ===
async def analyze_text(content: str, tier: str = "auto") -> ThreatDecision:
    """Execute the 3-Tier engine pipeline synchronously for Phishing or isolated tiers."""
    from app.clients import phishstats
    
    logger.info(f"📧 Phishing Analysis: length={len(content)} chars tier={tier}")
    snippet = content[:200]
    
    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 Custom ML Analysis...")
        t1_result = await evaluate_tier_1_basic(content)
        risk_score = t1_result.get("score", 0)
        is_phishing = t1_result.get("flagged", False)
        return ThreatDecision(
            threat_type="phishing" if is_phishing else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=0.8 if is_phishing else 0.5,
            explanation=f"Tier 1 Custom ML: {'Phishing detected' if is_phishing else 'No threat detected'}.",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier1_ml_score": risk_score}
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 HuggingFace Analysis...")
        t2_result = await evaluate_tier_2_moderate(content)
        risk_score = int(t2_result.get("hf_score", 0))
        is_phishing = t2_result.get("label") == "PHISHING"
        return ThreatDecision(
            threat_type="phishing" if is_phishing else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t2_result.get("confidence", 0.5),
            explanation=f"Tier 2 HF Text Validation: {t2_result.get('label', 'SAFE')}",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier2_hf_score": risk_score, "tier2_hf_label": t2_result.get("label", "SAFE")}
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        t3_result = await evaluate_tier_3_advanced(content)
        risk_score = t3_result.risk_score
        return ThreatDecision(
            threat_type="phishing" if t3_result.is_phishing else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t3_result.confidence_score,
            indicators=[ioc.value for ioc in getattr(t3_result, 'indicators_of_compromise', [])],
            explanation=t3_result.explanation,
            key_points=[f.description for f in getattr(t3_result, 'feature_importance', [])],
            recommended_actions=getattr(t3_result, 'mitigation_steps', []),
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis=t3_result.model_dump()
        )

    # --- AUTO ORCHESTRATION ---
    # 1. TIER 1 Execute
    t1_result = await evaluate_tier_1_basic(content)
    if t1_result["flagged"]:
        # If Tier 1 definitive block, we can fail fast here (future implementation).
        pass

    # 2. TIER 2 & External APIs Execute concurrently
    t2_task = evaluate_tier_2_moderate(content)
    ps_task = phishstats.check(content)
    
    t2_result, ps_result = await asyncio.gather(t2_task, ps_task, return_exceptions=True)
    
    ps_flagged = False
    if not isinstance(ps_result, Exception) and ps_result and ps_result.get("found"):
        ps_flagged = True
        
    external_flags = ExternalFlags(phishstats_flagged=ps_flagged) if ps_flagged else None

    # 3. TIER 3 Execute (Always runs in this architecture to generate UI JSON)
    t3_result: PhishingAnalysisOutput = await evaluate_tier_3_advanced(content)
    
    # 4. FUSE RESULTS
    t2_score = 0
    t2_label = "SAFE"
    if not isinstance(t2_result, Exception) and isinstance(t2_result, dict):
        t2_score = t2_result.get("hf_score", 0)
        t2_label = t2_result.get("label", "SAFE")
    
    t1_score = t1_result.get("score", 0)
    
    # If Tier 3 failed (confidence 0), rely on Tier 1 + Tier 2
    if t3_result.confidence_score == 0.0 and (t1_score > 0 or t2_score > 0):
        logger.warning("⚠️ Tier 3 Gemini offline, falling back to Tier 1+2 scores")
        risk_score = max(t1_score, int(t2_score))
        is_phishing = t1_result.get("flagged", False) or t2_label == "PHISHING"
        threat_type = "phishing" if is_phishing else "benign"
        threat_level = "High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe"
        severity_label = "Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational"
        explanation = f"AI Engine Analysis (Tier 1 ML: {t1_score}%, Tier 2 HF: {t2_label} {t2_score:.0f}%). Gemini was unavailable."
        
        return ThreatDecision(
            threat_type=threat_type,
            risk_score=risk_score,
            threat_level=threat_level,
            confidence=0.7 if is_phishing else 0.5,
            indicators=[],
            explanation=explanation,
            key_points=[f"ML Model Score: {t1_score}%", f"HuggingFace: {t2_label}"],
            recommended_actions=["Exercise caution", "Verify the source independently"],
            external_flags=external_flags,
            severity_label=severity_label,
            advanced_analysis={"tier1_ml_score": t1_score, "tier2_hf_label": t2_label, "tier3_status": "offline"}
        )
    
    # Normal path: Tier 3 succeeded
    risk_score = t3_result.risk_score
    
    # Boost risk if Tier 1 ML strongly disagrees (ML says phishing but Gemini says low risk)
    if t1_score > 80 and risk_score < 50:
        risk_score = max(risk_score, t1_score - 10)
        logger.info(f"⚡ Tier 1 ML boosted risk score from {t3_result.risk_score} to {risk_score}")
    
    threat_level = "High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe"
    severity_label = "Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational"
    threat_type = "phishing" if t3_result.is_phishing else "benign"
    
    # Map tier 3 structured outputs to our ThreatDecision format
    indicators = [ioc.value for ioc in t3_result.indicators_of_compromise]
    key_points = [f.description for f in t3_result.feature_importance]
    
    # Also attach the raw T3 Pydantic dump for premium UI rendering + ML scores
    advanced_json = t3_result.model_dump()
    advanced_json["tier1_ml_score"] = t1_score
    advanced_json["tier2_hf_label"] = t2_label
    
    return ThreatDecision(
        threat_type=threat_type,
        risk_score=risk_score,
        threat_level=threat_level,
        confidence=t3_result.confidence_score,
        indicators=indicators,
        explanation=t3_result.explanation,
        key_points=key_points,
        recommended_actions=t3_result.mitigation_steps,
        external_flags=external_flags,
        severity_label=severity_label,
        advanced_analysis=advanced_json
    )
