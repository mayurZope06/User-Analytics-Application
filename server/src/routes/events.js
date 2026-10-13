const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');

/**
 * @route   POST /api/events
 * @desc    Receive and store single or batched events
 */
router.post('/', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || (Array.isArray(payload) && payload.length === 0)) {
      return res.status(400).json({ error: 'Payload cannot be empty' });
    }

    const saved = await eventService.recordEvents(payload, req);
    return res.status(201).json({
      success: true,
      message: 'Events stored successfully',
      count: Array.isArray(saved) ? saved.length : 1
    });
  } catch (error) {
    console.error('Error storing event:', error.message);
    return res.status(400).json({
      error: error.message || 'Failed to process event data'
    });
  }
});

/**
 * @route   GET /api/events/clicks
 * @desc    Fetch click data for a page (for heatmap view)
 * @query   url, sessionId
 */
router.get('/clicks', async (req, res) => {
  try {
    const pageUrl = req.query.url;
    const sessionId = req.query.sessionId;

    const clicks = await eventService.getPageClicks(pageUrl, sessionId);
    return res.json({
      success: true,
      url: pageUrl || 'all',
      totalClicks: clicks.length,
      clicks
    });
  } catch (error) {
    console.error('Error fetching click data:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve click data' });
  }
});

/**
 * @route   GET /api/events/pages
 * @desc    Fetch distinct list of tracked pages with view & click statistics
 */
router.get('/pages', async (req, res) => {
  try {
    const pages = await eventService.getTrackedPages();
    return res.json({
      success: true,
      count: pages.length,
      pages
    });
  } catch (error) {
    console.error('Error fetching tracked pages:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve tracked pages' });
  }
});

/**
 * @route   GET /api/events/funnel
 * @desc    Fetch conversion funnel metrics and step drop-offs
 */
router.get('/funnel', async (req, res) => {
  try {
    const funnel = await eventService.getFunnelMetrics();
    return res.json({
      success: true,
      funnel
    });
  } catch (error) {
    console.error('Error calculating funnel metrics:', error.message);
    return res.status(500).json({ error: 'Failed to calculate conversion funnel' });
  }
});

/**
 * @route   POST /api/events/seed
 * @desc    Seed realistic demo analytics data
 */
router.post('/seed', async (req, res) => {
  try {
    const result = await eventService.seedSampleData();
    return res.json({
      success: true,
      message: 'Sample analytics data successfully seeded',
      result
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/events/clear
 * @desc    Clear all analytics data (testing convenience)
 */
router.post('/clear', async (req, res) => {
  try {
    await eventService.clearAllEvents();
    return res.json({ success: true, message: 'All analytics data cleared' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
