import React, { useState } from 'react';
import { PlayCircle, ExternalLink, RefreshCw, Smartphone, Monitor, Tablet, Info } from 'lucide-react';

export default function LiveTestbench({ onEventsUpdated }) {
  const [activeUrl, setActiveUrl] = useState('http://localhost:5000/demo/index.html');
  const [deviceView, setDeviceView] = useState('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadIframe = () => {
    setRefreshKey(prev => prev + 1);
    if (onEventsUpdated) onEventsUpdated();
  };

  const getFrameWidth = () => {
    if (deviceView === 'mobile') return '390px';
    if (deviceView === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="fade-in">
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Interactive Live Testbench
              </h2>
              <span className="badge-pill badge-emerald">
                Live Instrumented
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Interact directly with the demo shop below. Clicks, scrolls, and navigations are captured by <code style={{ color: '#38bdf8' }}>tracker.js</code> and immediately logged.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Page selection */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveUrl('http://localhost:5000/demo/index.html')}
                className="btn-ui"
                style={{
                  background: activeUrl.includes('index.html') ? 'var(--primary)' : 'transparent',
                  color: activeUrl.includes('index.html') ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem'
                }}
              >
                Storefront (Home)
              </button>
              <button
                onClick={() => setActiveUrl('http://localhost:5000/demo/pricing.html')}
                className="btn-ui"
                style={{
                  background: activeUrl.includes('pricing.html') ? 'var(--primary)' : 'transparent',
                  color: activeUrl.includes('pricing.html') ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem'
                }}
              >
                Pricing Plans
              </button>
            </div>

            {/* Responsive device viewport presets */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setDeviceView('desktop')}
                style={{
                  background: deviceView === 'desktop' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: deviceView === 'desktop' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Desktop View (100%)"
              >
                <Monitor size={15} />
              </button>
              <button
                onClick={() => setDeviceView('tablet')}
                style={{
                  background: deviceView === 'tablet' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: deviceView === 'tablet' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Tablet View (768px)"
              >
                <Tablet size={15} />
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                style={{
                  background: deviceView === 'mobile' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: deviceView === 'mobile' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Mobile View (390px)"
              >
                <Smartphone size={15} />
              </button>
            </div>

            <button 
              className="btn-ui btn-ui-secondary"
              onClick={reloadIframe}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
              title="Reload preview iframe"
            >
              <RefreshCw size={13} />
              <span>Reload Frame</span>
            </button>

            <a 
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ui btn-ui-primary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', textDecoration: 'none' }}
            >
              <span>Open Standalone</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Embedded Iframe Preview */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0.5rem 0 2rem'
      }}>
        <div style={{
          width: getFrameWidth(),
          maxWidth: '1360px',
          height: '780px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)',
          background: '#0b0f19',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <iframe 
            key={refreshKey}
            src={activeUrl}
            title="Embedded Demo Test Webpage"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
