## CyberSentinel AI – Architecture Diagrams (PlantUML)

All diagrams use a light, professional theme (white background, blue primary accents) and are saved as separate `.puml` files in the `doc` folder. You can render them with any PlantUML tool.

- **System Context Diagram**  
  File: `architecture_context.puml`  
  Shows the overall ecosystem: user, browser/extension, React dashboard, FastAPI backend, Gemini agents, security APIs, and MongoDB.

- **Backend & AI Agent Components**  
  File: `architecture_backend_agents.puml`  
  Details FastAPI modules, detection services, Gemini agent clients, threat router, risk engine, and MongoDB.

- **Frontend & Browser Extension Components**  
  File: `architecture_frontend_extension.puml`  
  Breaks down React views (scan, history, analytics, detail, assistant widget) and Chrome extension parts (background, content script, popup, context menu).

- **URL Threat Analysis Sequence Flow**  
  File: `architecture_url_sequence.puml`  
  Sequence diagram for end‑to‑end URL scanning: from browser and extension through backend, Gemini, Safe Browsing, VirusTotal, risk engine, and back to UI.

- **Threat Event Data Model**  
  File: `architecture_data_model.puml`  
  Class diagram for MongoDB collections: `ThreatEvent`, `Indicators`, `ExternalFlags`, `Explanation`, and `Recommendations`.

Use these files directly in PlantUML to generate PNG/SVG diagrams for your documentation or presentation.

