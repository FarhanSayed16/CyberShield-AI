# 07 — Frontend Specification

## Stack
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS v3
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP:** Axios
- **Routing:** React Router v6
- **State:** React Context + useState (no Redux for MVP)

---

## Setup Commands

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom axios recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**`tailwind.config.js`:**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          500: '#3b5bdb',
          600: '#364fc7',
          900: '#1e2a78',
        }
      }
    }
  },
  plugins: [],
}
```

---

## File Structure

```
frontend/src/
├── main.jsx                    # App entry, router setup
├── App.jsx                     # Route definitions
├── api/
│   └── client.js               # Axios instance + interceptors
├── context/
│   └── AuthContext.jsx          # User session state
├── hooks/
│   ├── useEvents.js             # Events data hook
│   └── useWebSocket.js          # Live updates hook
├── pages/
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── AcceptInvite.jsx
│   ├── Dashboard.jsx
│   ├── Events.jsx
│   ├── Alerts.jsx
│   ├── Users.jsx
│   └── Settings.jsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   └── AppShell.jsx
│   ├── dashboard/
│   │   ├── StatCard.jsx
│   │   ├── UsageLineChart.jsx
│   │   ├── PlatformPieChart.jsx
│   │   ├── TopUsersTable.jsx
│   │   └── RecentAlerts.jsx
│   ├── events/
│   │   ├── EventTable.jsx
│   │   ├── EventFilters.jsx
│   │   ├── EventDetailModal.jsx
│   │   └── RiskBadge.jsx
│   ├── alerts/
│   │   ├── AlertList.jsx
│   │   └── SeverityBadge.jsx
│   ├── users/
│   │   ├── UserTable.jsx
│   │   └── InviteModal.jsx
│   └── common/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Modal.jsx
│       ├── Spinner.jsx
│       └── EmptyState.jsx
```

---

## Route Map

```
/login                → Login.jsx          (public)
/signup               → Signup.jsx         (public)
/accept-invite/:token → AcceptInvite.jsx   (public)

/                     → Dashboard.jsx      (protected, admin+manager)
/events               → Events.jsx         (protected, all roles)
/alerts               → Alerts.jsx         (protected, admin+manager)
/users                → Users.jsx          (protected, admin)
/settings             → Settings.jsx       (protected, admin)
/admin/verify         → AdminVerify.jsx    (protected, admin only)
```

---

## `AdminVerify.jsx` (Organization pipeline check)

**Purpose:** Let org admin confirm employee monitoring pipeline works (API, MongoDB, ingest, DLP, extension tokens).

**Sections:** Health cards | Auth info | Extension tokens (copy) | Synthetic ingest button | DLP fixture table | Live event tail (5s poll)

**APIs:** `GET /api/admin/health/detailed`, `POST /api/admin/verify/ingest-test`, `GET /api/admin/verify/dlp-fixtures`, `GET /api/events?limit=10`

Full spec: [`19_ADMIN_VERIFY_DASHBOARD.md`](19_ADMIN_VERIFY_DASHBOARD.md)

---

## `api/client.js`

```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
});

// Attach JWT token to all requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (token expired → redirect to login)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
```

---

## `context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      client.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('access_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## Page Specifications

### `pages/Login.jsx`

**Layout:** Centered card, 400px wide, vertically centered on page.

**Elements:**
- AISentinel logo + name (top)
- H1: "Welcome back"
- Email input
- Password input (with show/hide toggle)
- "Sign in" button (full width, brand blue)
- "Forgot password?" link (below button — not functional in MVP)
- "Don't have an account? Sign up" link at bottom

**Behavior:**
- On submit: call `auth.login()` from context
- Loading state: button shows spinner, disabled
- Error: show red banner with message
- On success: redirect to `/`

---

### `pages/Dashboard.jsx`

**Layout:** Two-column grid on large screen, single column on mobile.

**Section 1 — Stat Cards Row (4 cards):**

| Card | Value | Icon | Color |
|------|-------|------|-------|
| Prompts Today | count | MessageSquare | Blue |
| Active Users | count | Users | Green |
| Open Alerts | count | AlertTriangle | Orange (>0) or Gray |
| Critical Findings | count | ShieldAlert | Red (>0) or Gray |

Each card shows: value + label + % change vs yesterday (↑↓).

**Section 2 — Usage Over Time Chart:**
- Recharts `LineChart`
- X axis: last 7 days (date labels)
- Two lines: "Prompts" (blue) and "Flagged" (orange)
- Tooltip showing exact values on hover
- Legend below chart

**Section 3 — Two column row:**
- Left: Platform Breakdown (`PieChart` — ChatGPT vs Claude vs Gemini vs API)
- Right: Top Users table (Name | Prompts | Alerts | Risk avg)

**Section 4 — Recent Alerts:**
- Last 5 alerts, severity badge, user name, time
- "View all" link to `/alerts`

**Data fetching:**
```jsx
useEffect(() => {
  Promise.all([
    client.get('/api/dashboard/summary'),
    client.get('/api/dashboard/usage-over-time?period=7d'),
    client.get('/api/dashboard/platform-breakdown'),
    client.get('/api/dashboard/top-users?limit=5'),
    client.get('/api/alerts?status=open&per_page=5'),
  ]).then(([summary, usage, platforms, topUsers, alerts]) => {
    setSummary(summary.data);
    setUsage(usage.data.series);
    // ... etc
  });
}, []);
```

---

### `pages/Events.jsx`

**Layout:** Full-width table with filters sidebar or filter bar on top.

**Filter bar (top):**
- Date range picker (from / to)
- Platform dropdown (All | ChatGPT | Claude | Gemini | API)
- User dropdown (All | specific user) — admin only
- Risk score slider (0–100)
- Status dropdown (All | Clean | Flagged | Reviewed)
- Search input (prompt text search)

**Table columns:**
| Column | Notes |
|--------|-------|
| Time | Relative ("2 min ago") + full on hover |
| User | Avatar initials + name |
| Platform | Icon + name |
| Prompt Preview | First 80 chars, truncated |
| Risk Score | Colored pill (green 0–30, yellow 31–60, orange 61–80, red 81–100) |
| Categories | Small tags (EMAIL, API_KEY, etc.) |
| Actions | "View" button → opens detail modal |

**Event Detail Modal:**
- Full prompt text (with sensitive matches highlighted in yellow)
- DLP Findings list (type, severity, redacted value)
- User info
- Timestamp + platform
- Mark as reviewed / false positive buttons

**Pagination:** "Load more" button at bottom (not page numbers).

---

### `pages/Alerts.jsx`

**Layout:** List with summary counts at top.

**Summary bar:**
- 3 count badges: Open | Acknowledged | Critical

**Alert list item:**
- Severity badge (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=gray)
- Alert title
- User name + platform + time
- "View Event" button → links to event detail
- "Acknowledge" button (for open alerts)
- Acknowledged by + time (if already acknowledged)

**Filter:** severity, status, date range.

---

### `pages/Users.jsx`

**Layout:** Table + "Invite User" button top right.

**Table columns:**
| Column | Notes |
|--------|-------|
| Name | With avatar initials |
| Email | |
| Role | Dropdown to change (admin only) |
| Status | Active / Pending / Suspended badge |
| Extension | Installed / Not configured (based on last event) |
| Prompts Today | Count |
| Last Active | Relative time |
| Actions | Remove from org |

**Invite Modal:**
- Email input
- Name input
- Role selector
- "Send Invite" button
- Shows success message with copy-able invite link as fallback

**User token display:**
- Each user has a "View Token" button → shows `user_token` for extension setup
- Admin can copy token and share with employee

---

### `pages/Settings.jsx`

**Sections:**

**1. Organization**
- Org name (editable)
- Org slug (read-only)
- Save button

**2. API Keys**
- `Org API Key` — for extension auth (copy + regenerate)
- `Proxy API Key` — for developer API proxy (copy + regenerate)
- Warning: regenerating invalidates old key

**3. DLP Custom Patterns**
- Table: Pattern name | Regex | Severity | Active toggle | Delete
- "Add Pattern" button → form with: name, regex pattern, severity, description
- Regex test field: paste sample text to test pattern

**4. Notifications**
- Alert email (input)
- Toggle: send email on CRITICAL finding
- Toggle: daily digest email

**5. Danger Zone**
- Delete organization (with confirmation dialog, type org name)

---

## `components/common/RiskBadge.jsx`

```jsx
export function RiskBadge({ score }) {
  const config = score >= 80
    ? { color: 'bg-red-100 text-red-800', label: 'Critical' }
    : score >= 60
    ? { color: 'bg-orange-100 text-orange-800', label: 'High' }
    : score >= 30
    ? { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' }
    : { color: 'bg-green-100 text-green-700', label: 'Low' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {score} · {config.label}
    </span>
  );
}
```

---

## `hooks/useWebSocket.js`

```javascript
import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(orgId, onEvent) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/events/${orgId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        onEvent(event);
      } catch {}
    };

    wsRef.current.onclose = () => {
      // Reconnect after 3s
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, [orgId, onEvent]);

  useEffect(() => {
    if (!orgId) return;
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectRef.current);
    };
  }, [orgId, connect]);
}
```

---

## Design Tokens

```css
/* globals.css */
:root {
  --brand-primary: #3b5bdb;
  --brand-hover: #364fc7;
  --surface: #ffffff;
  --surface-muted: #f8f9fa;
  --border: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --success: #2f9e44;
  --warning: #e67700;
  --danger: #c92a2a;
  --radius: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
}
```

---

## Responsive Breakpoints

- **Mobile (< 640px):** Single column, sidebar hidden, bottom navigation
- **Tablet (640–1024px):** Collapsible sidebar, 2-col grid
- **Desktop (> 1024px):** Fixed sidebar, full grid layout

---

## Environment Variables

```env
# frontend/.env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Production
VITE_API_URL=https://api.aisentinel.io
VITE_WS_URL=wss://api.aisentinel.io
```
