const express = require('express');
const cors = require('cors');
const path = require('path');
const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');

const { isMongoConnected } = require('./config/db');
const eventService = require('./services/eventService');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for the client tracking script and dashboard
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
// Beacon compatibility: parse text/plain requests if beacon transmits as text
app.use(express.text({ type: ['text/plain', 'text/*'], limit: '2mb' }));
app.use((req, res, next) => {
  if (typeof req.body === 'string' && (req.body.trim().startsWith('{') || req.body.trim().startsWith('['))) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // Keep body as string if JSON parsing fails
    }
  }
  next();
});

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

// Health check and diagnostic endpoint
app.get('/api/health', async (req, res) => {
  const isMongo = isMongoConnected();
  let totalSessions = 0;
  let totalEvents = 0;
  try {
    const sessions = await eventService.getSessionsList();
    totalSessions = sessions.length;
    totalEvents = sessions.reduce((acc, s) => acc + (s.totalEvents || 0), 0);
  } catch (err) {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CausalFunnel User Analytics API',
    storageMode: isMongo ? 'mongodb' : 'in-memory-fallback',
    isPersistent: isMongo,
    stats: {
      totalSessions,
      totalEvents
    }
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
