import React, { useState } from 'react';
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
  Radio,
  Menu,
  X,
  Server,
  TrendingUp
} from 'lucide-react';
import { API_BASE } from '../api/config';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  storageInfo = { storageMode: 'in-memory-fallback', isPersistent: false },
  onRefresh, 
  isLoading, 
  autoRefresh, 
  setAutoRefresh,
  onSeedData,
  onClearData,
  onSimulateTraffic,
  onExportCSV
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMongo = storageInfo.storageMode === 'mongodb' || storageInfo.isPersistent;

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        {/* Brand & Connection / Storage Diagnostic Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}>
              <Activity size={20} color="#ffffff" />
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Causal<span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Funnel</span>
                </span>
                <span className="badge-pill badge-indigo" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                  PRO
                </span>
              </div>
              <div className="brand-subtitle" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Behavioral Analytics & Heatmaps
              </div>
            </div>
          </div>

          {/* Storage Mode Badge (MongoDB vs In-Memory Fallback) */}
          <div 
            className="storage-pill hide-on-mobile"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.28rem 0.75rem',
              background: isMongo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isMongo ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              borderRadius: '9999px',
              fontSize: '0.73rem',
              fontWeight: 600,
              color: isMongo ? '#6ee7b7' : '#fcd34d',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1
            }}
            title={isMongo ? 'Persistent MongoDB storage active' : 'Running in resilient in-memory storage fallback mode'}
          >
            <div className="pulse-beacon" style={{ backgroundColor: isMongo ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{isMongo ? 'MongoDB Active' : 'In-Memory Mode'}</span>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="tabs-nav hide-on-mobile" style={{ flexShrink: 0 }}>
          <button 
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <Layers size={14} />
            <span>Sessions</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'funnel' ? 'active' : ''}`}
            onClick={() => setActiveTab('funnel')}
          >
            <TrendingUp size={14} />
            <span className="tab-label-full">Conversion Funnel</span>
            <span className="tab-label-short">Funnel</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            <MapPin size={14} />
            <span>Heatmap</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => setActiveTab('demo')}
          >
            <PlayCircle size={14} />
            <span className="tab-label-full">Live Testbench</span>
            <span className="tab-label-short">Testbench</span>
          </button>
        </div>

        {/* Desktop Quick Actions */}
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          {/* Live Traffic Simulator */}
          <button 
            className="btn-ui btn-ui-success"
            onClick={onSimulateTraffic}
            title="Simulate a live user session browsing products and clicking CTAs"
            style={{ fontSize: '0.78rem', padding: '0.42rem 0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            <Zap size={13} />
            <span className="btn-label-responsive">Simulate</span>
          </button>

          {/* Export CSV */}
          <button
            className="btn-ui btn-ui-secondary"
            onClick={onExportCSV}
            title="Export session analytics as CSV"
            style={{ fontSize: '0.78rem', padding: '0.42rem 0.65rem', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            <Download size={13} />
            <span className="btn-label-responsive">Export</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button 
            className="btn-ui btn-ui-secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ 
              fontSize: '0.78rem', 
              padding: '0.42rem 0.7rem',
              borderColor: autoRefresh ? 'rgba(99, 102, 241, 0.5)' : undefined,
              background: autoRefresh ? 'rgba(99, 102, 241, 0.1)' : undefined,
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            title="Toggle live 4-second polling"
          >
            <Radio size={13} color={autoRefresh ? '#818cf8' : '#94a3b8'} />
            <span className="btn-label-responsive">Auto: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button 
            className="btn-ui btn-ui-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            style={{ fontSize: '0.78rem', padding: '0.42rem 0.65rem', flexShrink: 0 }}
            title="Fetch latest data"
          >
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* External Demo Store Link */}
          <a 
            href={`${API_BASE}/demo/index.html`} 
            target="_blank" 
            rel="noreferrer"
            className="btn-ui btn-ui-primary"
            style={{ fontSize: '0.78rem', padding: '0.42rem 0.8rem', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            <span>Demo Store</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Mobile Hamburger / Action Toggle */}
        <div className="show-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className="btn-ui btn-ui-secondary"
            onClick={onRefresh}
            style={{ padding: '0.45rem 0.65rem' }}
            title="Refresh"
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            className="btn-ui btn-ui-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ padding: '0.45rem 0.65rem' }}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation & Actions */}
      {mobileMenuOpen && (
        <div 
          className="show-on-mobile fade-in"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(11, 15, 25, 0.98)',
            padding: '1rem 1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* Storage status in mobile */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            background: isMongo ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${isMongo ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            borderRadius: '8px',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Storage Engine:</span>
            <span style={{ fontWeight: 700, color: isMongo ? '#6ee7b7' : '#fcd34d' }}>
              {isMongo ? 'MongoDB (Persistent)' : 'In-Memory Mode (Demo)'}
            </span>
          </div>

          {/* Navigation Tabs on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
            <button 
              className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sessions'); setMobileMenuOpen(false); }}
              style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '0.55rem 0.3rem' }}
            >
              <Layers size={13} />
              <span>Sessions</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'funnel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('funnel'); setMobileMenuOpen(false); }}
              style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '0.55rem 0.3rem' }}
            >
              <TrendingUp size={13} />
              <span>Funnel</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => { setActiveTab('heatmap'); setMobileMenuOpen(false); }}
              style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '0.55rem 0.3rem' }}
            >
              <MapPin size={13} />
              <span>Heatmap</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
              onClick={() => { setActiveTab('demo'); setMobileMenuOpen(false); }}
              style={{ justifyContent: 'center', fontSize: '0.72rem', padding: '0.55rem 0.3rem' }}
            >
              <PlayCircle size={13} />
              <span>Testbench</span>
            </button>
          </div>

          {/* Quick Action Buttons on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            <button 
              className="btn-ui btn-ui-success"
              onClick={() => { onSimulateTraffic(); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', fontSize: '0.8rem' }}
            >
              <Zap size={14} />
              <span>Simulate Session</span>
            </button>
            <button
              className="btn-ui btn-ui-secondary"
              onClick={() => { onExportCSV(); setMobileMenuOpen(false); }}
              style={{ padding: '0.6rem', fontSize: '0.8rem' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              className="btn-ui btn-ui-secondary"
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ padding: '0.6rem', fontSize: '0.8rem' }}
            >
              <Radio size={14} color={autoRefresh ? '#818cf8' : '#94a3b8'} />
              <span>Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
            </button>
            <a 
              href={`${API_BASE}/demo/index.html`} 
              target="_blank" 
              rel="noreferrer"
              className="btn-ui btn-ui-primary"
              style={{ padding: '0.6rem', fontSize: '0.8rem', textDecoration: 'none' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Open Store &rarr;</span>
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .tab-label-short {
          display: none;
        }

        /* Large desktop to compact laptop / tablet adjustments */
        @media (max-width: 1280px) {
          .brand-subtitle {
            display: none !important;
          }
          .tab-label-full {
            display: none !important;
          }
          .tab-label-short {
            display: inline !important;
          }
          .tab-btn {
            padding: 0.45rem 0.85rem !important;
            font-size: 0.82rem !important;
          }
        }

        @media (max-width: 1140px) {
          .btn-label-responsive {
            display: none !important;
          }
        }

        @media (max-width: 980px) {
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: flex !important;
          }
        }

        @media (min-width: 981px) {
          .show-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
