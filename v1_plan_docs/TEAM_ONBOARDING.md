# Team onboarding (&lt; 30 minutes)

Repo: **https://github.com/Monike123/aiextinct** (private — ask for an invite).

## Checklist

### 1. Access (2 min)

- [ ] Accept GitHub invite from the owner
- [ ] Clone:

```bash
git clone https://github.com/Monike123/aiextinct.git
cd aiextinct
```

### 2. Run locally (5–10 min)

**Windows**

```powershell
.\run-local.ps1
```

Or start API + frontend manually (see [README.md](../README.md)).

- [ ] Open http://localhost:5173 — login `admin@demo.com` / `password`
- [ ] Open http://localhost:8000/docs — health OK

### 3. Extension (5 min)

- [ ] `chrome://extensions` → Developer mode → Load unpacked → `aisentinel/extension`
- [ ] Popup: API `http://localhost:8000`, org `aisnl_org_demo123`, user `aisnl_usr_admin123`
- [ ] Send **one** short prompt on ChatGPT
- [ ] Dashboard **Events**: exactly **one** new row; open it — activity log present
- [ ] Wait for AI reply — **AI response** section appears (may take a few seconds)

### 4. Read the map (10 min)

- [ ] [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] [DATA_FLOWS.md](DATA_FLOWS.md)
- [ ] Skim [Plan/20_ORG_EMPLOYEE_MONITORING.md](../Plan/20_ORG_EMPLOYEE_MONITORING.md)

### 5. Optional: critical alert actions

- [ ] Create / find a HIGH/CRITICAL alert
- [ ] **Acknowledge…** → try acknowledge only (confirm toast)
- [ ] On a second machine/profile with employee token, try close tabs / blackout (extension must be installed)

## Common pitfalls

| Symptom | Fix |
|---------|-----|
| No events | Extension tokens / API URL; reload extension; use chatgpt.com |
| Many events per one send | Pull latest; reload extension; restart API (old memory DB may have duplicates) |
| Empty dashboard after restart | Memory backend wiped — normal; re-seed / restart `run-local.ps1` |
| Acknowledge “nothing” | Use latest frontend; look for modal + toast |
| Google Search silent | Reload extension (Google hosts in manifest) |

## Need help?

Ask in the team channel with: OS, whether API health returns OK, and a screenshot of the extension popup config (no secrets beyond demo tokens).
