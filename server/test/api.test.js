const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const eventService = require('../src/services/eventService');

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body === 'object' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(6000)
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Running CausalFunnel Automated Backend Test Suite');
  console.log('======================================================\n');

  // Start ephemeral server on 127.0.0.1 with dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`📡 Ephemeral test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Error: ${err.message}`);
      if (err.stack) {
        console.error(`   ${err.stack.split('\n').slice(1, 3).join('\n   ')}`);
      }
      failed++;
    }
  }

  try {
    // Clean state before tests
    await eventService.clearAllEvents();

    // 1. Valid page-view ingestion
    await test('1. Valid page-view ingestion (POST /api/events -> 201)', async () => {
      const payload = {
        session_id: 'test_sess_001',
        event_type: 'page_view',
        page_url: 'http://localhost:5000/demo/index.html',
        timestamp: new Date().toISOString()
      };
      const res = await request('/api/events', { method: 'POST', body: payload });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.count, 1);
    });

    // 2. Valid click ingestion with coordinates
    await test('2. Valid click ingestion with coordinates (POST /api/events -> 201)', async () => {
      const payload = {
        session_id: 'test_sess_001',
        event_type: 'click',
        page_url: 'http://localhost:5000/demo/index.html',
        x: 450,
        y: 280,
        element_tag: 'button',
        element_id: 'btn-checkout',
        timestamp: new Date().toISOString()
      };
      const res = await request('/api/events', { method: 'POST', body: payload });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);

      // Verify stored coordinates
      const clickRes = await request('/api/events/clicks?url=http://localhost:5000/demo/index.html');
      assert.strictEqual(clickRes.status, 200);
      assert.strictEqual(clickRes.data.clicks.length >= 1, true);
      const storedClick = clickRes.data.clicks.find(c => c.sessionId === 'test_sess_001');
      assert.ok(storedClick);
      assert.strictEqual(storedClick.x, 450);
      assert.strictEqual(storedClick.y, 280);
    });

    // 3. Invalid event payload rejection
    await test('3. Invalid event payload rejection (POST /api/events -> 400)', async () => {
      // Empty payload
      const emptyRes = await request('/api/events', { method: 'POST', body: [] });
      assert.strictEqual(emptyRes.status, 400);

      // Missing required session_id
      const missingFieldRes = await request('/api/events', {
        method: 'POST',
        body: { event_type: 'page_view', page_url: 'http://localhost:5000/demo/index.html' }
      });
      assert.strictEqual(missingFieldRes.status, 400);

      // Invalid event_type
      const invalidTypeRes = await request('/api/events', {
        method: 'POST',
        body: { session_id: 'test_sess_bad', event_type: 'invalid_event', page_url: 'http://localhost:5000/demo' }
      });
      assert.strictEqual(invalidTypeRes.status, 400);

      // Click event missing numeric coordinates
      const invalidCoordsRes = await request('/api/events', {
        method: 'POST',
        body: { session_id: 'test_sess_bad', event_type: 'click', page_url: 'http://localhost:5000/demo', x: 'invalid_coord' }
      });
      assert.strictEqual(invalidCoordsRes.status, 400);
    });

    // 4. Session aggregation and total event counts
    await test('4. Session aggregation and total event counts (GET /api/sessions)', async () => {
      // Ingest another event for test_sess_001
      await request('/api/events', {
        method: 'POST',
        body: {
          session_id: 'test_sess_001',
          event_type: 'click',
          page_url: 'http://localhost:5000/demo/pricing.html',
          x: 600,
          y: 400
        }
      });

      const res = await request('/api/sessions');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const s001 = res.data.sessions.find(s => s.sessionId === 'test_sess_001');
      assert.ok(s001, 'Session test_sess_001 should be listed');
      assert.strictEqual(s001.totalEvents, 3, 'Should have 3 total events (1 view + 2 clicks)');
      assert.strictEqual(s001.pageViews, 1);
      assert.strictEqual(s001.clicks, 2);
      assert.strictEqual(s001.pageCount, 2, 'Should visit 2 distinct pages');
    });

    // 5. Chronological event retrieval for a session
    await test('5. Chronological event retrieval for a session (GET /api/sessions/:sessionId)', async () => {
      const res = await request('/api/sessions/test_sess_001');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.events.length, 3);

      // Verify chronological order (timestamps non-decreasing)
      for (let i = 0; i < res.data.events.length - 1; i++) {
        const t1 = new Date(res.data.events[i].timestamp).getTime();
        const t2 = new Date(res.data.events[i + 1].timestamp).getTime();
        assert.ok(t1 <= t2, `Events must be in chronological order: ${t1} <= ${t2}`);
      }
    });

    // 6. Page-specific click retrieval
    await test('6. Page-specific click retrieval (GET /api/events/clicks?url=...)', async () => {
      const resIndex = await request('/api/events/clicks?url=http://localhost:5000/demo/index.html');
      assert.strictEqual(resIndex.status, 200);
      assert.ok(resIndex.data.clicks.every(c => c.pageUrl === 'http://localhost:5000/demo/index.html'));

      const resPricing = await request('/api/events/clicks?url=http://localhost:5000/demo/pricing.html');
      assert.strictEqual(resPricing.status, 200);
      assert.ok(resPricing.data.clicks.every(c => c.pageUrl === 'http://localhost:5000/demo/pricing.html'));
    });

    // 7. Page URL listing
    await test('7. Page URL listing (GET /api/events/pages)', async () => {
      const res = await request('/api/events/pages');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.pages));
      const urls = res.data.pages.map(p => p.pageUrl);
      assert.ok(urls.includes('http://localhost:5000/demo/index.html'));
      assert.ok(urls.includes('http://localhost:5000/demo/pricing.html'));
    });

    // 8. Empty results and unknown sessions
    await test('8. Empty results and unknown sessions (GET /api/sessions/non_existent_id)', async () => {
      const res = await request('/api/sessions/sess_non_existent_9999');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.totalEvents, 0);
      assert.deepStrictEqual(res.data.events, []);
    });

    // 9. Storage diagnostic and beacon text/plain parsing
    await test('9. Storage diagnostic and beacon text/plain parsing', async () => {
      // Diagnostic health endpoint
      const healthRes = await request('/api/health');
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthRes.data.status, 'ok');
      assert.ok(['mongodb', 'in-memory-fallback'].includes(healthRes.data.storageMode));
      assert.ok(typeof healthRes.data.stats.totalSessions === 'number');

      // Beacon text/plain JSON payload parsing
      const beaconPayload = JSON.stringify({
        session_id: 'test_sess_beacon_101',
        event_type: 'page_view',
        page_url: 'http://localhost:5000/demo/index.html',
        timestamp: new Date().toISOString()
      });

      const beaconRes = await request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: beaconPayload
      });
      assert.strictEqual(beaconRes.status, 201);
      assert.strictEqual(beaconRes.data.success, true);
    });

    // 10. In-memory fallback and seed deduplication
    await test('10. In-memory fallback and seed deduplication', async () => {
      // Seed data
      const seed1 = await request('/api/events/seed', { method: 'POST' });
      assert.strictEqual(seed1.status, 200);

      const sessAfterSeed1 = await request('/api/sessions');
      const count1 = sessAfterSeed1.data.sessions.length;

      // Seed again - should NOT double the sample sessions
      const seed2 = await request('/api/events/seed', { method: 'POST' });
      assert.strictEqual(seed2.status, 200);

      const sessAfterSeed2 = await request('/api/sessions');
      const count2 = sessAfterSeed2.data.sessions.length;

      assert.strictEqual(count1, count2, 'Re-seeding must not duplicate sample sessions');
    });

  } finally {
    if (server) {
      server.close();
      console.log('\n🛑 Ephemeral test server stopped.');
    }
  }

  console.log('\n======================================================');
  console.log(`🏁 Test Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
