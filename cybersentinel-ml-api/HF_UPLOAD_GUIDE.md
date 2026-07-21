# Hugging Face Space – Upload Your Models

> **Free-tier note (2026):** Hugging Face now requires **PRO** for Gradio/Docker Spaces. Free accounts only get **Static** Spaces, which **cannot** run this FastAPI ML API.
>
> **Free alternative:** skip this Space. Leave backend `HF_API_URL` empty and use **Gemini Tier 3** only (see `free_tier_deployment_guide.md` Step 2).
>
> Use this guide only if you subscribe to HF PRO, or if you deploy this folder on another host (Railway / Fly / Koyeb) and set that URL as `HF_API_URL`.

Your trained weights already exist in the repo. Inference-only copies are in `cybersentinel-ml-api/models/` (ready to upload).

## What to upload

Upload the **whole** `cybersentinel-ml-api/` folder as the Space root:

```text
cybersentinel-ml-api/
├── Dockerfile
├── main.py
├── hf_text_url_inference.py
├── hf_deepfake_inference.py
├── requirements.txt
└── models/
    ├── Phishing_url/
    │   ├── best_model.pkl
    │   └── best_preprocessor.pkl
    ├── Phishing_text_model_text/
    │   ├── best_model.pkl
    │   └── best_preprocessor.pkl
    └── Deepfake_model/
        └── best_model_scripted.pt
```

Source of these files (repo root):

| Space path | Copied from |
| :--- | :--- |
| `models/Phishing_url/*` | `models/Phishing_url/best_model.pkl` + `best_preprocessor.pkl` |
| `models/Phishing_text_model_text/*` | `models/Phishing_text_model_text/best_model.pkl` + `best_preprocessor.pkl` |
| `models/Deepfake_model/best_model_scripted.pt` | `models/Deepfake_model/best_model_scripted.pt` |

Do **not** upload EDA charts / PNGs — they are not used at inference time.

If you ever need to re-copy from root `models/`:

```powershell
$src = "d:\CyberShield AI\models"
$dst = "d:\CyberShield AI\cybersentinel-ml-api\models"
New-Item -ItemType Directory -Force -Path "$dst\Phishing_url","$dst\Phishing_text_model_text","$dst\Deepfake_model" | Out-Null
Copy-Item "$src\Phishing_url\best_model.pkl","$src\Phishing_url\best_preprocessor.pkl" "$dst\Phishing_url\"
Copy-Item "$src\Phishing_text_model_text\best_model.pkl","$src\Phishing_text_model_text\best_preprocessor.pkl" "$dst\Phishing_text_model_text\"
Copy-Item "$src\Deepfake_model\best_model_scripted.pt" "$dst\Deepfake_model\"
```

## Create the Space (UI)

1. Open https://huggingface.co/new-space  
2. **Space name:** e.g. `cybersentinel-engine`  
3. **SDK:** Docker  
4. **Hardware:** CPU basic (free)  
5. Create the Space  

## Upload files (UI)

1. Open the Space → **Files** tab  
2. Upload / commit every file under `cybersentinel-ml-api/` so the Space root matches the tree above  
3. Wait for the Docker build to finish  

## Upload files (CLI)

```bash
pip install huggingface_hub
huggingface-cli login
cd cybersentinel-ml-api
huggingface-cli upload YOUR-HF-USERNAME/cybersentinel-engine . . --repo-type=space
```

## Verify

1. Open: `https://YOUR-HF-USERNAME-cybersentinel-engine.hf.space`  
2. Expect: `{"status":"ML Engine Online"}`  
3. Optional smoke tests:
   - `POST /predict/url` with `{"url":"http://example.com"}`
   - `POST /predict/text` with `{"text":"..."}`
   - `POST /predict/image` with a file upload  

## Connect to the main backend

On Render (or local `.env`), set:

```env
HF_API_URL=https://YOUR-HF-USERNAME-cybersentinel-engine.hf.space
```

No trailing slash. Restart the backend after setting it.

The backend calls:

- `POST {HF_API_URL}/predict/url`
- `POST {HF_API_URL}/predict/image`

(and the Space also exposes `/predict/text` and `/predict/prompt` for future use).
