"""
CyberSentinel AI — Prompt Injection Detection Service (3-Tier Architecture)
Tier 1: Basic Custom Model (Placeholder)
Tier 2: Local HuggingFace ML + Nvidia Llama Guard + SafePrompt
Tier 3: Advanced Gemini Analysis with Structured JSON Output
"""

import asyncio
from loguru import logger
import google.generativeai as genai

from app.core.config import settings
from app.services.threat_router import ThreatDecision
from app.schemas.analyze import ExternalFlags
from app.core.prompts import PROMPT_INJECTION_SYSTEM_INSTRUCTION
from app.schemas.gemini_outputs import PromptInjectionOutput

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
_INJECTION_HINTS = (
    "ignore previous", "ignore all previous", "system prompt", "jailbreak",
    "developer mode", "dan mode", "bypass", "do anything now", "reveal your instructions",
    "disregard the above", "pretend you are",
)

async def evaluate_tier_1_basic(text: str) -> dict:
    from app.clients import hf_ml

    remote = await hf_ml.predict_prompt(text)
    if remote:
        return remote

    lower = (text or "").lower()
    hits = sum(1 for h in _INJECTION_HINTS if h in lower)
    score = min(95, hits * 28)
    flagged = score >= 50
    return {
        "flagged": flagged,
        "score": score,
        "label": "INJECTION" if flagged else "SAFE",
        "source": "heuristic",
    }


# === TIER 2: MODERATE (Remote HF when configured) ===
async def evaluate_tier_2_moderate(text: str) -> dict:
    from app.clients import hf_ml

    remote = await hf_ml.predict_prompt(text)
    if remote:
        return remote
    return {"confidence": 0.0, "label": "SAFE", "hf_score": 0.0, "source": "unavailable"}


# === TIER 3: ADVANCED (Gemini LLM) ===
async def evaluate_tier_3_advanced(text: str) -> PromptInjectionOutput:
    if settings.USE_MOCK_AGENTS:
        from app.clients.mock_tier3 import mock_prompt_output
        return mock_prompt_output()

    if not _API_KEYS:
        return PromptInjectionOutput(
            risk_level="MEDIUM", risk_score=50, is_injection=False, confidence_score=0.9,
            injection_type="None", explanation="API offline.", malicious_payloads=[], mitigation_steps=[]
        )

    for attempt in range(len(_API_KEYS)):
        current_key = _get_next_api_key()
        try:
            genai.configure(api_key=current_key)
            sys_instr = f"{PROMPT_INJECTION_SYSTEM_INSTRUCTION}\n\nRespond EXACTLY with this JSON schema:\n{PromptInjectionOutput.model_json_schema()}"
            
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
                return PromptInjectionOutput.model_validate_json(response.text)
                
        except Exception as e:
             error_str = str(e).lower()
             if "429" in error_str or "quota" in error_str:
                 continue
             logger.error(f"Tier 3 Gemini Error: {e}")
             break
             
    # Default fallback
    return PromptInjectionOutput(
        risk_level="LOW", risk_score=0, is_injection=False, confidence_score=0.0,
        injection_type="None", explanation="Analysis failed.", malicious_payloads=[], mitigation_steps=[]
    )


# === ORCHESTRATOR ===
async def analyze_prompt(content: str, tier: str = "auto") -> ThreatDecision:
    """Execute the 3-Tier engine pipeline synchronously for Prompt Injection or isolated tiers."""
    from app.clients import safeprompt, nvidia_nim
    
    logger.info(f"🤖 Prompt Analysis: length={len(content)} chars tier={tier}")
    
    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 Custom ML Analysis...")
        t1_result = await evaluate_tier_1_basic(content)
        risk_score = t1_result.get("score", 0)
        is_injection = t1_result.get("flagged", False)
        return ThreatDecision(
            threat_type="prompt_injection" if is_injection else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=0.8 if is_injection else 0.5,
            explanation=f"Tier 1 Custom ML: {'Injection detected' if is_injection else 'No threat detected'}.",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier1_ml_score": risk_score}
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 External Intel & LLaMA Guard...")
        t2_result, sp_result, nv_result = await asyncio.gather(
            evaluate_tier_2_moderate(content),
            safeprompt.check(content),
            nvidia_nim.check_prompt_with_llama_guard(content),
            return_exceptions=True
        )
        
        sp_risk = None
        if not isinstance(sp_result, Exception) and sp_result and sp_result.get("risk_category"):
            sp_risk = sp_result.get("risk_category")
            
        nv_is_safe = True
        nv_category = "none"
        if not isinstance(nv_result, Exception) and nv_result:
            nv_is_safe = nv_result.get("is_safe", True)
            nv_category = nv_result.get("category", "none")
            
        external_flags = ExternalFlags(safeprompt_risk=sp_risk) if sp_risk else None

        risk_score = int(t2_result.get("hf_score", 0)) if not isinstance(t2_result, Exception) else 0
        if not nv_is_safe:
            risk_score = max(risk_score, 85)

        is_injection = risk_score >= 50
        
        indicators = []
        if not nv_is_safe:
            indicators.append(f"Llama Guard Violation: {nv_category}")

        return ThreatDecision(
            threat_type="prompt_injection" if is_injection else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=0.8 if not nv_is_safe else getattr(t2_result, 'get', lambda x, y: 0.5)("confidence", 0.5),
            indicators=indicators,
            explanation=f"Tier 2 External validation: {'Llama Guard Blocked' if not nv_is_safe else 'Safe'}",
            external_flags=external_flags,
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier2_hf_score": risk_score if not isinstance(t2_result, Exception) else 0}
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        t3_result = await evaluate_tier_3_advanced(content)
        risk_score = t3_result.risk_score
        
        return ThreatDecision(
            threat_type="prompt_injection" if t3_result.is_injection else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t3_result.confidence_score,
            indicators=t3_result.malicious_payloads,
            explanation=t3_result.explanation,
            key_points=[t3_result.injection_type] if t3_result.injection_type != "None" else [],
            recommended_actions=t3_result.mitigation_steps,
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis=t3_result.model_dump()
        )

    # --- AUTO ORCHESTRATION ---
    # 1. TIER 1 Execute
    t1_result = await evaluate_tier_1_basic(content)

    # 2. TIER 2 & External APIs Execute concurrently
    t2_task = evaluate_tier_2_moderate(content)
    sp_task = safeprompt.check(content)
    nv_task = nvidia_nim.check_prompt_with_llama_guard(content)
    
    t2_result, sp_result, nv_result = await asyncio.gather(t2_task, sp_task, nv_task, return_exceptions=True)
    
    # Process external APIs
    sp_risk = None
    if not isinstance(sp_result, Exception) and sp_result and sp_result.get("risk_category"):
        sp_risk = sp_result.get("risk_category")
        
    nv_is_safe = True
    nv_category = "none"
    if not isinstance(nv_result, Exception) and nv_result:
        nv_is_safe = nv_result.get("is_safe", True)
        nv_category = nv_result.get("category", "none")
        
    external_flags = ExternalFlags(safeprompt_risk=sp_risk) if sp_risk else None

    # 3. TIER 3 Execute 
    t3_result: PromptInjectionOutput = await evaluate_tier_3_advanced(content)
    
    # 4. FUSE RESULTS
    risk_score = t3_result.risk_score
    
    # Aggressively boost risk if NVIDIA Llama-Guard caught a jailbreak overriding Gemini
    if not nv_is_safe:
        risk_score = min(100, risk_score + 35)
        if t3_result.is_injection is False:
             t3_result.explanation += f" \n(Note: NVIDIA Llama-Guard triggered a safety block for: {nv_category})"
             t3_result.is_injection = True
    
    threat_level = "High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe"
    severity_label = "Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational"
    threat_type = "prompt_injection" if t3_result.is_injection else "benign"
    
    indicators = t3_result.malicious_payloads
    if not nv_is_safe:
        indicators.append(f"Llama Guard Violation: {nv_category}")
        
    key_points = [t3_result.injection_type] if t3_result.injection_type != "None" else []
    
    advanced_json = t3_result.model_dump()
    
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
