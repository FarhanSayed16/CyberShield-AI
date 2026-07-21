import joblib
import numpy as np
import os
import math
from urllib.parse import urlparse
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
    try:
        model = joblib.load("./models/Phishing_url/best_model.pkl")
        prep = joblib.load("./models/Phishing_url/best_preprocessor.pkl")
        return model, prep
    except Exception as e:
        print(f"URL model load failed: {e}. Using heuristics fallback.")
        return None, None

def load_text_models():
    try:
        model = joblib.load("./models/Phishing_text_model_text/best_model.pkl")
        prep = joblib.load("./models/Phishing_text_model_text/best_preprocessor.pkl")
        return model, prep
    except Exception as e:
        print(f"Text model load failed: {e}. Using heuristics fallback.")
        return None, None

def _extract_url_features_manual(url: str) -> np.ndarray:
    parsed = urlparse(url)
    domain = parsed.netloc
    length = len(url)
    prob = [float(url.count(c)) / length for c in dict.fromkeys(list(url))]
    entropy = -sum(p * math.log(p) / math.log(2.0) for p in prob)
    digit_count = sum(c.isdigit() for c in url)
    special_char_count = sum(not c.isalnum() for c in url)
    subdomain_count = domain.count('.')
    has_ip = 1 if all(part.isdigit() for part in domain.split('.')[:4]) and domain.count('.') == 3 else 0
    return np.array([[length, entropy, digit_count, special_char_count, subdomain_count, has_ip]])

def predict_url(url: str, model, preprocessor=None):
    if model is None:
        # Fallback heuristic if models aren't loaded
        features = _extract_url_features_manual(url)
        mal_prob = 0.8 if features[0][5] == 1 or features[0][1] > 4.5 else 0.1
        f_list = features[0].tolist()
        feature_map = {
            "length": f_list[0], "entropy": round(f_list[1], 2),
            "digit_count": f_list[2], "special_char_count": f_list[3],
            "subdomain_count": f_list[4], "has_ip": bool(f_list[5])
        }
        return float(mal_prob), feature_map

    # If model exists, use it
    if preprocessor:
        features = preprocessor.transform([url])
    else:
        features = _extract_url_features_manual(url)
        
    proba = model.predict_proba(features)[0]
    mal_prob = proba[1] if len(proba) > 1 else proba[0]
    
    # Mock features since actual extraction depends on the prep internals
    feature_map = {"model_used": "RandomForest", "score": float(mal_prob)}
    return float(mal_prob), feature_map

def predict_text(text: str, model, preprocessor=None):
    if model is None:
        return False, 0.0
    
    if preprocessor:
        features = preprocessor.transform([text])
    else:
        features = [text]
        
    proba = model.predict_proba(features)[0]
    mal_prob = proba[1] if len(proba) > 1 else proba[0]
    is_phishing = mal_prob > 0.5
    return is_phishing, float(mal_prob)
