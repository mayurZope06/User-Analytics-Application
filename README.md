# CausalFunnel - User Analytics Application

A full-stack user interaction tracking and analytics application built for the **Full Stack Engineer** technical assessment.

This project captures user interactions (`page_view`, `click` events with exact coordinates) on client webpages using a lightweight JavaScript tracking snippet, ingests and aggregates them in a Node.js/MongoDB backend, and visualizes them on a modern React analytics dashboard featuring **User Journeys** and interactive **Click Heatmaps** (Canvas Gradient, Dots Scatter, and Grid Matrix).

---

## 📑 Table of Contents
1. [Tech Stack](#-tech-stack)
2. [Architecture Overview](#-architecture-overview)
3. [Features & Requirements Checklist](#-features--requirements-checklist)
4. [Setup & Installation](#-setup--installation)
5. [API Documentation](#-api-documentation)
6. [Client Tracking Script Guide](#-client-tracking-script-guide)
7. [Heatmap Implementation Details](#-heatmap-implementation-details)
8. [Assumptions & Trade-offs](#-assumptions--trade-offs)

---

## 🛠 Tech Stack

- **Client-Side Tracking:** Vanilla JavaScript (IIFE, zero external dependencies, beacon API + fetch fallback, localStorage & cookie session persistence).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB & Mongoose (with automated in-memory fallback for instant zero-config evaluation if MongoDB daemon is offline).
- **Frontend Dashboard:** React 18, Vite, Lucide React icons, Vanilla CSS Design System with dark mode glassmorphism.
- **Containerization:** Docker & Docker Compose (`docker-compose.yml`).

---

## 🏛 Architecture Overview

```
d:\Project\
├── client-tracker/          # Standalone client tracking script & demo store
│   ├── tracker.js           # Lightweight embeddable tracking snippet
│   └── demo/
│       ├── index.html       # Flagship store demo page with tracking
│       └── pricing.html     # Pricing tier demo page for multi-page flows
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── config/db.js     # MongoDB connection with resilient fallback
│   │   ├── models/Event.js  # Mongoose Schema with compound indexes
│   │   ├── services/        # Aggregation pipelines & business logic
│   │   ├── routes/          # Express REST API routes
│   │   ├── app.js           # Express application configuration & static serving
│   │   └── server.js        # Server bootstrap & sample data seeding
│   ├── package.json
│   └── Dockerfile
├── dashboard/               # React Analytics Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Header, live indicator, data seed/clear
│   │   │   ├── StatsOverview.jsx        # KPI metric cards
│   │   │   ├── SessionsView.jsx         # Sessions list with filters & duration
│   │   │   ├── SessionJourneyModal.jsx  # Chronological user journey timeline
│   │   │   ├── HeatmapView.jsx          # Canvas gradient, dots, & grid modes
│   │   │   └── LiveTestbench.jsx        # Embedded split-screen interactive test store
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Production-ready containerized orchestration
└── README.md
```

---

## ✅ Requirements Checklist

| Requirement | Implementation Status | Highlights |
|---|---|---|
| **JavaScript Tracking Script** | ✅ Complete (`client-tracker/tracker.js`) | Standalone IIFE, zero dependencies, < 4KB |
| **Track `page_view`** | ✅ Complete | Captures URL, path, page title, referrer, viewport WxH |
| **Track `click`** | ✅ Complete | Captures document `(x, y)`, client `(x, y)`, percentage `(xPct, yPct)`, target tag, ID, text |
| **Session ID** | ✅ Complete | UUID generated and synced across `localStorage` and `cookie` |
| **Backend API (Node.js)** | ✅ Complete (`server/`) | Express.js with JSON parser, CORS, and static file hosting |
| **Store in MongoDB** | ✅ Complete (`server/src/models/Event.js`) | Mongoose schema with compound indexes on `(sessionId, timestamp)` and `(pageUrl, eventType)` |
| **List Sessions API** | ✅ Complete (`GET /api/sessions`) | MongoDB aggregation computing total events, views, clicks, duration, and last active |
| **Session Events API** | ✅ Complete (`GET /api/sessions/:id`) | Chronological ordered event history for that session |
| **Page Clicks API** | ✅ Complete (`GET /api/events/clicks`) | Returns click coordinates filtered by URL & session for heatmap |
| **React Dashboard** | ✅ Complete (`dashboard/`) | Modern enterprise React 18 + Vite dashboard with dark glassmorphism |
| **Sessions View** | ✅ Complete | Lists all sessions with search, sorting (recent, events, duration), multi-page filters, and duration badges |
| **User Journey Modal** | ✅ Complete | Chronological timeline with route breadcrumbs, step filters, relative time offsets, coordinate inspector, and JSON export |
| **Heatmap View** | ✅ Complete | HTML5 Canvas gradient heatmap, interactive scatter dots with pulsar rings & inspector tooltips, and simple grid density matrix |
| **Live Traffic Simulator** | ✅ Complete | One-click simulation injecting real-time multi-step user sessions with live auto-refresh |
| **CSV Analytics Export** | ✅ Complete | Instant browser export of all session data and behavioral KPIs as CSV |
| **Device Testbench** | ✅ Complete | Split-screen preview with Desktop, Tablet (768px), and Mobile (390px) responsive viewport toggles |
| **Demo Webpage** | ✅ Complete (`client-tracker/demo/`) | Interactive e-commerce demo storefront + pricing tiers page |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- (Optional) MongoDB local or MongoDB Atlas connection string (an in-memory store is included automatically so you can run the app immediately even without MongoDB running!)

### 1. Quick Start (Run Both Server & Dashboard)

Run from the project root:
```bash
# Install root, server, and dashboard dependencies
cd d:\Project
npm install
cd server && npm install
cd ../dashboard && npm install
cd ..

# Start both backend and frontend concurrently
npm run dev
```

- **Backend API:** `http://localhost:5000`
- **Frontend Dashboard:** `http://localhost:5173`
- **Demo Tracked Webpage:** `http://localhost:5000/demo/index.html`

---

### 2. Running Services Separately

**Start the Backend:**
```bash
cd server
npm install
npm start
```

**Start the React Dashboard:**
```bash
cd dashboard
npm install
npm run dev
```

---

### 3. Docker Deployment (Optional)
If Docker is installed:
```bash
docker compose up --build
```

---

## 📡 API Documentation

### 1. Ingest Events
- **Endpoint:** `POST /api/events`
- **Payload:** Single object or batch array:
```json
{
  "session_id": "sess_user_alpha_741",
  "event_type": "click",
  "page_url": "http://localhost:5000/demo/index.html",
  "timestamp": "2026-10-11T12:00:00.000Z",
  "x": 600,
  "y": 330,
  "x_pct": 50.0,
  "y_pct": 32.5,
  "element_tag": "button",
  "element_id": "hero-btn-explore",
  "element_text": "Explore Studio Pro"
}
```

### 2. List All Sessions
- **Endpoint:** `GET /api/sessions`
- **Response:**
```json
{
  "success": true,
  "totalSessions": 3,
  "sessions": [
    {
      "sessionId": "sess_user_alpha_741",
      "totalEvents": 5,
      "pageViews": 2,
      "clicks": 3,
      "durationSeconds": 420,
      "lastSeen": "2026-10-11T12:07:00.000Z"
    }
  ]
}
```

### 3. Fetch Session Journey
- **Endpoint:** `GET /api/sessions/:sessionId` (or `GET /api/sessions/:sessionId/events`)
- **Response:** Chronologically ordered events showing the complete user path.

### 4. Fetch Page Clicks (Heatmap)
- **Endpoint:** `GET /api/events/clicks?url=http://localhost:5000/demo/index.html`
- **Response:** Array of click coordinates and element metadata for rendering.

### 5. Tracked Pages List
- **Endpoint:** `GET /api/events/pages`
- **Response:** Unique tracked URLs with view and click counts for the heatmap selector.

---

## 🎯 Client Tracking Script Guide

Add the script to any webpage before the closing `</body>` tag:
```html
<script src="http://localhost:5000/tracker.js"></script>
```

### JavaScript API:
The tracker exposes a clean `window.CausalTracker` object:
```javascript
// Access active session ID
const currentSession = window.CausalTracker.getSessionId();

// Reset session (e.g. on logout or user switch)
window.CausalTracker.resetSession();

// Track custom funnel event
window.CausalTracker.trackCustomEvent('checkout_started', { cartTotal: 549 });

// Force immediate flush of event queue
window.CausalTracker.flush();
```

---

## 🔥 Heatmap Implementation Details

1. **Coordinate Normalization:**
   - Raw click events capture both absolute document pixels (`pageX`, `pageY`) and relative percentage coordinates (`xPct`, `yPct`).
   - Percentage coordinates enable responsive heatmap rendering across varied browser viewport resolutions.
2. **Visualization Modes:**
   - **Gradient Heatmap:** Uses HTML5 Canvas 2D radial gradient alpha masks colorized through a custom heat lookup table (Blue $\to$ Cyan $\to$ Lime $\to$ Yellow $\to$ Red).
   - **Click Dots:** Displays crisp neon pulsar rings at exact click coordinates with interactive tooltips showing clicked element tag, text, and timestamp.
   - **Simple Grid:** Aggregates clicks into discrete matrix bins with density intensity values.
3. **Live Webpage Backdrop:**
   - The heatmap canvas overlays directly above the live rendered webpage (or preview iframe) with adjustable opacity and blur radius.

---

## ⚖️ Assumptions & Trade-offs

1. **Dual Storage Architecture (Resilient MongoDB + In-Memory Fallback):**
   - *Design Decision:* The backend is built natively with Mongoose schemas, compound indexes, and aggregation pipelines for MongoDB. However, if a developer or reviewer runs the repository without a MongoDB daemon running on `localhost:27017`, the server automatically detects connection refusal within 1.5 seconds and falls back to an in-memory/JSON storage engine with identical API responses.
   - *Trade-off:* Maximizes portability and guarantees zero setup friction for evaluators while maintaining 100% MongoDB compliance when `MONGODB_URI` is provided.
2. **Client-Side Event Debouncing / Micro-batching:**
   - *Design Decision:* Clicks and page views are buffered into an internal queue with an 800ms debounce (or immediate transmission if buffer reaches 5 items or on `beforeunload` via `navigator.sendBeacon`).
   - *Trade-off:* Prevents network flooding on rapid consecutive clicks while guaranteeing delivery when the user leaves the tab.
3. **Session Expiry & Persistence:**
   - *Design Decision:* The session ID is synchronized between `localStorage` and `document.cookie` (with a 30-day cookie fallback and 30-minute inactivity boundary check).
   - *Trade-off:* Provides maximum cross-frame and browser privacy compatibility.
4. **Coordinate Mapping on Dynamic Layouts:**
   - *Design Decision:* Storing both absolute `(x, y)` and normalized `(xPct, yPct)` coordinates.
   - *Trade-off:* Allows responsive scaling for fluid responsive websites while preserving exact coordinate fidelity.
