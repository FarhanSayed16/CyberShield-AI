import re
import string
import numpy as np
import tldextract
from typing import List, Dict, Any

# --- TEXT FEATURE EXTRACTION (18 Features) ---

def extract_text_features(text: str) -> np.ndarray:
    """
    Extract the 18 specific signal features required by the Phishing_text_model_text (BernoulliNB).
    """
    # 1. msg_len
    msg_len = len(text)
    # 2. word_count
    words = text.split()
    word_count = len(words)
    # 3. digit_ratio
    digit_count = sum(c.isdigit() for c in text)
    digit_ratio = digit_count / max(msg_len, 1)
    # 4. upper_ratio
    upper_count = sum(c.isupper() for c in text)
    upper_ratio = upper_count / max(msg_len, 1)
    # 5. has_url
    has_url = 1.0 if re.search(r'http[s]?://|www\.', text) else 0.0
    # 6. has_phone
    # Simple heuristic for phone numbers
    has_phone = 1.0 if re.search(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', text) else 0.0
    # 7. has_currency
    has_currency = 1.0 if re.search(r'[\$£€¥]', text) else 0.0
    # 8. exclaim_count
    exclaim_count = text.count('!')
    # 9. question_count
    question_count = text.count('?')
    # 10. punct_ratio
    punct_count = sum(c in string.punctuation for c in text)
    punct_ratio = punct_count / max(msg_len, 1)
    # 11. lexical_diversity
    unique_words = len(set(words))
    lexical_diversity = unique_words / max(word_count, 1)
    # 12. avg_word_len
    avg_word_len = sum(len(w) for w in words) / max(word_count, 1)
    # 13. has_shortcode
    has_shortcode = 1.0 if re.search(r'\b\d{5,6}\b', text) else 0.0
    # 14. caps_word_count
    caps_word_count = sum(1 for w in words if w.isupper() and len(w) > 1)
    
    # 15. unique_words (as count)
    # 16. upper_count
    # 17. digit_count
    # 18. char_count (same as msg_len)
    
    features = [
        msg_len, word_count, digit_ratio, upper_ratio, has_url, has_phone, has_currency,
        exclaim_count, question_count, punct_ratio, lexical_diversity, avg_word_len,
        has_shortcode, caps_word_count, unique_words, upper_count, digit_count, msg_len
    ]
    return np.array(features, dtype=np.float32).reshape(1, -1)


# --- URL FEATURE EXTRACTION (25 Features) ---

def extract_url_features(url: str) -> np.ndarray:
    """
    Extract the 25 specific features required by the Phishing_url (RandomForest) model.
    Mocks/estimates features that require live web scraping (like PageRank) for speed.
    """
    parsed = tldextract.extract(url)
    domain = parsed.domain
    subdomain = parsed.subdomain
    suffix = parsed.suffix
    full_domain = f"{domain}.{suffix}"
    
    # Mapped roughly to UCI Phishing Dataset specs (-1 for legitimate, 0 for suspicious, 1 for phishing)
    # We map them to float arrays.
    
    # 1. having_IP_Address: 1 if IP in URL, else -1
    having_IP_Address = 1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) else -1
    
    # 2. having_Sub_Domain: 1 if >1 subdomain, 0 if 1, -1 if 0
    sub_count = len(subdomain.split('.')) if subdomain else 0
    having_Sub_Domain = 1 if sub_count > 1 else (0 if sub_count == 1 else -1)
    
    # 3. SSLfinal_State (approx: https = -1, http = 1)
    SSLfinal_State = -1 if url.startswith('https') else 1
    
    # 4. Domain_registeration_length (approx based on TLD)
    Domain_registeration_length = 1 if suffix in ['xyz', 'top', 'club'] else -1
    
    # 5. Favicon (heuristic: assuming -1 for now)
    Favicon = -1
    
    # 6. port (non-standard port = 1)
    port = 1 if re.search(r':\d{4,5}', url) else -1
    
    # 7. HTTPS_token (https in domain part = 1)
    HTTPS_token = 1 if 'https' in full_domain else -1
    
    # 8. Request_URL (heuristic)
    Request_URL = -1
    
    # 9. URL_of_Anchor
    URL_of_Anchor = -1
    
    # 10. Links_in_tags
    Links_in_tags = -1
    
    # 11. SFH
    SFH = -1
    
    # 12. Submitting_to_email (mailto: = 1)
    Submitting_to_email = 1 if 'mailto:' in url else -1
    
    # 13. Abnormal_URL (domain not in path = 1)
    Abnormal_URL = -1 if domain in url else 1
    
    # 14. Redirect (// = 1)
    Redirect = 1 if url.count('//') > 1 else -1
    
    # 15. on_mouseover
    on_mouseover = -1
    
    # 16. RightClick
    RightClick = -1
    
    # 17. popUpWidnow
    popUpWidnow = -1
    
    # 18. Iframe
    Iframe = -1
    
    # 19. age_of_domain (suspicious TLD = 1)
    age_of_domain = 1 if suffix in ['xyz', 'top'] else -1
    
    # 20. DNSRecord
    DNSRecord = -1
    
    # 21. web_traffic
    web_traffic = -1
    
    # 22. Page_Rank
    Page_Rank = -1
    
    # 23. Google_Index
    Google_Index = -1
    
    # 24. Links_pointing_to_page
    Links_pointing_to_page = 0
    
    # 25. Statistical_report
    Statistical_report = -1
    
    features = [
        having_IP_Address, having_Sub_Domain, SSLfinal_State, Domain_registeration_length,
        Favicon, port, HTTPS_token, Request_URL, URL_of_Anchor, Links_in_tags, SFH,
        Submitting_to_email, Abnormal_URL, Redirect, on_mouseover, RightClick, popUpWidnow,
        Iframe, age_of_domain, DNSRecord, web_traffic, Page_Rank, Google_Index,
        Links_pointing_to_page, Statistical_report
    ]
    return np.array(features, dtype=np.float32).reshape(1, -1)
