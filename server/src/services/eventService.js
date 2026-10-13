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
 * Detect heuristics: Rage clicks (3+ rapid clicks in <= 1500ms) and Intent Tier
 */
function detectSessionHeuristics(events) {
  let hasRageClick = false;
  let hasAddedToCart = false;
  let hasViewedPricing = false;
  let hasConverted = false;

  const clickEvents = events
    .filter(e => e.eventType === 'click')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (let i = 0; i < clickEvents.length - 2; i++) {
    const t1 = new Date(clickEvents[i].timestamp).getTime();
    const t3 = new Date(clickEvents[i + 2].timestamp).getTime();
    if (t3 - t1 <= 1500) {
      hasRageClick = true;
      break;
    }
  }

  events.forEach(e => {
    const elId = (e.elementId || '').toLowerCase();
    const elText = (e.elementText || '').toLowerCase();
    const url = (e.pageUrl || '').toLowerCase();

    if (url.includes('pricing')) hasViewedPricing = true;
    if (elId.includes('cart') || elText.includes('cart') || elId.includes('explore')) hasAddedToCart = true;
    if (elId.includes('select-pro') || elId.includes('pro') || elText.includes('trial') || elText.includes('checkout')) hasConverted = true;
  });

  let intentTier = 'Casual Explorer';
  if (hasConverted || (hasViewedPricing && hasAddedToCart)) {
    intentTier = 'High Intent';
  } else if (hasAddedToCart || hasViewedPricing || clickEvents.length >= 2) {
    intentTier = 'Engaged';
  } else if (events.length <= 1) {
    intentTier = 'Bounced';
  }

  return { hasRageClick, intentTier };
}

/**
 * Fetch list of all sessions with event counts and timeline stats
 */
async function getSessionsList() {
  let sessions = [];

  if (isMongoConnected()) {
    try {
      sessions = await Event.aggregate([
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
    } catch (err) {
      console.error('[EventService] MongoDB aggregate error:', err.message);
      sessions = [];
    }
  }

  // Fallback memory aggregation if MongoDB empty or failed
  if (sessions.length === 0 && memoryEvents.length > 0) {
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

    sessions = Array.from(map.values()).map(item => ({
      sessionId: item.sessionId,
      totalEvents: item.totalEvents,
      pageViews: item.pageViews,
      clicks: item.clicks,
      firstSeen: item.firstSeen,
      lastSeen: item.lastSeen,
      pageCount: item.pages.size,
      durationSeconds: Math.max(0, Math.round((new Date(item.lastSeen) - new Date(item.firstSeen)) / 1000))
    }));
    sessions.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }

  // Enrich each session with heuristics (Rage click & Intent tier)
  try {
    const allEvents = isMongoConnected() ? await Event.find({}).lean() : memoryEvents;
    const eventsBySession = new Map();
    allEvents.forEach(e => {
      if (!eventsBySession.has(e.sessionId)) eventsBySession.set(e.sessionId, []);
      eventsBySession.get(e.sessionId).push(e);
    });

    sessions.forEach(s => {
      const evs = eventsBySession.get(s.sessionId) || [];
      const heuristics = detectSessionHeuristics(evs);
      s.hasRageClick = heuristics.hasRageClick;
      s.intentTier = heuristics.intentTier;
    });
  } catch (err) {
    sessions.forEach(s => {
      s.hasRageClick = false;
      s.intentTier = s.pageViews > 1 ? 'Engaged' : 'Casual Explorer';
    });
  }

  return sessions;
}

/**
 * Fetch Conversion Funnel analytics and stage-by-stage drop-off metrics
 */
async function getFunnelMetrics() {
  const sessions = await getSessionsList();
  const allEvents = isMongoConnected() ? await Event.find({}).lean() : memoryEvents;

  const sessionEventsMap = new Map();
  allEvents.forEach(ev => {
    if (!sessionEventsMap.has(ev.sessionId)) {
      sessionEventsMap.set(ev.sessionId, []);
    }
    sessionEventsMap.get(ev.sessionId).push(ev);
  });

  const totalSessions = sessions.length;
  let stage1Count = 0; // Discovery
  let stage2Count = 0; // Engagement
  let stage3Count = 0; // Consideration (Pricing)
  let stage4Count = 0; // Conversion (Trial / Plan CTA)

  sessions.forEach(s => {
    const evs = sessionEventsMap.get(s.sessionId) || [];
    let s1 = false, s2 = false, s3 = false, s4 = false;

    evs.forEach(e => {
      const url = (e.pageUrl || '').toLowerCase();
      const elId = (e.elementId || '').toLowerCase();
      const elText = (e.elementText || '').toLowerCase();

      // Stage 1: Storefront Landing
      if (e.eventType === 'page_view' || url.includes('demo') || url.includes('index')) {
        s1 = true;
      }
      // Stage 2: Product Engagement
      if (e.eventType === 'click' && (elId.includes('btn') || elId.includes('explore') || elId.includes('cart') || elText.includes('cart') || elText.includes('pro') || elText.includes('demo'))) {
        s2 = true;
      }
      // Stage 3: Pricing Page View
      if (url.includes('pricing')) {
        s3 = true;
      }
      // Stage 4: Trial CTA / Plan Selection
      if (e.eventType === 'click' && (elId.includes('select-pro') || elId.includes('pro') || elText.includes('trial') || elText.includes('select') || elText.includes('checkout'))) {
        s4 = true;
      }
    });

    if (s1 || evs.length > 0) stage1Count++;
    if ((s1 || evs.length > 0) && s2) stage2Count++;
    if ((s1 || evs.length > 0) && s2 && s3) stage3Count++;
    if ((s1 || evs.length > 0) && s2 && s3 && s4) stage4Count++;
  });

  const stages = [
    {
      id: 'discovery',
      name: '1. Storefront Discovery',
      description: 'Visitors exploring the storefront catalog',
      count: stage1Count,
      conversionRate: totalSessions > 0 ? Number(((stage1Count / totalSessions) * 100).toFixed(1)) : 100,
      dropOffCount: Math.max(0, stage1Count - stage2Count),
      dropOffRate: stage1Count > 0 ? Number((((stage1Count - stage2Count) / stage1Count) * 100).toFixed(1)) : 0
    },
    {
      id: 'engagement',
      name: '2. Product Engagement',
      description: 'Visitors clicking product CTAs or adding to cart',
      count: stage2Count,
      conversionRate: stage1Count > 0 ? Number(((stage2Count / stage1Count) * 100).toFixed(1)) : 0,
      dropOffCount: Math.max(0, stage2Count - stage3Count),
      dropOffRate: stage2Count > 0 ? Number((((stage2Count - stage3Count) / stage2Count) * 100).toFixed(1)) : 0
    },
    {
      id: 'consideration',
      name: '3. Pricing Consideration',
      description: 'Visitors comparing subscription tiers on pricing page',
      count: stage3Count,
      conversionRate: stage2Count > 0 ? Number(((stage3Count / stage2Count) * 100).toFixed(1)) : 0,
      dropOffCount: Math.max(0, stage3Count - stage4Count),
      dropOffRate: stage3Count > 0 ? Number((((stage3Count - stage4Count) / stage3Count) * 100).toFixed(1)) : 0
    },
    {
      id: 'conversion',
      name: '4. Trial / Checkout Intent',
      description: 'Visitors who committed by clicking Start Pro Trial',
      count: stage4Count,
      conversionRate: stage3Count > 0 ? Number(((stage4Count / stage3Count) * 100).toFixed(1)) : 0,
      dropOffCount: 0,
      dropOffRate: 0
    }
  ];

  const overallConversionRate = stage1Count > 0 ? Number(((stage4Count / stage1Count) * 100).toFixed(1)) : 0;
  
  let highestDropOff = stages[0];
  stages.slice(0, 3).forEach(st => {
    if (st.dropOffRate > highestDropOff.dropOffRate) highestDropOff = st;
  });

  return {
    totalEntrants: stage1Count,
    totalConverted: stage4Count,
    overallConversionRate,
    highestDropOffStage: highestDropOff.name,
    stages
  };
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

    // Session 3: Frustrated visitor with Rage Clicks on index.html
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'page_view',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 8).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      x: 610,
      y: 335,
      x_pct: 50.5,
      y_pct: 32.8,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 6).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      x: 612,
      y: 336,
      x_pct: 50.7,
      y_pct: 32.9,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 6 + 320).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      x: 608,
      y: 334,
      x_pct: 50.3,
      y_pct: 32.7,
      element_tag: 'button',
      element_id: 'hero-btn-explore',
      element_text: 'Explore Studio Pro',
      page_url: demoUrl,
      timestamp: new Date(now - 1000 * 60 * 6 + 680).toISOString()
    },
    {
      session_id: 'sess_user_gamma_312',
      event_type: 'click',
      x: 375,
      y: 685,
      x_pct: 31.2,
      y_pct: 64.8,
      element_tag: 'button',
      element_id: 'btn-add-aura-prime',
      element_text: 'Add to Cart',
      page_url: demoUrl,
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
  getFunnelMetrics,
  detectSessionHeuristics,
  seedSampleData,
  clearAllEvents,
  getStorageStatus
};
