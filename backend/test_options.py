import httpx

def test_options():
    try:
        url = "http://127.0.0.1:8000/api/threats?page=1&page_size=20&type=all"
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
        res = httpx.options(url, headers=headers)
        print("OPTIONS /api/threats:", res.status_code)
        
        url = "http://127.0.0.1:8000/api/analyze"
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-api-key"
        }
        res2 = httpx.options(url, headers=headers)
        print("OPTIONS /api/analyze:", res2.status_code)
        
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    test_options()
