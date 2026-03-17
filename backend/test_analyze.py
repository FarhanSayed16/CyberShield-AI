import httpx

def test_analyze():
    url = "http://127.0.0.1:8000/api/analyze"
    headers = {
        "X-API-Key": "dev-key",
        "Content-Type": "application/json"
    }
    payload = {
        "source": "dashboard",
        "type": "text", 
        "content": "This is a very long string that the user pasted " * 10 
    }
    response = httpx.post(url, headers=headers, json=payload)
    print("Status POST:", response.status_code)
    print("Body POST:", response.text)

if __name__ == "__main__":
    test_analyze()
