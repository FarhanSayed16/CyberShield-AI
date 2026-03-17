# 🛡️ CyberSentinel AI (Project CyberShield)

**CyberSentinel AI** is an advanced, AI-powered cyber defense and threat intelligence platform designed to actively protect users from sophisticated cyber threats such as zero-day phishing, AI-generated deepfakes, and prompt injection attacks. 

It provides enterprise-grade observability through a React-based security dashboard, backed by a FastAPI engine that orchestrates multiple machine learning models (PyTorch, Scikit-learn, Hugging Face) and Generative AI (Google Gemini 2.5) for instant threat narrative generation. It also features a real-time browser extension that monitors network traffic and provides an omnipresent "Quickball" security assistant.

## ✨ Key Features

### 🧠 Multi-Tier AI Analysis
- **Tier 1 (Local Heuristics & ML)**: Instantly detects obfuscated adversarial URLs using Scikit-learn models and lexical entropy feature extraction.
- **Tier 2 (Deep Learning)**: Utilizes Hugging Face Transformers (`DistilBERT` for text, `ViT` for images) to classify deepfakes and prompt injection attacks entirely on-device or locally on the server.
- **Tier 3 (Generative AI)**: Leverages the **Google Gemini 2.5 API** through an overarching analytical agent to contextually evaluate multi-vector threats, explain risks in plain english, and generate actionable executive summaries.

### 🌐 Browser Extension & "Quickball" Assistant
- **Real-Time Network Monitoring**: Intercepts HTTP/HTTPS requests at the browser level and scores them proactively.
- **Quickball UI**: A draggable, minimalist floating widget embedded on every web page, giving users immediate access to site risk scores, AI chat interactions, and deepfake media scanning capabilities without leaving their workflow.
- **Voice-Activated Commands**: Interact with the security chatbot organically using integrated Web Speech APIs.

### 📊 Enterprise Dashboard
- **Threat Intelligence Board**: Live WebSocket feeds pushing new IOCs (Indicators of Compromise) instantly to the React frontend.
- **Geographic Threat Maps**: Visualizes the origin and intensity of cyber attacks utilizing interactive map projections.
- **Threat Diffing**: Select any two historical scans to generate a comparative analysis and "Risk Delta" over time.
- **Federated Threat Sharing**: Cryptographically anonymizes (SHA-256) domain indicators and syndicates them to a MongoDB-backed global intelligence feed.

### 🛡️ Automated Governance
- **Deterministic Rule Engine**: An intuitive UI builder allowing security admins to craft strict IF/THEN overrides (e.g., `IF domain ENDS_WITH '.ru' THEN Score = 100`) that supersede AI conclusions.
- **Automated Remediation Playbooks**: Automatically parses threat topologies to statically generate 3-step mitigation plans paired with a guided "Fix It" UX wizard.

---

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Recharts, Zustand (State Management)
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Asyncio, Motor (Async MongoDB), Beanie ODM
- **Machine Learning**: PyTorch, Scikit-Learn, Joblib, Hugging Face Transformers
- **LLM Integrations**: Google Generative AI (Gemini 2.5 Flash Lite)
- **Database**: MongoDB (Atlas or Local)
- **Browser Extension**: Manifest V3, Vanilla JavaScript, CSS

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.10+)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas cloud cluster)
- Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Database Setup
Ensure MongoDB is running locally on `mongodb://localhost:27017` or obtain your Atlas connection string.

### 2. Backend Setup
Navigate to the `backend` directory and install the Python dependencies.

```bash
cd backend
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
# Core settings
API_KEY=your_secure_api_key_here
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,chrome-extension://<your-extension-id>
ENVIRONMENT=development

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=cybersentinel

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
HF_TOKEN=your_huggingface_token (Optional for gated models)

# Deepfake & Models Storage paths
DEEPFAKE_UPLOAD_DIR=./uploads/deepfakes
MODELS_DIR=../models
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
*Note: The first startup will download the Hugging Face transformer pipeline weights (approx 1-2GB) automatically if they are not already cached.*

### 3. Frontend Setup
Navigate to the `frontend` directory and start the Vite development server.

```bash
cd frontend
npm install

# Start the dashboard
npm run dev
```
The dashboard will be available at [http://localhost:5173](http://localhost:5173).

### 4. Browser Extension Setup
The extension hooks directly into the backend to analyze the pages you visit.

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** on (top right corner).
3. Click **Load unpacked** and select the `extension/` folder in this repository.
4. Pin the **CyberShield AI** extension to your toolbar.
5. In the extension popup, ensure the **API URL** is pointing to `http://localhost:8000` and enter the `API_KEY` defined in your backend `.env` file.

---

## 📡 API Documentation
Once the backend is running, the interactive Swagger documentation is automatically generated by FastAPI.
Visit: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📜 License
This project is open-source and available under the MIT License.
