/**
 * CausalFunnel User Analytics Client Tracker
 * Lightweight standalone tracking script for user interaction analytics.
 *
 * Requirements fulfilled:
 * - Automatically tracks: page_view, click
 * - Session tracking: session_id persisted across localStorage & cookies
 * - Coordinates: tracks x/y (absolute and normalized percentage for responsive heatmaps)
 * - Transmits to backend API via sendBeacon / fetch with fallback
 */
(function (window, document) {
  'use strict';

  // Prevent multiple instantiations
  if (window.__CAUSAL_TRACKER_INITIALIZED__) {
    return;
  }
  window.__CAUSAL_TRACKER_INITIALIZED__ = true;

  // Dynamically resolve default API endpoint if not explicitly provided
  function resolveDefaultEndpoint() {
    if (typeof window !== 'undefined' && window.CAUSAL_TRACKER_ENDPOINT) {
      return window.CAUSAL_TRACKER_ENDPOINT;
    }
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
      return window.location.origin + '/api/events';
    }
    return 'http://localhost:5000/api/events';
  }

  const CONFIG = {
    // Default API endpoint; can be overridden via window.CAUSAL_TRACKER_ENDPOINT or init()
    apiEndpoint: resolveDefaultEndpoint(),
    cookieName: 'cf_session_id',
    storageKey: 'cf_session_id',
    sessionTimeoutMinutes: 30,
    batchIntervalMs: 800, // Debounce batch send for high performance
    debug: window.CAUSAL_TRACKER_DEBUG !== false // Default true for transparent testing
  };

  const state = {
    sessionId: null,
    eventQueue: [],
    flushTimer: null,
    lastActivityTime: Date.now()
  };

  // Helper: log to console if debug enabled
  function log(...args) {
    if (CONFIG.debug) {
      console.log('%c[CausalTracker]', 'background: #4f46e5; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;', ...args);
    }
  }

  // Helper: Generate UUID v4
  function generateUUID() {
    return 'sess_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Cookie helpers
  function setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }

  // Session ID Management: Check localStorage first, then Cookie, or generate new
  function getOrCreateSessionId() {
    let sid = null;

    // Check localStorage
    try {
      sid = localStorage.getItem(CONFIG.storageKey);
    } catch (e) {
      // LocalStorage might be disabled/restricted
    }

    // Check cookie fallback
    if (!sid) {
      sid = getCookie(CONFIG.cookieName);
    }

    // Generate new if missing
    if (!sid) {
      sid = generateUUID();
      log('New session created:', sid);
    }

    // Synchronize to both stores
    try {
      localStorage.setItem(CONFIG.storageKey, sid);
      localStorage.setItem(CONFIG.storageKey + '_last_active', Date.now().toString());
    } catch (e) {}

    setCookie(CONFIG.cookieName, sid, 30); // 30 days persistence

    return sid;
  }

  // Get current page details
  function getPageDetails() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer || '',
      viewportWidth: window.innerWidth || document.documentElement.clientWidth || 0,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
      screenWidth: window.screen ? window.screen.width : 0,
      screenHeight: window.screen ? window.screen.height : 0
    };
  }

  // Send events to backend API
  function flushEvents() {
    if (state.eventQueue.length === 0) return;

    const payload = [...state.eventQueue];
    state.eventQueue = [];

    const jsonString = JSON.stringify(payload);
    log(`Sending ${payload.length} event(s) to ${CONFIG.apiEndpoint}`, payload);

    // Try navigator.sendBeacon first (ideal for reliable delivery, unload events, etc.)
    let sentWithBeacon = false;
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        sentWithBeacon = navigator.sendBeacon(CONFIG.apiEndpoint, blob);
      } catch (err) {
        sentWithBeacon = false;
      }
    }

    // Fallback to fetch with keepalive or standard POST
    if (!sentWithBeacon) {
      fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonString,
        keepalive: true
      }).catch(err => {
        console.warn('[CausalTracker] Failed to transmit events:', err);
      });
    }
  }

  function queueEvent(eventData) {
    state.lastActivityTime = Date.now();
    state.eventQueue.push(eventData);

    // Debounce flush
    if (state.flushTimer) {
      clearTimeout(state.flushTimer);
    }

    if (state.eventQueue.length >= 5) {
      // Flush immediately if buffer is full
      flushEvents();
    } else {
      state.flushTimer = setTimeout(flushEvents, CONFIG.batchIntervalMs);
    }
  }

  // Track page view event
  function trackPageView(customProperties) {
    const page = getPageDetails();
    const event = {
      session_id: state.sessionId,
      event_type: 'page_view',
      page_url: page.url,
      page_path: page.path,
      page_title: page.title,
      referrer: page.referrer,
      viewport_width: page.viewportWidth,
      viewport_height: page.viewportHeight,
      timestamp: new Date().toISOString(),
      properties: customProperties || {}
    };

    log('Tracked page_view:', event);
    queueEvent(event);
  }

  // Track click event
  function trackClick(e) {
    const page = getPageDetails();
    const target = e.target || e.srcElement;

    // Determine target element details
    let elementTag = '';
    let elementId = '';
    let elementClass = '';
    let elementText = '';

    if (target && target.nodeType === 1) {
      elementTag = target.tagName.toLowerCase();
      elementId = target.id || '';
      elementClass = target.className && typeof target.className === 'string' ? target.className : '';
      elementText = (target.innerText || target.textContent || '').trim().substring(0, 80);
    }

    // Accurate page coordinates (scrolled document relative)
    const pageX = e.pageX !== undefined ? e.pageX : (e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft));
    const pageY = e.pageY !== undefined ? e.pageY : (e.clientY + (document.documentElement.scrollTop || document.body.scrollTop));

    // Calculate percentage coordinates (useful for responsive heatmaps)
    const docWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      page.viewportWidth
    );
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      page.viewportHeight
    );

    const xPct = docWidth > 0 ? Number(((pageX / docWidth) * 100).toFixed(2)) : 0;
    const yPct = docHeight > 0 ? Number(((pageY / docHeight) * 100).toFixed(2)) : 0;

    const event = {
      session_id: state.sessionId,
      event_type: 'click',
      page_url: page.url,
      page_path: page.path,
      timestamp: new Date().toISOString(),
      // Coordinates as specified in requirements:
      x: Math.round(pageX),
      y: Math.round(pageY),
      client_x: Math.round(e.clientX),
      client_y: Math.round(e.clientY),
      x_pct: xPct,
      y_pct: yPct,
      viewport_width: page.viewportWidth,
      viewport_height: page.viewportHeight,
      element_tag: elementTag,
      element_id: elementId,
      element_class: elementClass,
      element_text: elementText
    };

    log('Tracked click:', event);
    queueEvent(event);
  }

  // Setup SPA navigation tracking (pushState, replaceState, popstate)
  function setupNavigationListeners() {
    window.addEventListener('popstate', function () {
      trackPageView({ trigger: 'popstate' });
    });

    const originalPushState = history.pushState;
    if (originalPushState) {
      history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        setTimeout(() => trackPageView({ trigger: 'pushState' }), 10);
        return result;
      };
    }

    const originalReplaceState = history.replaceState;
    if (originalReplaceState) {
      history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        setTimeout(() => trackPageView({ trigger: 'replaceState' }), 10);
        return result;
      };
    }
  }

  // Initialize tracker
  function init(customConfig) {
    if (customConfig) {
      Object.assign(CONFIG, customConfig);
    }

    state.sessionId = getOrCreateSessionId();
    log('Tracker initialized with Session ID:', state.sessionId, 'Endpoint:', CONFIG.apiEndpoint);

    // 1. Track initial Page View
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      trackPageView({ trigger: 'initial_load' });
    } else {
      window.addEventListener('DOMContentLoaded', function () {
        trackPageView({ trigger: 'dom_content_loaded' });
      });
    }

    // 2. Track Clicks globally (using capture phase for complete visibility)
    document.addEventListener('click', trackClick, true);

    // 3. SPA Navigation Listeners
    setupNavigationListeners();

    // 4. Ensure events are flushed when user navigates away or hides page
    window.addEventListener('beforeunload', flushEvents);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    });
  }

  // Expose global API
  window.CausalTracker = {
    init: init,
    trackPageView: trackPageView,
    trackCustomEvent: function (eventType, data) {
      const page = getPageDetails();
      const event = {
        session_id: state.sessionId,
        event_type: eventType,
        page_url: page.url,
        timestamp: new Date().toISOString(),
        ...data
      };
      queueEvent(event);
    },
    getSessionId: function () {
      return state.sessionId;
    },
    resetSession: function () {
      const newSid = generateUUID();
      state.sessionId = newSid;
      try {
        localStorage.setItem(CONFIG.storageKey, newSid);
      } catch (e) {}
      setCookie(CONFIG.cookieName, newSid, 30);
      log('Session reset to:', newSid);
      trackPageView({ trigger: 'session_reset' });
      return newSid;
    },
    flush: flushEvents
  };

  // Auto-init by default
  init();

})(window, document);
