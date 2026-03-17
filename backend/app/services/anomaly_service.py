"""
CyberSentinel AI — Behavior Anomaly Detection Service (3-Tier Architecture)
Tier 1: Basic Rule Checks (Placeholder)
Tier 2: Light ML / Statistical Baseline (Placeholder)
Tier 3: Advanced Gemini Analysis with Structured JSON Output
"""

import asyncio
from loguru import logger
import google.generativeai as genai

from app.core.config import settings
from app.services.threat_router import ThreatDecision
from app.core.prompts import BEHAVIOR_ANOMALY_SYSTEM_INSTRUCTION
from app.schemas.gemini_outputs import BehaviorAnomalyOutput

_API_KEYS = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
_CURRENT_KEY_INDEX = 0

def _get_next_api_key() -> str:
    global _CURRENT_KEY_INDEX
    if not _API_KEYS:
         raise ValueError("No Gemini API keys configured.")
    key = _API_KEYS[_CURRENT_KEY_INDEX]
    _CURRENT_KEY_INDEX = (_CURRENT_KEY_INDEX + 1) % len(_API_KEYS)
    return key


# === TIER 1: BASIC (Placeholder) ===
def evaluate_tier_1_basic(text: str) -> dict:
    return {"flagged": False, "score": 0}


# === TIER 2: MODERATE (Placeholder) ===
async def evaluate_tier_2_moderate(text: str) -> dict:
    # Future integration: PyOD or simple statistical moving average baseline checks.
    return {"confidence": 0.0, "label": "SAFE", "hf_score": 0.0}


# === TIER 3: ADVANCED (Gemini LLM) ===
async def evaluate_tier_3_advanced(text: str) -> BehaviorAnomalyOutput:
    if not _API_KEYS:
        return BehaviorAnomalyOutput(
            risk_level="MEDIUM", risk_score=50, is_anomaly=False, confidence_score=0.9,
            anomaly_type="None", explanation="API offline.", anomalies_detected=[], recommended_actions=[]
        )

    for attempt in range(len(_API_KEYS)):
        current_key = _get_next_api_key()
        try:
            genai.configure(api_key=current_key)
            sys_instr = f"{BEHAVIOR_ANOMALY_SYSTEM_INSTRUCTION}\n\nRespond EXACTLY with this JSON schema:\n{BehaviorAnomalyOutput.model_json_schema()}"
            
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                system_instruction=sys_instr
            )
            
            response = await asyncio.to_thread(
                model.generate_content,
                text,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            
            if response.text:
                return BehaviorAnomalyOutput.model_validate_json(response.text)
                
        except Exception as e:
             error_str = str(e).lower()
             if "429" in error_str or "quota" in error_str:
                 continue
             logger.error(f"Tier 3 Gemini Error: {e}")
             break
             
    # Default fallback
    return BehaviorAnomalyOutput(
        risk_level="LOW", risk_score=0, is_anomaly=False, confidence_score=0.0,
        anomaly_type="None", explanation="Analysis failed.", anomalies_detected=[], recommended_actions=[]
    )


# === ORCHESTRATOR ===
async def analyze_anomaly(content: str, tier: str = "auto") -> ThreatDecision:
    """Execute the 3-Tier engine pipeline synchronously for Behavior Anomalies."""
    logger.info(f"🕵️‍♂️ Behavior Anomaly Analysis: length={len(content)} chars tier={tier}")
    
    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 Custom ML Analysis...")
        t1_result = evaluate_tier_1_basic(content)
        risk_score = t1_result.get("score", 0)
        is_anomaly = t1_result.get("flagged", False)
        return ThreatDecision(
            threat_type="behavior_anomaly" if is_anomaly else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=0.8 if is_anomaly else 0.5,
            explanation=f"Tier 1 Custom ML: {'Anomaly detected' if is_anomaly else 'No threat detected'}.",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier1_ml_score": risk_score}
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 Analysis...")
        t2_result = await evaluate_tier_2_moderate(content)
        risk_score = int(t2_result.get("hf_score", 0))
        is_anomaly = t2_result.get("label") == "ANOMALY"
        return ThreatDecision(
            threat_type="behavior_anomaly" if is_anomaly else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t2_result.get("confidence", 0.5),
            explanation=f"Tier 2 Validation: {t2_result.get('label', 'SAFE')}",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier2_hf_score": risk_score, "tier2_hf_label": t2_result.get("label", "SAFE")}
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        t3_result = await evaluate_tier_3_advanced(content)
        risk_score = t3_result.risk_score
        
        return ThreatDecision(
            threat_type="behavior_anomaly" if t3_result.is_anomaly else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t3_result.confidence_score,
            indicators=t3_result.anomalies_detected,
            explanation=t3_result.explanation,
            key_points=[t3_result.anomaly_type] if t3_result.anomaly_type != "None" else [],
            recommended_actions=t3_result.recommended_actions,
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis=t3_result.model_dump()
        )

    # --- AUTO ORCHESTRATION ---
    # 1. TIER 1 Execute
    t1_result = evaluate_tier_1_basic(content)

    # 2. TIER 2 Execute
    t2_result = await evaluate_tier_2_moderate(content)
    
    # 3. TIER 3 Execute 
    t3_result: BehaviorAnomalyOutput = await evaluate_tier_3_advanced(content)
    
    # 4. FUSE RESULTS
    risk_score = t3_result.risk_score
    threat_level = "High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe"
    severity_label = "Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational"
    threat_type = "behavior_anomaly" if t3_result.is_anomaly else "benign"
    
    indicators = t3_result.anomalies_detected
    key_points = [t3_result.anomaly_type] if t3_result.anomaly_type != "None" else []
    
    advanced_json = t3_result.model_dump()
    
    return ThreatDecision(
        threat_type=threat_type,
        risk_score=risk_score,
        threat_level=threat_level,
        confidence=t3_result.confidence_score,
        indicators=indicators,
        explanation=t3_result.explanation,
        key_points=key_points,
        recommended_actions=t3_result.recommended_actions,
        external_flags=None,
        severity_label=severity_label,
        advanced_analysis=advanced_json
    )
