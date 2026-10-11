const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');

/**
 * @route   GET /api/sessions
 * @desc    Fetch a list of sessions with event counts & duration
 */
router.get('/', async (req, res) => {
  try {
    const sessions = await eventService.getSessionsList();
    return res.json({
      success: true,
      totalSessions: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve sessions list' });
  }
});

/**
 * @route   GET /api/sessions/:sessionId
 * @desc    Fetch all events for a specific session (ordered user journey)
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = await eventService.getSessionEvents(sessionId);

    return res.json({
      success: true,
      sessionId,
      totalEvents: events.length,
      events
    });
  } catch (error) {
    console.error(`Error fetching events for session ${req.params.sessionId}:`, error.message);
    return res.status(500).json({ error: 'Failed to retrieve session events' });
  }
});

/**
 * @route   GET /api/sessions/:sessionId/events
 * @desc    Alias to fetch all events for a specific session
 */
router.get('/:sessionId/events', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = await eventService.getSessionEvents(sessionId);

    return res.json({
      success: true,
      sessionId,
      totalEvents: events.length,
      events
    });
  } catch (error) {
    console.error(`Error fetching events for session ${req.params.sessionId}:`, error.message);
    return res.status(500).json({ error: 'Failed to retrieve session events' });
  }
});

module.exports = router;
