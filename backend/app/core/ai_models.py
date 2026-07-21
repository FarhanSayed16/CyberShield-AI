import asyncio
from loguru import logger
import os

class AIModelManager:
    def __init__(self):
        # We no longer load models locally in the main backend.
        # This prevents Out-Of-Memory (OOM) crashes on Render free tier.
        # Models are loaded in the separate Hugging Face Space.
        self.phishing_pipe = None
        self.deepfake_pipe = None
        self.prompt_pipe = None
        self.phishing_text_model = None
        self.phishing_url_model = None
        self.deepfake_tier1_model = None

    def load_models(self):
        logger.info("Skipping local AI model loading. Heavy ML inference is delegated to Hugging Face Spaces or Gemini.")
        logger.info("✅ Lightweight Backend initialized.")

    async def initialize(self):
        await asyncio.to_thread(self.load_models)

ai_manager = AIModelManager()
