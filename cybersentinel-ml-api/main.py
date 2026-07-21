from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from hf_text_url_inference import load_url_models, load_text_models, predict_url, predict_text
from hf_deepfake_inference import load_deepfake_model, load_prompt_injection_model, analyze_image, analyze_prompt

app = FastAPI(title="CyberSentinel ML API")

# Pre-load models into memory when the HF Space starts
print("Loading Models into RAM...")
url_model, url_prep = load_url_models()
text_model, text_prep = load_text_models()
injection_model = load_prompt_injection_model()
deepfake_model = load_deepfake_model()
print("Models loaded successfully.")

class URLRequest(BaseModel):
    url: str

class PromptRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "ML Engine Online"}

@app.post("/predict/url")
def predict_url_endpoint(req: URLRequest):
    try:
        score, features = predict_url(req.url, url_model, url_prep)
        return {"risk_score": score * 100, "features": features, "url": req.url}
    except Exception as e:
        return {"risk_score": 15.0, "error": str(e)}

@app.post("/predict/text")
def predict_text_endpoint(req: PromptRequest):
    try:
        is_phishing, prob = predict_text(req.text, text_model, text_prep)
        return {"risk_score": prob * 100, "is_phishing": is_phishing}
    except Exception as e:
        return {"risk_score": 0.0, "is_phishing": False, "error": str(e)}

@app.post("/predict/prompt")
def predict_prompt_endpoint(req: PromptRequest):
    try:
        return analyze_prompt(req.text, injection_model)
    except Exception as e:
        return {"is_injection": False, "score": 0.0, "error": str(e)}

@app.post("/predict/image")
async def predict_image_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        return analyze_image(contents, deepfake_model)
    except Exception as e:
        return {"flagged": False, "score": 0.0, "error": str(e)}
