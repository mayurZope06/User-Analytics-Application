import React from 'react';
import { 
  Activity, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  Trash2, 
  Zap,
  Layers,
  MapPin,
  PlayCircle,
  Download,
  ShieldCheck,
  Radio
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onRefresh, 
  isLoading, 
  autoRefresh, 
  setAutoRefresh,
  onSeedData,
  onClearData,
  onSimulateTraffic,
  onExportCSV
}) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand & Live Connection Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Activity size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Causal<span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Funnel</span>
                </span>
                <span className="badge-pill badge-indigo" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                  PRO
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.01em' }}>
                Real-Time Behavioral Analytics & Heatmaps
              </div>
            </div>
          </div>

          {/* Live Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.3rem 0.75rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#6ee7b7'
          }}>
            <div className="pulse-beacon" />
            <span>Ingestion Active</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-nav" style={{ flexWrap: 'wrap' }}>
          <button 
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <Layers size={15} />
            <span>Sessions</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            <MapPin size={15} />
            <span>Heatmap</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => setActiveTab('demo')}
          >
            <PlayCircle size={15} />
            <span>Interactive Demo</span>
          </button>
        </div>

        {/* Global Controls & Hiring Impressive Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* Live Traffic Simulator */}
          <button 
            className="btn-ui btn-ui-success"
            onClick={onSimulateTraffic}
            title="Simulate a live user session browsing products and clicking CTAs"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
          >
            <Zap size={13} />
            <span>Simulate Traffic</span>
          </button>

          {/* Export CSV */}
          <button
            className="btn-ui btn-ui-secondary"
            onClick={onExportCSV}
            title="Export session analytics as CSV"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button 
            className="btn-ui btn-ui-secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ 
              fontSize: '0.78rem', 
              padding: '0.45rem 0.8rem',
              borderColor: autoRefresh ? 'rgba(99, 102, 241, 0.5)' : undefined,
              background: autoRefresh ? 'rgba(99, 102, 241, 0.1)' : undefined
            }}
            title="Toggle live 4-second polling"
          >
            <Radio size={13} color={autoRefresh ? '#818cf8' : '#94a3b8'} />
            <span>Auto: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button 
            className="btn-ui btn-ui-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
            title="Fetch latest data"
          >
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* External Demo Store Link */}
          <a 
            href="http://localhost:5000/demo/index.html" 
            target="_blank" 
            rel="noreferrer"
            className="btn-ui btn-ui-primary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.95rem', textDecoration: 'none' }}
          >
            <span>Open Demo Store</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
