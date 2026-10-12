import React, { useEffect, useState } from 'react';
import { 
  X, 
  MousePointer, 
  Eye, 
  Clock, 
  MapPin, 
  Code, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar,
  Download,
  Filter,
  CheckCircle2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function SessionJourneyModal({ session, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [eventFilter, setEventFilter] = useState('all'); // 'all', 'clicks', 'views'

  useEffect(() => {
    if (!session) return;
    setLoading(true);

    fetch(getApiUrl(`/api/sessions/${session.sessionId}`))
      .then(res => res.json())
      .then(data => {
        if (data.success && data.events) {
          setEvents(data.events);
        } else {
          setEvents([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load session events:', err);
        setEvents([]);
        setLoading(false);
      });
  }, [session]);

  if (!session) return null;

  const startTime = events.length > 0 ? new Date(events[0].timestamp).getTime() : 0;

  function getRelativeTime(timestamp) {
    if (!startTime) return '+0s';
    const deltaMs = new Date(timestamp).getTime() - startTime;
    const deltaSec = Math.max(0, Math.round(deltaMs / 1000));
    if (deltaSec < 60) return `+${deltaSec}s`;
    const m = Math.floor(deltaSec / 60);
    const s = deltaSec % 60;
    return `+${m}m ${s}s`;
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  // Filter events
  const filteredEvents = events.filter(ev => {
    if (eventFilter === 'clicks') return ev.eventType === 'click';
    if (eventFilter === 'views') return ev.eventType === 'page_view';
    return true;
  });

  // Extract page flow breadcrumbs
  const pageFlow = [];
  events.forEach(ev => {
    const pageName = ev.pagePath || (ev.pageUrl ? ev.pageUrl.split('/').pop() || '/' : '/');
    if (pageFlow.length === 0 || pageFlow[pageFlow.length - 1] !== pageName) {
      pageFlow.push(pageName);
    }
  });

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `journey_${session.sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel modal-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(11, 15, 25, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="modal-header-container"
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
              <span className="badge-pill badge-indigo">
                User Journey Flow
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>
                {session.sessionId}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Total steps: {events.length} interactions &bull; First seen: {events[0] ? formatTime(events[0].timestamp) : '--'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleExportJSON}
              className="btn-ui btn-ui-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              title="Export complete session events as JSON"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
            <button 
              onClick={onClose}
              className="btn-ui btn-ui-secondary"
              style={{ padding: '0.4rem', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Path Breadcrumbs Bar */}
        {pageFlow.length > 0 && (
          <div style={{
            padding: '0.75rem 1.75rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Navigation size={13} color="var(--primary-light)" />
              Route Flow:
            </span>
            {pageFlow.map((page, idx) => (
              <React.Fragment key={idx}>
                <span className="badge-pill badge-cyan" style={{ fontSize: '0.72rem' }}>
                  {page}
                </span>
                {idx < pageFlow.length - 1 && (
                  <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div style={{
          padding: '0.65rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.2)'
        }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Showing {filteredEvents.length} of {events.length} timeline events
          </span>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setEventFilter('all')}
              style={{
                background: eventFilter === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: eventFilter === 'all' ? '#a5b4fc' : 'var(--text-muted)',
                border: 'none',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setEventFilter('clicks')}
              style={{
                background: eventFilter === 'clicks' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: eventFilter === 'clicks' ? '#6ee7b7' : 'var(--text-muted)',
                border: 'none',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clicks ({events.filter(e => e.eventType === 'click').length})
            </button>
            <button
              onClick={() => setEventFilter('views')}
              style={{
                background: eventFilter === 'views' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: eventFilter === 'views' ? '#67e8f9' : 'var(--text-muted)',
                border: 'none',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Page Views ({events.filter(e => e.eventType === 'page_view').length})
            </button>
          </div>
        </div>

        {/* Modal Body / Timeline */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-secondary)' }}>
              <div>Loading user journey timeline...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
              No recorded events for this filter.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Connecting Vertical Line */}
              <div style={{
                position: 'absolute',
                left: '28px',
                top: '15px',
                bottom: '15px',
                width: '2px',
                background: 'linear-gradient(to bottom, #6366f1, #06b6d4, #10b981)',
                opacity: 0.35
              }} />

              {filteredEvents.map((ev, idx) => {
                const isClick = ev.eventType === 'click';
                const isExpanded = expandedIndex === idx;

                return (
                  <div 
                    key={ev._id || idx}
                    style={{
                      display: 'flex',
                      gap: '1.25rem',
                      marginBottom: '1.35rem',
                      position: 'relative'
                    }}
                  >
                    {/* Node Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isClick ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      border: `2px solid ${isClick ? '#10b981' : '#6366f1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 2,
                      boxShadow: `0 0 14px ${isClick ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                    }}>
                      {isClick ? <MousePointer size={14} color="#6ee7b7" /> : <Eye size={14} color="#a5b4fc" />}
                    </div>

                    {/* Step Card */}
                    <div 
                      className="glass-panel"
                      style={{
                        flex: 1,
                        padding: '1.1rem 1.35rem',
                        background: 'rgba(15, 23, 42, 0.75)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-card)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span className={`badge-pill ${isClick ? 'badge-emerald' : 'badge-indigo'}`} style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Step {idx + 1}: {ev.eventType}
                          </span>

                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {getRelativeTime(ev.timestamp)}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatTime(ev.timestamp)}
                        </span>
                      </div>

                      {/* Content summary */}
                      {isClick ? (
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>
                            Clicked <code style={{ color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                              &lt;{ev.elementTag || 'element'}{ev.elementId ? `#${ev.elementId}` : ''}&gt;
                            </code>
                            {ev.elementText && <span> "{ev.elementText}"</span>}
                          </div>

                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <div>
                              <strong>Coords:</strong> X: {ev.x || ev.clientX}px, Y: {ev.y || ev.clientY}px 
                              {ev.xPct !== null && <span style={{ color: '#38bdf8' }}> ({ev.xPct}% × {ev.yPct}%)</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} color="var(--text-muted)" />
                              <span style={{ wordBreak: 'break-all' }}>{ev.pageUrl}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>
                            Viewed Page: <span style={{ color: '#a5b4fc' }}>{ev.pageTitle || ev.pagePath || ev.pageUrl}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            URL: {ev.pageUrl}
                            {ev.viewportWidth && <span> (Viewport: {ev.viewportWidth} &times; {ev.viewportHeight})</span>}
                          </div>
                        </div>
                      )}

                      {/* Accordion Raw JSON */}
                      <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        <button 
                          onClick={() => toggleExpand(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <Code size={12} />
                          <span>{isExpanded ? 'Hide Raw Details' : 'View Payload Schema'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {isExpanded && (
                          <pre style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: '#030712',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            fontFamily: 'var(--font-mono)',
                            overflowX: 'auto',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            {JSON.stringify(ev, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .modal-backdrop {
            padding: 0.5rem !important;
          }
          .modal-card {
            max-height: 96vh !important;
            border-radius: 14px !important;
          }
          .modal-header-container {
            padding: 1rem 1.15rem !important;
          }
        }
      `}</style>
    </div>
  );
}
