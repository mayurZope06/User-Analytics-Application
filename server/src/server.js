require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const eventService = require('./services/eventService');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to Database
  await connectDB();

  // Auto-seed sample events if empty for smooth initial evaluation
  try {
    const existingSessions = await eventService.getSessionsList();
    if (existingSessions.length === 0) {
      console.log('🌱 [Server] Database is empty. Seeding realistic sample user sessions...');
      await eventService.seedSampleData();
      console.log('✅ [Server] Seed data populated successfully.');
    }
  } catch (err) {
    console.warn('[Server] Seed check note:', err.message);
  }

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 CausalFunnel Analytics Backend running on port ${PORT}`);
    console.log(`📡 API Base:        http://localhost:${PORT}/api`);
    console.log(`🎯 Tracker Script:  http://localhost:${PORT}/tracker.js`);
    console.log(`🛒 Demo Store Page: http://localhost:${PORT}/demo/index.html`);
    console.log(`💳 Demo Pricing:    http://localhost:${PORT}/demo/pricing.html`);
    console.log(`======================================================\n`);
  });
}

startServer();
