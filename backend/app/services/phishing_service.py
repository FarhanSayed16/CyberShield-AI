"""
CyberSentinel AI — Phishing Analysis Service (3-Tier Architecture)
Tier 1: Basic Custom Model (Placeholder)
Tier 2: Local HuggingFace ML
Tier 3: Advanced Gemini Analysis with Structured JSON Output
"""

import asyncio
import json
import re
from loguru import logger
from fastapi import HTTPException
import google.generativeai as genai
import numpy as np

from app.core.feature_extractors import extract_text_features

from app.core.config import settings
from app.services.threat_router import ThreatDecision
from app.schemas.analyze import ExternalFlags
from app.core.ai_models import ai_manager
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


# === TIER 1: BASIC (Fast Custom ML Model) ===
def evaluate_tier_1_basic(text: str) -> dict:
    """
    Tier 1: Ultra-fast initial triage using the custom BernoulliNB model.
    Checks manual signal heuristics + TF-IDF vocabulary.
    """
    if not ai_manager.phishing_text_model or not ai_manager.phishing_text_preprocessor:
        return {"flagged": False, "score": 0}

    try:
        # 1. Extract 18 signal features
        signal_features = extract_text_features(text)  # shape (1, 18)
        
        # 2. Extract TF-IDF features
        tfidf_features = ai_manager.phishing_text_preprocessor.tfidf.transform([text]).toarray()
        
        # 3. Concatenate (signal features MUST be first, according to the pipeline training) 
        # Wait, how were they concatenated during training? Usually `FeatureUnion` concats them.
        # Let's assume pipeline did: [signals, tfidf] or we check if sizes match 390 + 18 = 408.
        # Actually `BernoulliNB` trained on pure TF-IDF or combined? The metadata says: 
        # "tfidf_vocab_size": 390, "signal_features": [...] 18 features. Total 408.
        final_features = np.hstack((signal_features, tfidf_features))
        
        # 4. Predict
        proba = ai_manager.phishing_text_model.predict_proba(final_features)[0]
        malice_prob = proba[1]  # Assuming class 1 is phishing
        
        is_phishing = malice_prob > 0.8
        
        return {
            "flagged": is_phishing,
            "score": int(malice_prob * 100),
            "label": "PHISHING" if is_phishing else "SAFE"
        }
    except Exception as e:
        logger.error(f"Tier 1 ML Error: {e}")
        return {"flagged": False, "score": 0}


# === TIER 2: MODERATE (Local HuggingFace Pipeline or Remote HF Space) ===
async def evaluate_tier_2_moderate(text: str) -> dict:
    """
    Tier 2: Run the specialized local Hugging Face transformer pipeline, or route to remote HF Space.
    """
    if ai_manager.phishing_pipe:
        try:
            hf_result = await asyncio.to_thread(ai_manager.phishing_pipe, text)
            if hf_result:
                label = str(hf_result[0]['label']).upper()
                score = float(hf_result[0]['score'])
                is_phish = "PHISH" in label or "1" in label or "MALICIOUS" in label
                return {
                    "confidence": score,
                    "label": "PHISHING" if is_phish else "SAFE",
                    "hf_score": (score * 100) if is_phish else ((1.0 - score) * 100)
                }
        except Exception as e:
            logger.error(f"HF Tier 2 Error: {e}")
            
    elif settings.HF_SPACE_URL:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                api_url = f"{settings.HF_SPACE_URL.rstrip('/')}/predict/text"
                res = await client.post(api_url, json={"text": text})
                res.raise_for_status()
                data = res.json()
                is_phish = data.get("is_phishing", False)
                score = float(data.get("risk_score", 0.0))
                return {
                    "confidence": 0.8,
                    "label": "PHISHING" if is_phish else "SAFE",
                    "hf_score": score
                }
        except Exception as e:
            logger.warning(f"Remote HF Space Phishing Error: {e}")
            
    return {"confidence": 0.0, "label": "SAFE", "hf_score": 0.0}


# === TIER 3: ADVANCED (Gemini LLM) ===
async def evaluate_tier_3_advanced(text: str) -> PhishingAnalysisOutput:
    """
    Tier 3: Full semantic analysis using Gemini. Forces output to match our strict JSON Schema.
    """
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
        t1_result = evaluate_tier_1_basic(content)
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
    t1_result = evaluate_tier_1_basic(content)
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
