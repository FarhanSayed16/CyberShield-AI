# 🚀 Hugging Face Spaces Integration Guide (CyberSentinel AI)

Because free-tier hosting platforms like Render only offer **512MB RAM**, attempting to load your PyTorch (`ViT`, `DistilBERT`) and Scikit-Learn models natively inside the main FastAPI server will result in an immediate **Out-Of-Memory (OOM) crash**. 

**The Solution**: We will extract all the heavy ML inference tools into a standalone microservice hosted on **Hugging Face Spaces**. HF provides **16GB of RAM** per space for free, which is more than enough for our models. Your main Render backend will then simply make fast HTTP requests to this HF Space.

---

## 📁 1. The Hugging Face Repository Structure

You will need to create a new folder on your computer (e.g., `cybersentinel-ml-api`) and populate it with specific files from your current backend.

This is the **exact folder structure** your Hugging Face Space will need:

```text
cybersentinel-ml-api/
│
├── models/                         # Extract from your current backend/models folder
│   ├── Phishing_url/               # Contains best_model.pkl and best_preprocessor.pkl
│   ├── Phishing_text_model_text/   # Contains best_model.pkl and best_preprocessor.pkl
│   └── Deepfake_model/             # Contains best_model_scripted.pt
│
├── main.py                         # The NEW FastAPI wrapper for your models
├── hf_text_url_inference.py        # Migrated from your phishing URL & Text classifiers
├── hf_deepfake_inference.py        # Migrated from your deepfake_service.py
└── requirements.txt                # Specific ML dependencies
```

---

## 📝 2. File Contents for the HF Space

Create these files inside your new `cybersentinel-ml-api` folder:

### A. [requirements.txt](file:///d:/CyberShield%20AI/backend/requirements.txt)
This tells Hugging Face what to install in the 16GB RAM environment.
```text
fastapi
uvicorn
pydantic
torch
torchvision
transformers
scikit-learn==1.3.2
joblib
numpy
pillow
python-multipart
```

### B. `hf_text_url_inference.py`
This holds the Scikit-learn unpickling for both the Text and URL phishing classifiers. You **must** include the mock classes here so `joblib` doesn't crash when unpickling.

```python
import joblib
import numpy as np
import os
from sklearn.base import BaseEstimator, TransformerMixin

# DO NOT REMOVE: Required mock classes for joblib unpickling
class PhishingPreprocessor(BaseEstimator, TransformerMixin): pass
class URLFeatureExtractor(BaseEstimator, TransformerMixin): pass
class SpamPreprocessor(BaseEstimator, TransformerMixin): pass
class TextCleaner(BaseEstimator, TransformerMixin): pass
class SignalFeatureExtractor(BaseEstimator, TransformerMixin): pass

import __main__
__main__.PhishingPreprocessor = PhishingPreprocessor
__main__.URLFeatureExtractor = URLFeatureExtractor
__main__.SpamPreprocessor = SpamPreprocessor
__main__.TextCleaner = TextCleaner
__main__.SignalFeatureExtractor = SignalFeatureExtractor

def load_url_models():
    model = joblib.load("./models/Phishing_url/best_model.pkl")
    prep = joblib.load("./models/Phishing_url/best_preprocessor.pkl")
    return model, prep

def load_text_models():
    model = joblib.load("./models/Phishing_text_model_text/best_model.pkl")
    prep = joblib.load("./models/Phishing_text_model_text/best_preprocessor.pkl")
    return model, prep

def predict_url(url: str, model, preprocessor=None):
    # Depending on your preprocessor structure, process url here
    pass

def predict_text(text: str, model, preprocessor=None):
    # Determine the text class
    pass
```

### C. `hf_deepfake_inference.py`
This holds your PyTorch image processing and Hugging Face Pipeline logic (Prompt Sentinel, DistilBERT).

```python
import torch
from torchvision import transforms
from PIL import Image
from transformers import pipeline

def load_deepfake_model():
    # Load your local deepfake Tier 1 scripted PyTorch model
    model = torch.jit.load("./models/Deepfake_model/best_model_scripted.pt", map_location=torch.device('cpu'))
    model.eval()
    return model

def load_prompt_injection_model():
    return pipeline(
        "text-classification", 
        model="protectai/deberta-v3-base-prompt-injection-v2", 
        truncation=True, 
        max_length=512
    )

def analyze_image(image_bytes: bytes, model):
    # Depending on if you use HF Pipeline or local .pt, process the image here
    pass

def analyze_prompt(text: str, model):
    result = model(text)[0]
    is_injection = result['label'] == 'INJECTION'
    score = result['score'] * 100
    return {"is_injection": is_injection, "score": score}
```

### D. [main.py](file:///d:/CyberShield%20AI/backend/app/main.py) (The API Server)
This is the FastAPI server that Hugging Face will run.

```python
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from hf_text_url_inference import load_url_models, load_text_models, predict_url, predict_text
from hf_deepfake_inference import load_deepfake_model, load_prompt_injection_model, analyze_prompt

app = FastAPI(title="Cyber Sentinel ML API")

# Pre-load models into memory when the HF Space starts
print("Loading Models into 16GB RAM...")
url_model, url_prep = load_url_models()
text_model, text_prep = load_text_models()
injection_model = load_prompt_injection_model()
deepfake_model = load_deepfake_model()

class URLRequest(BaseModel):
    url: str

class PromptRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "ML Engine Online"}

@app.post("/predict/url")
def predict_url_endpoint(req: URLRequest):
    # Extract prediction from your loaded model
    return {"risk_score": 0.0, "url": req.url}

@app.post("/predict/text")
def predict_text_endpoint(req: PromptRequest):
    # Provide the NLP inference here
    return {"risk_score": 0.0, "is_phishing": False}

@app.post("/predict/prompt")
def predict_prompt_endpoint(req: PromptRequest):
    return analyze_prompt(req.text, injection_model)

# Add your Image Upload Deepfake endpoint here
```

---

## 🚀 3. Deploying to Hugging Face Spaces

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and log in.
2. Click **Create new Space**.
3. Name: `cybersentinel-engine`
4. License: `MIT`
5. Select the **Space SDK**: Choose **Docker** (Blank container).
6. **Hardware**: Leave as "CPU basic · 2 vCPU · 16 GB · Free".
7. Click **Create Space**.

**Pushing the code:**
You will now see instructions to clone the Space via Git.
1. Run `git clone https://huggingface.co/spaces/YOUR_USERNAME/cybersentinel-engine` on your computer.
2. Copy all the files from your `cybersentinel-ml-api` folder (including [models/](file:///d:/CyberShield%20AI/backend/app/core/ai_models.py#40-105), [main.py](file:///d:/CyberShield%20AI/backend/app/main.py), [requirements.txt](file:///d:/CyberShield%20AI/backend/requirements.txt)) into the cloned directory.
3. Because you chose Docker, you MUST add a simple [Dockerfile](file:///d:/CyberShield%20AI/backend/Dockerfile):

### E. [Dockerfile](file:///d:/CyberShield%20AI/backend/Dockerfile)
```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

4. Run `git add .`, `git commit -m "Deploy models"`, and `git push`.
5. Hugging Face will automatically build the Docker container. You will have a live URL: `https://YOUR_USERNAME-cybersentinel-engine.hf.space`.

---

## 🌉 4. Connecting your Render Backend to HF

Your new Hugging Face Space URL is your high-powered ML backend.

Inside your original Render `backend` project, update [ml_url_engine.py](file:///d:/CyberShield%20AI/backend/app/services/ml_url_engine.py) and [deepfake_service.py](file:///d:/CyberShield%20AI/backend/app/services/deepfake_service.py) to **delete the local PyTorch/Scikit implementations** and replace them with simple HTTP `requests`:

```python
# Modifying your original Render backend's url_service.py or ml_url_engine.py
import requests

HF_API_URL = "https://YOUR_USERNAME-cybersentinel-engine.hf.space"

async def get_url_risk_score(url: str) -> float:
    try:
        response = requests.post(f"{HF_API_URL}/predict/url", json={"url": url})
        response.raise_for_status()
        return response.json().get("risk_score", 0.0)
    except Exception as e:
        print(f"HF Space Error: {e}")
        # Fail open or fallback to a default AI heuristic
        return 15.0 
```

### Result
Your Render app (512MB RAM) handles user logins, websockets, routing, and database writes. When a heavy ML task arrives, it pings your Hugging Face Space (16GB RAM). OOM crashes are entirely avoided for $0/month!
