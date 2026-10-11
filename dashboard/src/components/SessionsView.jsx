import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  ExternalLink, 
  MousePointer, 
  Eye, 
  Copy, 
  Check, 
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpDown,
  Laptop,
  Timer
} from 'lucide-react';

export default function SessionsView({ sessions = [], onSelectSession, onSeedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'clicks', 'multipage'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'events', 'duration'

  function formatTime(isoString) {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatRelative(isoString) {
    if (!isoString) return 'Just now';
    const deltaMs = Date.now() - new Date(isoString).getTime();
    const sec = Math.floor(deltaMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '< 1s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort
  const filteredSessions = sessions
    .filter(session => {
      const matchesSearch = session.sessionId.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'clicks' && (session.clicks || 0) === 0) return false;
      if (filterType === 'multipage' && (session.pageCount || 1) <= 1) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'events') return (b.totalEvents || 0) - (a.totalEvents || 0);
      if (sortBy === 'duration') return (b.durationSeconds || 0) - (a.durationSeconds || 0);
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });

  return (
    <div className="fade-in">
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              User Sessions Directory
            </h2>
            <span className="badge-pill badge-indigo">
              {filteredSessions.length} recorded
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Inspect full chronological user journeys, click paths, and navigation timelines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Filters */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button 
              onClick={() => setFilterType('all')}
              style={{
                background: filterType === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: filterType === 'all' ? '#a5b4fc' : 'var(--text-muted)',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              All Sessions
            </button>
            <button 
              onClick={() => setFilterType('clicks')}
              style={{
                background: filterType === 'clicks' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: filterType === 'clicks' ? '#6ee7b7' : 'var(--text-muted)',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              With Clicks
            </button>
            <button 
              onClick={() => setFilterType('multipage')}
              style={{
                background: filterType === 'multipage' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                color: filterType === 'multipage' ? '#67e8f9' : 'var(--text-muted)',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Multi-page
            </button>
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem 0.8rem',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="recent">Sort: Most Recent</option>
            <option value="events">Sort: Most Events</option>
            <option value="duration">Sort: Longest Duration</option>
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search Session ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Sessions Table Container */}
      {filteredSessions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Sparkles size={28} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Sessions Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.88rem' }}>
            No user sessions match your search criteria. You can seed sample data or browse the demo store to trigger new events.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button className="btn-ui btn-ui-primary" onClick={onSeedData}>
              Seed Demo Data
            </button>
            <a 
              href="http://localhost:5000/demo/index.html" 
              target="_blank" 
              rel="noreferrer" 
              className="btn-ui btn-ui-secondary"
              style={{ textDecoration: 'none' }}
            >
              Open Demo Store &rarr;
            </a>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Session Identifier</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Total Events</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Activity Breakdown</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Pages Visited</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Session Duration</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Last Active</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, idx) => (
                  <tr 
                    key={session.sessionId}
                    onClick={() => onSelectSession(session)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Session ID */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: `hsl(${(idx * 65 + 200) % 360}, 70%, 25%)`,
                          border: `1px solid hsl(${(idx * 65 + 200) % 360}, 70%, 45%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          flexShrink: 0
                        }}>
                          {session.sessionId.charAt(5)?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            color: '#e2e8f0',
                            fontWeight: 600
                          }}>
                            {session.sessionId}
                          </span>
                          <button 
                            onClick={(e) => copyToClipboard(session.sessionId, e)}
                            title="Copy Session ID"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedId === session.sessionId ? '#22c55e' : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: '2px',
                              borderRadius: '4px'
                            }}
                          >
                            {copiedId === session.sessionId ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Total Events */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <span className="badge-pill badge-indigo">
                        {session.totalEvents} events
                      </span>
                    </td>

                    {/* Breakdown */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#93c5fd' }}>
                          <Eye size={12} /> {session.pageViews || 0} views
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6ee7b7' }}>
                          <MousePointer size={12} /> {session.clicks || 0} clicks
                        </span>
                      </div>
                    </td>

                    {/* Page Count */}
                    <td style={{ padding: '0.95rem 1rem', color: 'var(--text-secondary)' }}>
                      <span className="badge-pill badge-cyan" style={{ fontSize: '0.72rem' }}>
                        {session.pageCount || 1} URL{session.pageCount > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '0.95rem 1rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                        <Timer size={13} color="var(--text-muted)" />
                        <span>{formatDuration(session.durationSeconds)}</span>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {formatRelative(session.lastSeen)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatTime(session.lastSeen)}
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      <button 
                        className="btn-ui btn-ui-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(session);
                        }}
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        <span>User Journey</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
