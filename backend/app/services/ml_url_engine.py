import os
import math
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from loguru import logger
from urllib.parse import urlparse
from sklearn.ensemble import RandomForestClassifier

# We'll store a mock model in this directory for persistence
MODEL_PATH = os.path.join(os.path.dirname(__file__), "url_ml_model.pkl")

class AdversarialURLEngine:
    def __init__(self):
        self.model = self._load_or_train_model()

    def _extract_features(self, url: str) -> np.ndarray:
        """
        Extract lexical features from a URL for ML classification.
        Features: length, entropy, digit_count, special_char_count, subdomain_count, has_ip
        """
        parsed = urlparse(url)
        domain = parsed.netloc

        length = len(url)
        
        # Calculate Shannon entropy
        prob = [float(url.count(c)) / length for c in dict.fromkeys(list(url))]
        entropy = -sum(p * math.log(p) / math.log(2.0) for p in prob)
        
        digit_count = sum(c.isdigit() for c in url)
        special_char_count = sum(not c.isalnum() for c in url)
        
        subdomain_count = domain.count('.')
        
        # Simple heuristic if domain looks like an IPv4
        has_ip = 1 if all(part.isdigit() for part in domain.split('.')[:4]) and domain.count('.') == 3 else 0

        return np.array([[length, entropy, digit_count, special_char_count, subdomain_count, has_ip]])

    def _load_or_train_model(self):
        """Load the ML model from disk, or train a dummy one if it doesn't exist."""
        if os.path.exists(MODEL_PATH):
            try:
                return joblib.load(MODEL_PATH)
            except Exception as e:
                logger.warning(f"Failed to load ML model: {e}")
                
        logger.info("Training initial ML URL classification model...")
        
        # Generate some dummy training data
        # Features: [length, entropy, digit_count, special_char_count, subdomain_count, has_ip]
        # Label 0: Safe, Label 1: Phishing/Malicious
        
        # Safe URL examples
        safe_X = [
            [20, 3.5, 0, 4, 1, 0],  # google.com
            [35, 3.8, 2, 5, 2, 0],  # mail.yahoo.com/app
            [45, 4.0, 5, 6, 2, 0],  # github.com/user/repo123
        ]
        
        # Malicious URL examples (high entropy, many subdomains, IPs, long strings)
        mal_X = [
            [85, 5.2, 15, 12, 5, 0], # login-update.secure-bank.com.xzy
            [55, 4.8, 8,  8,  3, 0], # secure.paypal.com.confirm-it.net
            [25, 3.2, 12, 4,  3, 1], # 192.168.1.1/login.php
            [120,5.8, 30, 20, 2, 0], # aaaaaabbb1234.com/?token=...
        ]
        
        X = np.array(safe_X + mal_X)
        y = np.array([0, 0, 0, 1, 1, 1, 1])
        
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
        model.fit(X, y)
        
        try:
            joblib.dump(model, MODEL_PATH)
            logger.info("Saved initial ML model to disk")
        except Exception as e:
            logger.error(f"Failed to save ML model: {e}")
            
        return model

    def evaluate_url(self, url: str) -> Tuple[float, Dict[str, Any]]:
        """
        Evaluate a URL returning an ML probability score (0.0 to 1.0) 
        and the extracted features map.
        """
        features_array = self._extract_features(url)
        
        # model.predict_proba returns [[P(class 0), P(class 1)]]
        proba = self.model.predict_proba(features_array)[0]
        malicious_prob = proba[1]
        
        f_list = features_array[0].tolist()
        feature_map = {
            "length": f_list[0],
            "entropy": round(f_list[1], 2),
            "digit_count": f_list[2],
            "special_char_count": f_list[3],
            "subdomain_count": f_list[4],
            "has_ip": bool(f_list[5])
        }
        
        return float(malicious_prob), feature_map

ml_engine = AdversarialURLEngine()
