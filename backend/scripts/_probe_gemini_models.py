import os
from pathlib import Path
import httpx
from dotenv import load_dotenv

load_dotenv(Path(r"D:\CyberShield AI\backend\.env"))
keys = [k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()]
key = keys[0] if keys else ""
print("key_len", len(key), "prefix", (key[:6] + "…") if key else None)

models = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
]
payload = {"contents": [{"parts": [{"text": 'Reply with JSON {"ok":true} only'}]}]}
for m in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
    try:
        r = httpx.post(url, params={"key": key}, json=payload, timeout=25)
        print(m, r.status_code, r.text[:200].replace("\n", " "))
    except Exception as e:
        print(m, "EXC", e)
