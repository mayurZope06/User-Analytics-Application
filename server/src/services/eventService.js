const Event = require('../models/Event');
const { isMongoConnected } = require('../config/db');

// In-memory fallback repository when external MongoDB is not running
let memoryEvents = [];

/**
 * Standardize incoming event object to match Schema fields with strict validation
 */
function normalizeEventData(raw, req = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Event payload must be a valid JSON object.');
  }

  const sessionId = raw.session_id || raw.sessionId;
  const eventType = raw.event_type || raw.eventType;
  const pageUrl = raw.page_url || raw.pageUrl || raw.url;

  if (!sessionId || !eventType || !pageUrl) {
    throw new Error('Missing required fields: session_id, event_type, page_url are mandatory.');
  }

  const normalizedEventType = String(eventType).trim().toLowerCase();
  const allowedEventTypes = ['page_view', 'click', 'custom'];
  if (!allowedEventTypes.includes(normalizedEventType)) {
    throw new Error(`Invalid event_type: '${eventType}'. Allowed types are: ${allowedEventTypes.join(', ')}`);
  }

  // Validate coordinates for click events
  let x = null;
  let y = null;
  if (normalizedEventType === 'click') {
    const rawX = raw.x !== undefined && raw.x !== null ? raw.x : raw.client_x !== undefined ? raw.client_x : raw.clientX;
    const rawY = raw.y !== undefined && raw.y !== null ? raw.y : raw.client_y !== undefined ? raw.client_y : raw.clientY;

    if (rawX === undefined || rawX === null || rawY === undefined || rawY === null || isNaN(Number(rawX)) || isNaN(Number(rawY))) {
      throw new Error('Click events must include valid numeric x and y coordinates.');
    }
    x = Number(rawX);
    y = Number(rawY);
  } else {
    x = raw.x !== undefined && raw.x !== null ? Number(raw.x) : null;
    y = raw.y !== undefined && raw.y !== null ? Number(raw.y) : null;
  }

  let timestamp = new Date();
  if (raw.timestamp) {
    const parsedDate = new Date(raw.timestamp);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid timestamp format. Must be a valid date.');
    }
    timestamp = parsedDate;
  }

  return {
    sessionId: String(sessionId).trim(),
    eventType: normalizedEventType,
    pageUrl: String(pageUrl).trim(),
    pagePath: raw.page_path || raw.pagePath || '',
    pageTitle: raw.page_title || raw.pageTitle || '',
    timestamp,

    // Clicks
    x,
    y,
    clientX: raw.client_x !== undefined ? Number(raw.client_x) : (raw.clientX !== undefined ? Number(raw.clientX) : x),
    clientY: raw.client_y !== undefined ? Number(raw.client_y) : (raw.clientY !== undefined ? Number(raw.clientY) : y),
    xPct: raw.x_pct !== undefined ? Number(raw.x_pct) : (raw.xPct !== undefined ? Number(raw.xPct) : null),
    yPct: raw.y_pct !== undefined ? Number(raw.y_pct) : (raw.yPct !== undefined ? Number(raw.yPct) : null),
    viewportWidth: raw.viewport_width !== undefined ? Number(raw.viewport_width) : (raw.viewportWidth !== undefined ? Number(raw.viewportWidth) : null),
    viewportHeight: raw.viewport_height !== undefined ? Number(raw.viewport_height) : (raw.viewportHeight !== undefined ? Number(raw.viewportHeight) : null),

    // Element attributes
    elementTag: raw.element_tag || raw.elementTag || '',
    elementId: raw.element_id || raw.elementId || '',
    elementClass: raw.element_class || raw.elementClass || '',
    elementText: raw.element_text || raw.elementText || '',

    // Client context
    referrer: raw.referrer || '',
    userAgent: raw.user_agent || (req.headers && req.headers['user-agent']) || '',
    ip: req.ip || (req.connection && req.connection.remoteAddress) || '',
    properties: { ...(raw.properties || {}), ...(raw.is_seed ? { isSeed: true } : {}) }
  };
}

/**
 * Save single or batch events
 */
async function recordEvents(eventsPayload, req = {}) {
  const list = Array.isArray(eventsPayload) ? eventsPayload : [eventsPayload];
  const normalizedList = list.map(item => normalizeEventData(item, req));

  if (isMongoConnected()) {
    try {
      const created = await Event.insertMany(normalizedList);
      return created;
    } catch (err) {
      console.error('[EventService] MongoDB insert error, falling back to memory:', err.message);
    }
  }

  // Fallback memory storage
  for (const item of normalizedList) {
    const doc = {
      _id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryEvents.push(doc);
  }

  return normalizedList;
}

/**
 * Fetch list of all sessions with event counts and timeline stats
 */
async function getSessionsList() {
  if (isMongoConnected()) {
    try {
      const sessions = await Event.aggregate([
        {
          $group: {
            _id: '$sessionId',
            totalEvents: { $sum: 1 },
            pageViews: {
              $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
            },
            clicks: {
              $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
            },
            firstSeen: { $min: '$timestamp' },
            lastSeen: { $max: '$timestamp' },
            pages: { $addToSet: '$pageUrl' }
          }
        },
        {
          $project: {
            sessionId: '$_id',
            _id: 0,
            totalEvents: 1,
            pageViews: 1,
            clicks: 1,
            firstSeen: 1,
            lastSeen: 1,
            pageCount: { $size: '$pages' },
            durationSeconds: {
              $round: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 1000] }, 0]
            }
          }
        },
        { $sort: { lastSeen: -1 } }
      ]);
      return sessions;
    } catch (err) {
      console.error('[EventService] MongoDB aggregate error:', err.message);
    }
  }

  // Fallback memory aggregation
  const map = new Map();
  for (const ev of memoryEvents) {
    const sid = ev.sessionId;
    if (!map.has(sid)) {
      map.set(sid, {
        sessionId: sid,
        totalEvents: 0,
        pageViews: 0,
        clicks: 0,
        firstSeen: ev.timestamp,
        lastSeen: ev.timestamp,
        pages: new Set()
      });
    }

    const item = map.get(sid);
    item.totalEvents++;
    if (ev.eventType === 'page_view') item.pageViews++;
    if (ev.eventType === 'click') item.clicks++;
    if (new Date(ev.timestamp) < new Date(item.firstSeen)) item.firstSeen = ev.timestamp;
    if (new Date(ev.timestamp) > new Date(item.lastSeen)) item.lastSeen = ev.timestamp;
    item.pages.add(ev.pageUrl);
  }

  const result = Array.from(map.values()).map(item => ({
    sessionId: item.sessionId,
    totalEvents: item.totalEvents,
    pageViews: item.pageViews,
    clicks: item.clicks,
    firstSeen: item.firstSeen,
    lastSeen: item.lastSeen,
    pageCount: item.pages.size,
    durationSeconds: Math.max(0, Math.round((new Date(item.lastSeen) - new Date(item.firstSeen)) / 1000))
  }));

  result.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  return result;
}

/**
 * Fetch all events for a specific session ordered chronologically
 */
async function getSessionEvents(sessionId) {
  if (isMongoConnected()) {
    try {
      const events = await Event.find({ sessionId: String(sessionId).trim() })
        .sort({ timestamp: 1 })
        .lean();
      return events;
    } catch (err) {
      console.error('[EventService] MongoDB query error:', err.message);
    }
  }

  // Fallback memory search
  return memoryEvents
    .filter(ev => ev.sessionId === String(sessionId).trim())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Fetch click data for a page (for heatmap view)
 */
async function getPageClicks(pageUrl, sessionIdFilter = null) {
  const query = { eventType: 'click' };

  if (pageUrl) {
    // Normalize url for robust matching
    const cleanUrl = pageUrl.trim();
    query.pageUrl = cleanUrl;
  }

  if (sessionIdFilter) {
    query.sessionId = sessionIdFilter.trim();
  }

  if (isMongoConnected()) {
    try {
      const clicks = await Event.find(query)
        .select('x y clientX clientY xPct yPct viewportWidth viewportHeight elementTag elementId elementClass elementText timestamp pageUrl sessionId')
        .sort({ timestamp: -1 })
        .lean();
      return clicks;
    } catch (err) {
      console.error('[EventService] MongoDB click query error:', err.message);
    }
  }

  // Fallback
  return memoryEvents
    .filter(ev => {
      if (ev.eventType !== 'click') return false;
      if (pageUrl && ev.pageUrl !== pageUrl) return false;
      if (sessionIdFilter && ev.sessionId !== sessionIdFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Fetch distinct list of tracked pages with counts
 */
async function getTrackedPages() {
  if (isMongoConnected()) {
    try {
      const pages = await Event.aggregate([
        {
          $group: {
            _id: '$pageUrl',
            totalEvents: { $sum: 1 },
            views: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
            lastVisited: { $max: '$timestamp' }
          }
        },
        {
          $project: {
            pageUrl: '$_id',
            _id: 0,
            totalEvents: 1,
            views: 1,
            clicks: 1,
            lastVisited: 1
          }
        },
        { $sort: { totalEvents: -1 } }
      ]);
      return pages;
    } catch (err) {
      console.error('[EventService] MongoDB pages error:', err.message);
    }
  }

  const map = new Map();
  for (const ev of memoryEvents) {
    const url = ev.pageUrl;
    if (!map.has(url)) {
      map.set(url, { pageUrl: url, totalEvents: 0, views: 0, clicks: 0, lastVisited: ev.timestamp });
    }
    const item = map.get(url);
    item.totalEvents++;
    if (ev.eventType === 'page_view') item.views++;
    if (ev.eventType === 'click') item.clicks++;
    if (new Date(ev.timestamp) > new Date(item.lastVisited)) item.lastVisited = ev.timestamp;
  }

  return Array.from(map.values()).sort((a, b) => b.totalEvents - a.totalEvents);
}

/**
 * Seed realistic demo sessions and clicks for immediate evaluation
 */
async function seedSampleData() {
  const demoUrl = 'http://localhost:5000/demo/index.html';
  const pricingUrl = 'http://localhost:5000/demo/pricing.html';
  const now = Date.now();

  const sampleEvents = [
    // Session 1: Buyer journey
    {
      session_id: 'sess_user_alpha_741',
      event_type: 'page_view',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 25).toISOString()
    },
    {
      session_id: 'sess_user_alpha_741',
      event_type: 'click',
      page_url: demoUrl,
      x: 600,
      y: 330,
      x_pct: 50.0,
      y_pct: 32.5,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      timestamp: new Date(now - 1000 * 60 * 24).toISOString()
    },
    {
      session_id: 'sess_user_alpha_741',
      event_type: 'click',
      page_url: demoUrl,
      x: 380,
      y: 690,
      x_pct: 31.6,
      y_pct: 65.0,
      element_tag: 'button',
      element_id: 'btn-add-aura-prime',
      element_text: 'Add to Cart',
      timestamp: new Date(now - 1000 * 60 * 22).toISOString()
    },
    {
      session_id: 'sess_user_alpha_741',
      event_type: 'page_view',
      page_url: pricingUrl,
      timestamp: new Date(now - 1000 * 60 * 20).toISOString()
    },
    {
      session_id: 'sess_user_alpha_741',
      event_type: 'click',
      page_url: pricingUrl,
      x: 600,
      y: 420,
      x_pct: 50.0,
      y_pct: 45.0,
      element_tag: 'button',
      element_id: 'btn-select-pro',
      element_text: 'Start Pro 14-Day Trial',
      timestamp: new Date(now - 1000 * 60 * 18).toISOString()
    },

    // Session 2: Curious visitor
    {
      session_id: 'sess_user_beta_982',
      event_type: 'page_view',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 15).toISOString()
    },
    {
      session_id: 'sess_user_beta_982',
      event_type: 'click',
      page_url: demoUrl,
      x: 720,
      y: 330,
      x_pct: 58.0,
      y_pct: 32.5,
      element_tag: 'button',
      element_id: 'hero-btn-demo',
      element_text: 'Listen to Demo',
      timestamp: new Date(now - 1000 * 60 * 14).toISOString()
    },
    {
      session_id: 'sess_user_beta_982',
      event_type: 'click',
      page_url: demoUrl,
      x: 820,
      y: 690,
      x_pct: 68.0,
      y_pct: 65.0,
      element_tag: 'button',
      element_id: 'btn-add-studio-ref',
      element_text: 'Add to Cart',
      timestamp: new Date(now - 1000 * 60 * 12).toISOString()
    },

    // Session 3: Heatmap concentration test on index.html
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'page_view',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 8).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      page_url: demoUrl,
      x: 610,
      y: 335,
      x_pct: 50.5,
      y_pct: 32.8,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      timestamp: new Date(now - 1000 * 60 * 7).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      page_url: demoUrl,
      x: 595,
      y: 325,
      x_pct: 49.8,
      y_pct: 32.2,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      timestamp: new Date(now - 1000 * 60 * 6).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      page_url: demoUrl,
      x: 375,
      y: 685,
      x_pct: 31.2,
      y_pct: 64.8,
      element_tag: 'button',
      element_id: 'btn-add-aura-prime',
      element_text: 'Add to Cart',
      timestamp: new Date(now - 1000 * 60 * 4).toISOString()
    }
  ];

  // Prevent duplicate seed sessions if re-seeding
  const seedSessionIds = ['sess_user_alpha_741', 'sess_user_beta_982', 'sess_user_gamma_312'];
  if (isMongoConnected()) {
    try {
      await Event.deleteMany({ sessionId: { $in: seedSessionIds } });
    } catch (e) {}
  }
  memoryEvents = memoryEvents.filter(ev => !seedSessionIds.includes(ev.sessionId));

  const markedEvents = sampleEvents.map(e => ({ ...e, is_seed: true }));
  await recordEvents(markedEvents);
  return { seeded: sampleEvents.length };
}

// Clear all events (testing helper)
async function clearAllEvents() {
  if (isMongoConnected()) {
    try {
      await Event.deleteMany({});
    } catch (e) {}
  }
  memoryEvents = [];
  return { success: true };
}

function getStorageStatus() {
  return {
    isMongo: isMongoConnected(),
    storageMode: isMongoConnected() ? 'mongodb' : 'in-memory-fallback',
    isPersistent: isMongoConnected(),
    inMemoryCount: memoryEvents.length
  };
}

module.exports = {
  recordEvents,
  getSessionsList,
  getSessionEvents,
  getPageClicks,
  getTrackedPages,
  seedSampleData,
  clearAllEvents,
  getStorageStatus
};
