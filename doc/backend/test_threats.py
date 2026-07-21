import httpx

def test_threats():
    url = "http://127.0.0.1:8000/api/threats?page=1&page_size=20&type=all"
    headers = {
        "X-API-Key": "dev-key"
    }
    response = httpx.get(url, headers=headers)
    print("Status:", response.status_code)
    print("Body:", response.text)

if __name__ == "__main__":
    test_threats()
