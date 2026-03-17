# PhishGuard AI Suite - Project Documentation

## Overview
PhishGuard AI Suite is a comprehensive AI-powered application designed to detect and analyze various digital threats. It provides a user interface to analyze text, URLs, and media files for phishing attempts, deepfakes, prompt injections, and behavioral anomalies. 

The application utilizes Google's Gemini AI (`gemini-3-flash-preview`) to perform heuristic analysis based on custom-crafted system prompts tailored for each specific threat category.

## Project Architecture

The architecture is divided into two main components:
1. **Frontend (React + Vite + TailwindCSS)**: Provides a dark-themed, premium UI for users to submit payloads and view detailed analysis results, risk scores, and mitigation steps.
2. **Backend (FastAPI - Optional/Alternative)**: An optional Python FastAPI backend (`backend/api.py`) that replicates the AI analysis logic for environments where a dedicated backend server is desired (e.g., for serving a Chrome Extension). Alternatively, the frontend can call the Gemini API directly using the `@google/genai` SDK in the browser if the API key is provided.

### Technology Stack
- **Frontend Framework**: React 19, Vite
- **Styling**: TailwindCSS v4, Lucide React (Icons), Motion (Animations)
- **Backend Framework**: Python, FastAPI, Uvicorn (Development Server)
- **AI Integration**: Google GenAI SDK (`@google/genai` on frontend, `google-genai` on backend)
- **Types**: TypeScript ensuring strict schema definitions matching the AI's expected JSON output.

---

## Component Breakdown

### 1. Frontend: User Interface (`src/App.tsx`)
The main application is a single-page interface consisting of:
- **Navigation/Tabs**: Four distinct tabs for different analysis modes:
  - Phishing Detection
  - Deepfake Detection (supports image, audio, and video uploads)
  - Prompt Injection
  - Behavior Anomaly
- **Input Section**: A text area mimicking a JSON payload editor, populated with predefined sample inputs for quick testing. For deepfakes, it includes a drag-and-drop file uploader.
- **Analysis Execution**: Triggers the respective service functions, rendering loading states.
- **Results Dashboard**: Displays the parsed JSON response from Gemini, dynamically rendering:
  - Overall Risk Score & Assessment Level (Low, Medium, High, Critical)
  - Text explanation of the AI's reasoning.
  - Detected indicators of compromise (IoCs), suspicious phrases, malicious payloads, context specific artifacts.
  - Recommended mitigation actions.

### 2. Frontend: Services & AI Integration (`src/services/geminiService.ts`)
This module handles direct communication with the Gemini API.
- **Initialization**: Retrieves `GEMINI_API_KEY` from environment variables.
- **System Prompts**: Embeds extremely detailed system instructions containing:
  - Strict detection rules and signals.
  - Risk scoring logic formulas.
  - Explainability requirements.
  - Enforced JSON output schemas.
- **Analysis Functions**:
  - `analyzePhishing(input)`
  - `analyzeDeepfake(input, media)`: Handles multipart requests for analyzing images, video, and audio encoded in base64.
  - `analyzePromptInjection(input)`
  - `analyzeBehaviorAnomaly(input)`
- **Response Parsing**: Extracts the JSON payload from the markdown block returned by Gemini and strictly casts it to the TypeScript interfaces.

### 3. Data Models (`src/types.ts`)
TypeScript interfaces dictating the exact structure of the requests and the expected AI responses:
- `PhishingAnalysis`
- `DeepfakeAnalysis`
- `PromptInjectionAnalysis`
- `BehaviorAnomalyAnalysis`
- `MediaPayload` (for deepfake media uploads)

### 4. Local Result Saving (Vite Middleware)
The `vite.config.ts` file includes a custom middleware (`/api/save-result`) that intercepts outgoing save requests from the React app and writes the AI analysis results locally to an `analysis_results/` directory as JSON files. This acts as an automated logging system for executed analyses.

### 5. Backend: FastAPI Server (`backend/api.py`)
Provides identical analysis capabilities as the React frontend but through RESTful endpoints.
- **Endpoints**:
  - `POST /analyze/phishing`
  - `POST /analyze/deepfake`
  - `POST /analyze/prompt-injection`
  - `POST /analyze/behavior-anomaly`
  - `GET /health` (Status Check)
- **CORS Setup**: Fully permissive CORS for seamless communication with browser-based clients (like Chrome extensions).
- **Execution**: Runs on port 8000 via Uvicorn. Loads the `GEMINI_API_KEY` from the root `.env` file.

---

## How the AI Works (The Core Logic)

The absolute core of this application revolves around the concept of **System Instructions** provided to the `gemini-3-flash-preview` model. 

For every request type, the AI is instructed to:
1. Adopt a specific highly-skilled persona (e.g., "advanced Phishing Detection AI Agent").
2. Validate against a strict checklist of detection rules (e.g., checking for urgency language, checking domain mismatch, visual artifacts).
3. Calculate a structured risk score mathematically (0-100).
4. Assign a Risk Level (LOW to CRITICAL).
5. Output the justification and extracted artifacts strictly as a JSON object that matches the predefined app schema.

This deterministic approach ensures that the output is always machine-readable and easily rendered by the React application without needing complex parsing of unstructured text.

---

## Setting Up and Running

### Prerequisites
1. Node.js (v18+)
2. Python (3.10+)
3. Google Gemini API Key

### Configuration
1. Create a `.env` file in the root directory.
2. Add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### Running the Frontend UI
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the browser to the provided localhost URL (usually port 3000).

### Running the Backend Server (Optional)
The backend is useful if you are building the Chrome Extension or sending requests from external tools.
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python api.py
   ```
   *The server runs on http://0.0.0.0:8000*

---

> This documentation serves as a comprehensive guide for developers aiming to understand, duplicate, or expand the PhishGuard AI platform. When training a new agent to build a similar project, supply this document to enforce the architectural patterns, system prompt engineering, and strict typing schemas critical to this project's success.
