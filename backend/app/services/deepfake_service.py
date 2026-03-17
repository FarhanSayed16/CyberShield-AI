"""
CyberSentinel AI — Deepfake Analysis Service (3-Tier Architecture)
Tier 1: Basic Custom Model (Placeholder)
Tier 2: Local HuggingFace ML (Vision)
Tier 3: Advanced Gemini Analysis with Structured JSON Output
"""

import asyncio
import base64
import io
from PIL import Image
from loguru import logger
import google.generativeai as genai

from app.core.config import settings
from app.services.threat_router import ThreatDecision
from app.schemas.analyze import ExternalFlags
from app.core.ai_models import ai_manager
from app.core.prompts import DEEPFAKE_SYSTEM_INSTRUCTION
from app.schemas.gemini_outputs import DeepfakeAnalysisOutput

_API_KEYS = [k.strip() for k in settings.GEMINI_API_KEYS.split(",") if k.strip()]
_CURRENT_KEY_INDEX = 0

def _get_next_api_key() -> str:
    global _CURRENT_KEY_INDEX
    if not _API_KEYS:
         raise ValueError("No Gemini API keys configured.")
    key = _API_KEYS[_CURRENT_KEY_INDEX]
    _CURRENT_KEY_INDEX = (_CURRENT_KEY_INDEX + 1) % len(_API_KEYS)
    return key


# === TIER 1: BASIC (Local Custom ML / PyTorch) ===
async def evaluate_tier_1_basic(decoded_bytes: bytes, media_type: str) -> dict:
    if not ai_manager.deepfake_tier1_model or media_type != "image":
        return {"flagged": False, "score": 0.0}
        
    try:
        import torch
        # Read image to RGB
        img = Image.open(io.BytesIO(decoded_bytes)).convert("RGB")
        
        # Apply torchvision transforms (224x224 resize, normalization)
        input_tensor = ai_manager.deepfake_tier1_transform(img).unsqueeze(0)
        
        if torch.cuda.is_available():
            input_tensor = input_tensor.cuda()
            
        with torch.no_grad():
            output = ai_manager.deepfake_tier1_model(input_tensor)
            # Output is logits for 2 classes: 0=Real, 1=Fake
            probabilities = torch.nn.functional.softmax(output, dim=1)
            fake_prob = probabilities[0][1].item()
            
        is_fake = fake_prob > 0.5
        
        return {
            "flagged": is_fake, 
            "score": fake_prob * 100
        }
    except Exception as e:
        logger.error(f"PyTorch Tier 1 Vision Error: {e}")
        return {"flagged": False, "score": 0.0}


# === TIER 2: MODERATE (Local HF or Remote HF Space) ===
async def evaluate_tier_2_moderate(decoded_bytes: bytes, media_type: str) -> dict:
    if ai_manager.deepfake_pipe and media_type == "image":
        try:
            img = Image.open(io.BytesIO(decoded_bytes)).convert("RGB")
            target_size = (224, 224)
            if img.size[0] > 1000 or img.size[1] > 1000:
                 img.thumbnail(target_size)
                 
            hf_result = await asyncio.to_thread(ai_manager.deepfake_pipe, img)
            if hf_result:
                label = str(hf_result[0]['label']).upper()
                score = float(hf_result[0]['score'])
                is_fake = "FAKE" in label or "1" in label or "ARTIFICIAL" in label
                return {
                    "confidence": score,
                    "label": "DEEPFAKE" if is_fake else "REAL",
                    "hf_score": (score * 100) if is_fake else ((1.0 - score) * 100)
                }
        except Exception as e:
            logger.error(f"HF Tier 2 Vision Error: {e}")
            
    elif settings.HF_SPACE_URL and media_type == "image":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                api_url = f"{settings.HF_SPACE_URL.rstrip('/')}/predict/deepfake"
                files = {'file': ('image.jpg', decoded_bytes, 'image/jpeg')}
                res = await client.post(api_url, files=files)
                res.raise_for_status()
                data = res.json()
                is_fake = data.get("is_deepfake", False)
                score = float(data.get("risk_score", 0.0))
                return {
                    "confidence": 0.8,
                    "label": "DEEPFAKE" if is_fake else "REAL",
                    "hf_score": score
                }
        except Exception as e:
            logger.warning(f"Remote HF Space Deepfake Error (endpoint might not exist yet): {e}")

    return {"confidence": 0.0, "label": "SAFE", "hf_score": 0.0}


# === TIER 3: ADVANCED (Gemini Vision LLM) ===
async def evaluate_tier_3_advanced(decoded_bytes: bytes, media_type: str) -> DeepfakeAnalysisOutput:
    if not _API_KEYS:
        return DeepfakeAnalysisOutput(
            risk_level="MEDIUM", risk_score=50, is_deepfake=False, confidence_score=0.9,
            explanation="API offline.", detected_artifacts=[], authenticity_signals=[], recommendations=[]
        )
        
    # Prepare payload for Gemini Vision
    mime_type = "image/jpeg" if media_type == "image" else f"video/{media_type}" if "video" in media_type else "image/png"
    media_part = {
        "mime_type": mime_type,
        "data": decoded_bytes
    }

    for attempt in range(len(_API_KEYS)):
        current_key = _get_next_api_key()
        try:
            genai.configure(api_key=current_key)
            sys_instr = f"{DEEPFAKE_SYSTEM_INSTRUCTION}\n\nRespond EXACTLY with this JSON schema:\n{DeepfakeAnalysisOutput.model_json_schema()}"
            
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                system_instruction=sys_instr
            )
            
            response = await asyncio.to_thread(
                model.generate_content,
                ["Analyze this media for synthetic generation and deepfake artifacts. Tell me if it is fake or real.", media_part],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            
            if response.text:
                return DeepfakeAnalysisOutput.model_validate_json(response.text)
                
        except Exception as e:
             error_str = str(e).lower()
             if "429" in error_str or "quota" in error_str or "payload" in error_str:
                 continue
             try:
                 logger.error(f"RAW RES: {response.text}")
             except Exception:
                 pass
             logger.error(f"Tier 3 Gemini Vision Error: {e}")
             break
             
    # Default fallback
    return DeepfakeAnalysisOutput(
        risk_level="LOW", risk_score=0, is_deepfake=False, confidence_score=0.0,
        explanation="Analysis failed or file too large.", detected_artifacts=[], authenticity_signals=[], recommendations=[]
    )


# === ORCHESTRATOR ===
async def analyze_media(content: str, media_type: str, tier: str = "auto") -> ThreatDecision:
    """Execute the 3-Tier engine pipeline synchronously for Deepfakes or run isolated tiers."""
    from app.clients import hive_ai
    
    logger.info(f"🎭 Deepfake Analysis: type={media_type} tier={tier}")
    
    try:
        decoded = base64.b64decode(content.split("base64,")[-1] if "base64," in content else content)
    except Exception:
        raise ValueError("Invalid base64 encoded content")
        
    snippet = f"[{media_type} file, {len(decoded)} bytes]"

    # --- EXPLICIT TIER OVERRIDES ---
    if tier == "tier1":
        logger.info("Executing ONLY Tier 1 PyTorch Analysis...")
        t1_result = await evaluate_tier_1_basic(decoded, media_type)
        risk_score = int(t1_result.get("score", 0))
        is_fake = t1_result.get("flagged", False)
        return ThreatDecision(
            threat_type="deepfake" if is_fake else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=0.8 if is_fake else 0.5,
            explanation=f"Tier 1 Local ML: {'Deepfake detected' if is_fake else 'No artifacts found'}.",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier1_ml_score": risk_score}
        )

    if tier == "tier2":
        logger.info("Executing ONLY Tier 2 HuggingFace Analysis...")
        t2_result = await evaluate_tier_2_moderate(decoded, media_type)
        risk_score = int(t2_result.get("hf_score", 0))
        is_fake = t2_result.get("label") == "DEEPFAKE"
        return ThreatDecision(
            threat_type="deepfake" if is_fake else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t2_result.get("confidence", 0.5),
            explanation=f"Tier 2 HF Vision Analysis: {t2_result.get('label', 'SAFE')}",
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis={"tier2_hf_score": risk_score, "tier2_hf_label": t2_result.get("label", "SAFE")}
        )

    if tier == "tier3":
        logger.info("Executing ONLY Tier 3 Gemini Analysis...")
        t3_result = await evaluate_tier_3_advanced(decoded, media_type)
        risk_score = t3_result.risk_score
        return ThreatDecision(
            threat_type="deepfake" if t3_result.is_deepfake else "benign",
            risk_score=risk_score,
            threat_level="High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe",
            confidence=t3_result.confidence_score,
            indicators=t3_result.detected_artifacts,
            explanation=t3_result.explanation,
            key_points=t3_result.authenticity_signals,
            recommended_actions=t3_result.recommendations,
            severity_label="Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational",
            advanced_analysis=t3_result.model_dump()
        )

    # --- AUTO ORCHESTRATION ---
    # 1. TIER 1 Execute
    t1_result = await evaluate_tier_1_basic(decoded, media_type)

    # 2. TIER 2 & External APIs Execute concurrently
    t2_task = evaluate_tier_2_moderate(decoded, media_type)
    hive_task = hive_ai.detect(content)
    
    t2_result, hive_result = await asyncio.gather(t2_task, hive_task, return_exceptions=True)
    
    external_flags = {}
    if not isinstance(hive_result, Exception) and hive_result and isinstance(hive_result, dict):
        external_flags["hive_ai_result"] = hive_result.get("classification", "unknown")

    # 3. TIER 3 Execute 
    t3_result: DeepfakeAnalysisOutput = await evaluate_tier_3_advanced(decoded, media_type)
    
    # 4. FUSE RESULTS
    risk_score = t3_result.risk_score
    threat_level = "High Risk" if risk_score >= 70 else "Suspicious" if risk_score >= 30 else "Safe"
    severity_label = "Critical" if risk_score >= 80 else "Warning" if risk_score >= 40 else "Informational"
    threat_type = "deepfake" if t3_result.is_deepfake else "benign"
    
    indicators = t3_result.detected_artifacts
    key_points = t3_result.authenticity_signals
    
    advanced_json = t3_result.model_dump()
    
    return ThreatDecision(
        threat_type=threat_type,
        risk_score=risk_score,
        threat_level=threat_level,
        confidence=t3_result.confidence_score,
        indicators=indicators,
        explanation=t3_result.explanation,
        key_points=key_points,
        recommended_actions=t3_result.recommendations,
        external_flags=external_flags if external_flags else None,
        severity_label=severity_label,
        advanced_analysis=advanced_json
    )
