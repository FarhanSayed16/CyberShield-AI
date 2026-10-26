# Data flows

## 1. Prompt ingest (one real submit → one event)

Duplicate counting was caused by multiple Send-button listeners and race conditions. Current path uses a **single delegated** submit handler, `client_submit_id`, client lock/dedupe, and server-side dedupe.

```mermaid
sequenceDiagram
  participant User
  participant Content as content_js
  participant BG as background_js
  participant API as FastAPI

  User->>Content: Enter_or_Send
  Content->>Content: client_submit_id_and_inflight_lock
  alt duplicate_within_window
    Content-->>Content: skip_ingest
  else first_submit
    Content->>BG: INGEST_EVENT
    BG->>API: POST_api_events
    API->>API: dedupe_by_client_submit_id
    API-->>BG: event_id
    BG-->>Content: ok_event_id
    Content->>Content: watchAssistantResponse
  end
```

**Key files**

- `aisentinel/extension/content.js` — capture + dedupe
- `aisentinel/extension/background.js` — `POST /api/events`, offline queue
- `aisentinel/backend/api/events.py` — ingest + `client_submit_id` lookup

---

## 2. AI response capture + company-data risk

```mermaid
flowchart LR
  Watch[response_monitor_js] -->|UPDATE_EVENT_RESPONSE| BG[background_js]
  BG -->|PATCH_events_id_response| API[events_py]
  API -->|scan_prompt_DLP| DLP[dlp_py]
  DLP --> Event[(Event_response_risk_fields)]
```

After ingest returns `event_id`, the content script watches assistant DOM, debounces streaming text, and patches the same event. Backend reuses DLP scan on `response_text` and can raise overall event risk if the reply contains sensitive patterns.

---

## 3. Manager acknowledge → close tabs / blackout

```mermaid
sequenceDiagram
  participant Mgr as ManagerDashboard
  participant API as alerts_enforcement
  participant Ext as EmployeeExtension
  participant Tabs as AI_Tabs

  Mgr->>API: PATCH_alert_acknowledged_plus_action
  API->>API: insert_EnforcementAction_pending
  Ext->>API: POST_enforcement_pull
  API-->>Ext: close_ai_tabs_or_blackout
  Ext->>Tabs: tabs_remove_or_inject_blackout
  Ext->>API: POST_enforcement_complete
```

**UI:** Alerts → **Acknowledge…** → Acknowledge only / Close all AI tabs / Blackout AI pages (for HIGH/CRITICAL).

**Polling:** extension alarm ~1 minute + opportunistic poll when content scripts load.

---

## 4. Activity log (not extra events)

Clicks, focus, paste, and submit are stored on the **same** event as `activity_log[]`. They must not create additional Event documents.
