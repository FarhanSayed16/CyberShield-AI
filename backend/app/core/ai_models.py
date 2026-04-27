import asyncio
from loguru import logger
from transformers import pipeline
import torch
import joblib
import os
import sys
from sklearn.base import BaseEstimator, TransformerMixin

# Mock the custom classes so joblib can unpickle the preprocessors
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

class AIModelManager:
    def __init__(self):
        self.phishing_pipe = None
        self.deepfake_pipe = None
        self.prompt_pipe = None
        
        # Custom Scikit-Learn Models
        self.phishing_text_model = None
        self.phishing_text_preprocessor = None
        self.phishing_url_model = None
        self.phishing_url_preprocessor = None
        
        # Deepfake Torch Models
        self.deepfake_tier1_model = None
        self.deepfake_tier1_transform = None

    def load_models(self):
        """
        Synchronously load Hugging Face transformer pipelines.
        Downloads model weights (around 1-2GB) on the very first run.
        """
        logger.info("Loading local Hugging Face pipelines... This runs on CPU/GPU depending on torch availability.")
        
        device = 0 if torch.cuda.is_available() else -1
        
        try:
            logger.info("Loading Phishing BERT...")
            self.phishing_pipe = pipeline("text-classification", model="ealvaradob/bert-finetuned-phishing", device=device)
            
            logger.info("Loading Deepfake Image Classifier...")
            self.deepfake_pipe = pipeline("image-classification", model="umm-maybe/AI-image-detector", device=device)
            
            try:
                logger.info("Loading Prompt Sentinel Classifier...")
                self.prompt_pipe = pipeline("text-classification", model="protectai/deberta-v3-base-prompt-injection-v2", device=device)
            except Exception as e:
                logger.error(f"Failed to load Prompt Sentinel Classifier (likely Auth/Gated error): {e}")
                self.prompt_pipe = None
            
            # Load Custom Scikit-Learn Models
            logger.info("Loading Custom ML Models (Scikit-Learn & PyTorch)....")
            base_model_dir = os.environ.get("MODELS_DIR", r"d:\CyberShield AI\models")
            
            text_model_path = os.path.join(base_model_dir, "Phishing_text_model_text", "best_model.pkl")
            text_prep_path = os.path.join(base_model_dir, "Phishing_text_model_text", "best_preprocessor.pkl")
            if os.path.exists(text_model_path):
                self.phishing_text_model = joblib.load(text_model_path)
                self.phishing_text_preprocessor = joblib.load(text_prep_path)
            else:
                logger.warning(f"Phishing text ML model not found at {text_model_path}")
                
            url_model_path = os.path.join(base_model_dir, "Phishing_url", "best_model.pkl")
            url_prep_path = os.path.join(base_model_dir, "Phishing_url", "best_preprocessor.pkl")
            if os.path.exists(url_model_path):
                self.phishing_url_model = joblib.load(url_model_path)
                self.phishing_url_preprocessor = joblib.load(url_prep_path)
            else:
                logger.warning(f"Phishing URL ML model not found at {url_model_path}")

            # Tier 1 Deepfake PyTorch model
            deepfake_model_path = os.path.join(base_model_dir, "Deepfake_model", "best_model_scripted.pt")
            if os.path.exists(deepfake_model_path):
                self.deepfake_tier1_model = torch.jit.load(deepfake_model_path)
                self.deepfake_tier1_model.eval()
                if torch.cuda.is_available():
                    self.deepfake_tier1_model = self.deepfake_tier1_model.cuda()
                
                # ImageNet Transform
                import torchvision.transforms as transforms
                self.deepfake_tier1_transform = transforms.Compose([
                    transforms.Resize((224, 224)),
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                ])
                logger.info("Deepfake Tier 1 PyTorch model loaded successfully.")
            else:
                logger.warning(f"Deepfake Tier 1 PT model not found at {deepfake_model_path}")

            logger.info("✅ All local AI pipelines and Custom ML models loaded successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to load local AI models: {e}")

    async def initialize(self):
        """Asynchronously load models so the event loop is not blocked during startup."""
        await asyncio.to_thread(self.load_models)

ai_manager = AIModelManager()
