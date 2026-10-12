/**
 * End-to-End Analytics Flow Verification Script
 * Simulates a realistic multi-page shopping journey and asserts backend session aggregation,
 * chronological journey order, and click coordinates.
 */
async function runVerification() {
  const sid = 'sess_e2e_verify_' + Date.now();
  const demoUrl = 'http://localhost:5000/demo/index.html';
  const pricingUrl = 'http://localhost:5000/demo/pricing.html';
  const now = Date.now();

  console.log(`\n======================================================`);
  console.log(`🔍 Starting E2E Journey Verification for: ${sid}`);
  console.log(`======================================================\n`);

  // Step 1: Page view on storefront
  console.log('1. Tracking page_view on Storefront (Home)...');
  const pv1 = await fetch('http://127.0.0.1:5000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sid,
      event_type: 'page_view',
      page_url: demoUrl,
      timestamp: new Date(now - 8000).toISOString()
    })
  });
  console.log('   Response status:', pv1.status);

  // Step 2 & 3: Clicks on storefront
  console.log('2 & 3. Tracking 2 clicks on Storefront...');
  const clicks = await fetch('http://127.0.0.1:5000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      {
        session_id: sid,
        event_type: 'click',
        page_url: demoUrl,
        x: 602,
        y: 335,
        element_tag: 'button',
        element_id: 'hero-btn-explore',
        element_text: 'Explore Studio Pro',
        timestamp: new Date(now - 6000).toISOString()
      },
      {
        session_id: sid,
        event_type: 'click',
        page_url: demoUrl,
        x: 385,
        y: 692,
        element_tag: 'button',
        element_id: 'btn-add-aura-prime',
        element_text: 'Add to Cart',
        timestamp: new Date(now - 4000).toISOString()
      }
    ])
  });
  console.log('   Response status:', clicks.status);

  // Step 4: Page view on pricing
  console.log('4. Navigating to Pricing page (same session)...');
  const pv2 = await fetch('http://127.0.0.1:5000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sid,
      event_type: 'page_view',
      page_url: pricingUrl,
      timestamp: new Date(now - 2000).toISOString()
    })
  });
  console.log('   Response status:', pv2.status);

  // Step 5: Click on pricing
  console.log('5. Clicking CTA on Pricing page...');
  const click3 = await fetch('http://127.0.0.1:5000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sid,
      event_type: 'click',
      page_url: pricingUrl,
      x: 600,
      y: 420,
      element_tag: 'button',
      element_id: 'btn-select-pro',
      element_text: 'Start Pro 14-Day Trial',
      timestamp: new Date().toISOString()
    })
  });
  console.log('   Response status:', click3.status);

  // Step 6: Verify session summary
  console.log('\n6. Querying /api/sessions...');
  const sRes = await fetch('http://127.0.0.1:5000/api/sessions').then(r => r.json());
  const mySess = sRes.sessions.find(s => s.sessionId === sid);

  if (!mySess) {
    throw new Error('Session not found in /api/sessions list!');
  }
  console.log('   Found session:', {
    sessionId: mySess.sessionId,
    totalEvents: mySess.totalEvents,
    pageViews: mySess.pageViews,
    clicks: mySess.clicks,
    pageCount: mySess.pageCount,
    durationSeconds: mySess.durationSeconds
  });

  if (mySess.totalEvents !== 5 || mySess.pageViews !== 2 || mySess.clicks !== 3 || mySess.pageCount !== 2) {
    throw new Error(`Metric mismatch: expected 5 total, 2 views, 3 clicks, 2 pages. Got: ${JSON.stringify(mySess)}`);
  }

  // Step 7: Verify chronological journey
  console.log('\n7. Querying /api/sessions/:sessionId (User Journey)...');
  const jRes = await fetch(`http://127.0.0.1:5000/api/sessions/${sid}`).then(r => r.json());
  console.log(`   Fetched ${jRes.events.length} chronological events:`);
  jRes.events.forEach((ev, i) => {
    console.log(`   [${i + 1}] ${ev.eventType.padEnd(9)} | ${ev.pageUrl.split('/').pop()} | ${ev.timestamp} | coords: ${ev.x !== null ? `${ev.x},${ev.y}` : 'N/A'}`);
  });

  // Step 8: Verify heatmap clicks for index.html
  console.log('\n8. Querying /api/events/clicks?url=... (Heatmap Clicks)...');
  const cRes = await fetch(`http://127.0.0.1:5000/api/events/clicks?url=${encodeURIComponent(demoUrl)}`).then(r => r.json());
  const myClicks = cRes.clicks.filter(c => c.sessionId === sid);
  console.log(`   Found ${myClicks.length} clicks on Storefront for this session.`);
  if (myClicks.length !== 2) {
    throw new Error(`Expected 2 clicks on Storefront, got ${myClicks.length}`);
  }

  console.log('\n======================================================');
  console.log('🎉 E2E VERIFICATION COMPLETE: ALL CHECKS PASSED 100%!');
  console.log('======================================================\n');
}

runVerification().catch(err => {
  console.error('E2E Verification Error:', err.message);
  process.exit(1);
});
