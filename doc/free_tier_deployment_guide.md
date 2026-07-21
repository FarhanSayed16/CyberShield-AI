# CyberShield AI: Free-Tier Deployment Guide

Deploy the platform at zero recurring cost by splitting the stack across free hosts.

---

## Architecture Overview

| Component | Technology | Recommended Free Host |
| :--- | :--- | :--- |
| **Frontend Dashboard** | React + Vite + TS | **Vercel** / Netlify |
| **Backend API** | FastAPI + Python | **Render** (Web Service) |
| **Database** | MongoDB | **MongoDB Atlas** (M0) |
| **Generative AI** | Gemini | **Google AI Studio** |
| **Heavy ML Models** | PyTorch / sklearn | **Hugging Face Spaces** |
| **Browser Extension** | Chrome MV3 | Load unpacked (or Chrome Web Store later) |

> **Render memory limit:** Free tier is ~512 MB RAM. Do **not** load Torch/transformers on Render. Heavy models run on Hugging Face Spaces (`cybersentinel-ml-api/`). The main backend only calls Gemini + your HF Space URL.

---

## Step 1: Database (MongoDB Atlas)

1. Create a free **M0** cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a DB user + allow Network Access `0.0.0.0/0` (or Render IPs).
3. Copy the connection string, e.g.  
   `mongodb+srv://USER:PASS@cluster.mongodb.net/cybersentinel?retryWrites=true&w=majority`

**Env name used by code:** `MONGODB_URI` (not `MONGO_URI`).

---

## Step 2: Heavy ML models (important — HF free tier changed)

As of mid‑2026, **new free Hugging Face accounts cannot create Gradio or Docker Spaces**. Only **Static** Spaces stay free. Docker/Gradio require a **PRO** subscription.

**Do not pick Static** for this project — Static cannot run FastAPI/Torch.

### Recommended free path: Gemini-only (no HF Space)

Skip the ML microservice. Leave `HF_API_URL` empty. The backend already falls back safely:

- Tier 1/2 remote ML → skipped / heuristic fallback when `HF_API_URL` is unset  
- Tier 3 → **Google Gemini** (free AI Studio key) handles phishing, URL, prompt, deepfake, anomaly  

On Render, set:

```env
HF_API_URL=
GEMINI_API_KEYS=your-google-ai-studio-key
USE_MOCK_AGENTS=false
```

This is the simplest **fully free** deploy.

### Optional later (if you want local models)

| Option | Cost | Notes |
| :--- | :--- | :--- |
| Hugging Face PRO + Docker Space | Paid (~PRO) | Upload `cybersentinel-ml-api/` — see `cybersentinel-ml-api/HF_UPLOAD_GUIDE.md` |
| Second host with more RAM | Often paid / trials | Railway, Fly.io, Koyeb — deploy `cybersentinel-ml-api` there, set `HF_API_URL` |
| Light sklearn-only API | Free on Render if it fits 512MB | URL/text `.pkl` only — no Torch/deepfake |

Your model files are already prepared under `cybersentinel-ml-api/models/` when you need them.

---

## Step 3: Backend (Render)

1. Push this repo to GitHub.
2. Render → **New Web Service** → select the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment variables (names must match code):

| Variable | Example / notes |
| :--- | :--- |
| `MONGODB_URI` | Atlas connection string |
| `DB_NAME` | `cybersentinel` |
| `GEMINI_API_KEYS` | Your Google AI Studio key (comma-separated if multiple). **Not** `GEMINI_API_KEY`. |
| `HF_API_URL` | `https://YOUR-USERNAME-cybersentinel-engine.hf.space` |
| `API_KEY` | Long random secret (do **not** leave `dev-key` in production) |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` (add `http://localhost:5173` if you still develop locally) |
| `USE_MOCK_AGENTS` | `false` |
| `NVIDIA_API_KEY` | Optional; leave empty if unused |
| `SAFE_BROWSING_API_KEY` / `VIRUSTOTAL_API_KEY` / etc. | Optional Tier-2 enrichers |

5. Deploy. Note Render free instances sleep after ~15 minutes idle.

---

## Step 4: Frontend (Vercel)

1. Vercel → Import repo → **Root Directory:** `frontend`
2. Framework: Vite. Build: `npm run build`. Output: `dist`
3. Environment variables (set **before** build — Vite bakes `VITE_*` at build time):

| Variable | Example |
| :--- | :--- |
| `VITE_API_URL` | `https://your-backend.onrender.com` (no trailing slash). **Not** `VITE_API_BASE_URL`. |
| `VITE_API_KEY` | Same value as backend `API_KEY` |
| `VITE_USE_MOCKS` | `false` |

4. Deploy. Copy the Vercel URL.
5. Go back to Render and set `CORS_ORIGINS` to that Vercel URL (comma-separated if multiple).

Local production-style build reference: see `frontend/.env.production.example`.

---

## Step 5: Browser Extension

1. Chrome → `chrome://extensions` → Developer Mode → **Load unpacked** → select `extension/`.
2. Open the extension popup → set:
   - API URL: `https://your-backend.onrender.com/api`
   - API key: same as backend `API_KEY`
3. Save. Dashboard “Open Full Dashboard” may still point at localhost until you edit those links for production (optional).

---

## Tips

1. Keep Render awake: ping `GET /api/health` every ~14 minutes (e.g. cron-job.org).
2. Gemini free tier rate limits (~15 RPM) — avoid aggressive batching.
3. Store history in MongoDB; do not rely on Render logs alone.

---

## Quick env name cheat sheet

| Wrong / outdated | Correct (used by code) |
| :--- | :--- |
| `MONGO_URI` | `MONGODB_URI` |
| `GEMINI_API_KEY` | `GEMINI_API_KEYS` |
| `VITE_API_BASE_URL` | `VITE_API_URL` |
| (missing) | `HF_API_URL` |
