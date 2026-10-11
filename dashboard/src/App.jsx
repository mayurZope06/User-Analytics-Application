import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import SessionsView from './components/SessionsView';
import HeatmapView from './components/HeatmapView';
import LiveTestbench from './components/LiveTestbench';
import SessionJourneyModal from './components/SessionJourneyModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all primary metrics from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, pagesRes] = await Promise.all([
        fetch('http://localhost:5000/api/sessions').then(r => r.json()),
        fetch('http://localhost:5000/api/events/pages').then(r => r.json())
      ]);

      if (sessionsRes.success && sessionsRes.sessions) {
        setSessions(sessionsRes.sessions);
      }
      if (pagesRes.success && pagesRes.pages) {
        setPages(pagesRes.pages);
      }
    } catch (err) {
      console.error('Error fetching analytics data from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Seed sample data handler
  const handleSeedData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/events/seed', { method: 'POST' }).then(r => r.json());
      if (res.success) {
        await fetchData();
        showToast('Sample session events seeded successfully!');
      }
    } catch (err) {
      console.error('Failed to seed data:', err);
    }
  };

  // Clear data handler
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all analytics records?')) return;
    try {
      await fetch('http://localhost:5000/api/events/clear', { method: 'POST' });
      await fetchData();
      showToast('All analytics records cleared.');
    } catch (err) {
      console.error('Failed to clear data:', err);
    }
  };

  // Simulate realistic traffic session
  const handleSimulateTraffic = async () => {
    const demoUrl = 'http://localhost:5000/demo/index.html';
    const pricingUrl = 'http://localhost:5000/demo/pricing.html';
    const sid = 'sess_live_sim_' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();

    const simEvents = [
      {
        session_id: sid,
        event_type: 'page_view',
        page_url: demoUrl,
        page_title: 'AuraStore - Premium Audio | Analytics Demo Webpage',
        page_path: '/demo/index.html',
        viewport_width: 1440,
        viewport_height: 900,
        timestamp: new Date(now - 12000).toISOString()
      },
      {
        session_id: sid,
        event_type: 'click',
        page_url: demoUrl,
        x: 605,
        y: 332,
        x_pct: 50.4,
        y_pct: 32.6,
        element_tag: 'button',
        element_id: 'hero-btn-explore',
        element_text: 'Explore Studio Pro',
        timestamp: new Date(now - 9000).toISOString()
      },
      {
        session_id: sid,
        event_type: 'click',
        page_url: demoUrl,
        x: 382,
        y: 694,
        x_pct: 31.8,
        y_pct: 65.2,
        element_tag: 'button',
        element_id: 'btn-add-aura-prime',
        element_text: 'Add to Cart',
        timestamp: new Date(now - 6000).toISOString()
      },
      {
        session_id: sid,
        event_type: 'page_view',
        page_url: pricingUrl,
        page_title: 'Pricing Plans - AuraAudio | Analytics Demo',
        page_path: '/demo/pricing.html',
        viewport_width: 1440,
        viewport_height: 900,
        timestamp: new Date(now - 3000).toISOString()
      },
      {
        session_id: sid,
        event_type: 'click',
        page_url: pricingUrl,
        x: 600,
        y: 420,
        x_pct: 50.0,
        y_pct: 45.0,
        element_tag: 'button',
        element_id: 'btn-select-pro',
        element_text: 'Start Pro 14-Day Trial',
        timestamp: new Date().toISOString()
      }
    ];

    try {
      await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simEvents)
      });
      await fetchData();
      showToast(`Simulated Session Generated: ${sid} (5 events logged)`);
    } catch (err) {
      console.error('Failed to simulate traffic:', err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (sessions.length === 0) {
      alert('No sessions to export.');
      return;
    }

    const headers = ['Session ID', 'Total Events', 'Page Views', 'Clicks', 'Pages Count', 'Duration (Seconds)', 'First Seen', 'Last Seen'];
    const rows = sessions.map(s => [
      s.sessionId,
      s.totalEvents,
      s.pageViews,
      s.clicks,
      s.pageCount,
      s.durationSeconds,
      s.firstSeen,
      s.lastSeen
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `causalfunnel_sessions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exported sessions analytics as CSV!');
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={fetchData}
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onSeedData={handleSeedData}
        onClearData={handleClearData}
        onSimulateTraffic={handleSimulateTraffic}
        onExportCSV={handleExportCSV}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* KPI Summary Cards */}
        <StatsOverview sessions={sessions} pages={pages} />

        {/* Tab Views */}
        {activeTab === 'sessions' && (
          <SessionsView 
            sessions={sessions}
            onSelectSession={(s) => setSelectedSession(s)}
            onSeedData={handleSeedData}
          />
        )}

        {activeTab === 'heatmap' && (
          <HeatmapView 
            pages={pages}
            sessions={sessions}
          />
        )}

        {activeTab === 'demo' && (
          <LiveTestbench 
            onEventsUpdated={fetchData}
          />
        )}
      </main>

      {/* User Journey Modal */}
      {selectedSession && (
        <SessionJourneyModal 
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          color: '#ffffff',
          padding: '0.75rem 1.4rem',
          borderRadius: '9999px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(12px)',
          fontSize: '0.84rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          animation: 'fadeIn 0.25s ease'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
