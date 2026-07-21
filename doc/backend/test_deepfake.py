import asyncio
import base64
import httpx
from app.services.deepfake_service import analyze_media
from app.core.ai_models import ai_manager

async def test_deepfake_pipeline():
    # 1. Init AI models manually
    ai_manager.load_models()
    
    # 2. Grab a known sample image (parrot)
    img_url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/parrots.png"
    print(f"Fetching {img_url}...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(img_url)
    
    b64_img = base64.b64encode(resp.content).decode('utf-8')
    content = f"data:image/png;base64,{b64_img}"
    
    # 3. Analyze through orchestrator
    print("Sending completely through deepfake_service.analyze_media...")
    decision = await analyze_media(content, "image")
    
    print("\n--- Final Decision ---")
    print("Threat Type:", decision.threat_type)
    print("Risk Score:", decision.risk_score)
    print("Threat Level:", decision.threat_level)
    print("Advanced JSON:\n", decision.advanced_analysis)

if __name__ == "__main__":
    asyncio.run(test_deepfake_pipeline())
