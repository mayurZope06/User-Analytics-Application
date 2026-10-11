const express = require('express');
const cors = require('cors');
const path = require('path');
const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for the client tracking script and dashboard
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static file hosting for the client tracker script and demo pages
const clientTrackerDir = path.join(__dirname, '../../client-tracker');
app.use('/client-tracker', express.static(clientTrackerDir));
app.use('/demo', express.static(path.join(clientTrackerDir, 'demo')));

// Serve tracker.js directly at /tracker.js for easy embedding
app.get('/tracker.js', (req, res) => {
  res.sendFile(path.join(clientTrackerDir, 'tracker.js'));
});

// API Routes
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CausalFunnel User Analytics API'
  });
});

// Root welcome & API index
app.get('/', (req, res) => {
  res.json({
    name: 'CausalFunnel User Analytics Backend API',
    endpoints: {
      postEvents: 'POST /api/events',
      listSessions: 'GET /api/sessions',
      sessionEvents: 'GET /api/sessions/:sessionId',
      pageClicks: 'GET /api/events/clicks?url=:pageUrl',
      trackedPages: 'GET /api/events/pages',
      demoStore: 'http://localhost:5000/demo/index.html',
      demoPricing: 'http://localhost:5000/demo/pricing.html',
      trackerScript: 'http://localhost:5000/tracker.js'
    }
  });
});

module.exports = app;
