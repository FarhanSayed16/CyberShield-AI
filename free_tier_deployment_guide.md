# CyberShield AI: Comprehensive Free-Tier Deployment Guide

Deploying a complex, multi-tier AI application like CyberShield AI entirely on free tiers requires strategic selection of hosting providers, especially due to the heavy memory requirements of local Machine Learning models. 

This guide provides a step-by-step plan to get your project live at zero recurring cost.

---

## 🏗️ Architecture Overview

| Component | Technology | Recommended Free Host | Free Tier Limits |
| :--- | :--- | :--- | :--- |
| **Frontend Dashboard** | React + Vite + TS | **Vercel** / **Netlify** | 100GB bandwidth, serverless execution |
| **Backend API** | FastAPI + Python | **Render** (Web Service) | 512 MB RAM, spins down after 15 mins of inactivity |
| **Database** | MongoDB | **MongoDB Atlas** (M0) | 512 MB Storage, Shared RAM |
| **Generative AI** | Gemini 2.5 API | **Google AI Studio** | 15 RPM, 1 million TPM (Free Tier) |
| **Heavy ML Models** | PyTorch / BERT | **Hugging Face Spaces** | 16 GB RAM, 2 CPU cores (Free Gradio/Docker space) |
| **Browser Extension** | Chrome / MV3 | **Local / Developer Mode** | Free for personal use. ($5 one-time fee for Web Store) |

> [!WARNING]
> **The Render Memory Bottleneck**
> The biggest challenge is the backend. Render's free tier only provides **512 MB of RAM**. Loading local BERT pipelines (`transformers`), PyTorch, and Scikit-Learn pipelines simultaneously **will cause Out-Of-Memory (OOM) crashes** on Render. 
> 
> **Solution Details in Step 3**: We must decouple the heavy Hugging Face models from the main FastAPI server and host them on **Hugging Face Spaces**, or disable local models and rely entirely on Gemini for the free deployment.

---

## Step 1: Database Setup (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Build a Database using the **M0 Free** tier.
3. Choose a provider (AWS/GCP/Azure) and a region closest to your users.
4. **Security Configuration**:
   - Create a Database User with a strong password.
   - Go to **Network Access** and add IP Address `0.0.0.0/0` (Allow access from anywhere) so Render can connect to it.
5. **Get Connection String**:
   - Click "Connect" -> "Drivers" -> Python.
   - Copy the MongoDB URI. Replace `<password>` with your user's password.
   - Example: `mongodb+srv://admin:myStrongPassword@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`

---

## Step 2: Decoupling Heavy AI Models (Hugging Face Spaces)

Because 512MB RAM on Render cannot hold BERT and ViT image processors:

**Option A: Gemini-Only Mode (Easiest)**
Modify `app.core.ai_models.py` to bypass loading local HF Transformers and Scikit-learn models if deployed. Rely exclusively on the Gemini API agents for phishing and deepfake checks.
- *Pros*: Simple, runs easily on Render.
- *Cons*: Higher latency, relies entirely on Google's API limit.

**Option B: Hugging Face Spaces API (Recommended for full feature parity)**
Deploy your ML models as a microservice on Hugging Face for free.
1. Create a free account on [Hugging Face](https://huggingface.co/).
2. Create a new **Space** (choose Docker or FastAPI). HF provides 16GB of RAM for free.
3. Move [ml_url_engine.py](file:///d:/CyberShield%20AI/backend/app/services/ml_url_engine.py), [deepfake_service.py](file:///d:/CyberShield%20AI/backend/app/services/deepfake_service.py), and the `.pkl`/`.pt`/Transformer pipelines to this Space.
4. Expose them via a simple FastAPI wrapper.
5. Update your main Backend to make HTTP requests to your HF Space URL instead of running the models locally.

---

## Step 3: Backend Deployment (Render)

1. Push your code to a GitHub repository.
2. Create an account on [Render](https://render.com/).
3. Click "New" -> "Web Service" -> Build and deploy from a Git repository.
4. Connect your GitHub account and select your CyberShield AI repo.
5. **Configuration**:
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
6. **Environment Variables** (Add these under advanced settings):
   - `MONGO_URI`: (Your Atlas Connection String from Step 1)
   - `GEMINI_API_KEY`: (Your Google AI Studio key)
   - `CORS_ORIGINS`: `https://your-frontend-domain.vercel.app` (Set this after Step 4, or use `*` temporarily)
   - `MODELS_DIR`: `/dev/null` (If using Option A, to prevent loading errors)
7. Deploy. Note that Render free instances spin down after 15 minutes of inactivity and take ~50 seconds to cold boot.

---

## Step 4: Frontend Deployment (Vercel)

Vercel is the easiest and fastest way to host React/Vite applications.

1. Create a free account on [Vercel](https://vercel.com/) and link your GitHub.
2. Click "Add New" -> "Project" -> Import your CyberShield AI repository.
3. **Configuration**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: [dist](file:///d:/CyberShield%20AI/backend/app/api/v1/routes_stats.py#81-122)
4. **Environment Variables**:
   - Configure your [.env](file:///d:/CyberShield%20AI/backend/.env) variables in Vercel. 
   - `VITE_API_BASE_URL`: The URL of your Render backend (e.g., `https://cybershield-backend.onrender.com`)
5. Click **Deploy**. Vercel will give you a live HTTPS URL.
6. **FINAL STEP**: Take the Vercel URL and update the `CORS_ORIGINS` environment variable in your Render backend settings so the API accepts requests from your live dashboard.

---

## Step 5: Browser Extension Deployment

To distribute the extension to clients:

**Option A: Local Developer Mode (Free for internal use)**
1. Zip the `extension` folder.
2. Users can go to `chrome://extensions`, enable "Developer Mode", and click "Load unpacked" to install it.
3. *Note*: You must update [background.js](file:///d:/CyberShield%20AI/extension/background.js) and [content.js](file:///d:/CyberShield%20AI/extension/content.js) to point API requests to your live Render backend URL instead of `localhost:8000`.

**Option B: Chrome Web Store (Public distribution)**
1. Create a Google Chrome Developer account ($5 one-time registration fee).
2. Zip the `extension` folder.
3. Upload the zip file via the Developer Dashboard.
4. Fill out the store listing details and submit for review (can take 24-72 hours).

---

## 💡 Top Tips for Managing Free Tiers

1. **Preventing Backend Sleep**: Free Render instances go to sleep. You can use a free service like [cron-job.org](https://cron-job.org/) to hit your `GET /api/health` endpoint every 14 minutes to keep the backend alive permanently.
2. **Gemini Limits**: The free tier of Gemini limits you to 15 requests per minute. If you batch process URLs, ensure you sleep/delay between API calls to avoid consecutive 429 errors.
3. **Logging**: Render does not persist logs forever on the free tier. Rely on your MongoDB database to store historical threat events and audits.
