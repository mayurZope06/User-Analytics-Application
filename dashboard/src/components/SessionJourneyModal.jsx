import React, { useEffect, useState, useRef } from 'react';
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
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Monitor,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function SessionJourneyModal({ session, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [eventFilter, setEventFilter] = useState('all'); // 'all', 'clicks', 'views'
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'replay'

  // Replay Player State
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 0.5, 1, 2, 4
  const [clickRipples, setClickRipples] = useState([]);
  const timerRef = useRef(null);

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

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Replay timer loop
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      const delay = Math.max(350, 1600 / playSpeed);
      timerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          triggerRippleForEvent(events[next]);
          return next;
        });
      }, delay);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, events, playSpeed]);

  const triggerRippleForEvent = (ev) => {
    if (!ev || ev.eventType !== 'click') return;
    const xPct = ev.xPct !== null && ev.xPct !== undefined ? ev.xPct : (ev.x ? (ev.x / 1200) * 100 : 50);
    const yPct = ev.yPct !== null && ev.yPct !== undefined ? ev.yPct : (ev.y ? (ev.y / 800) * 100 : 50);
    
    const ripple = {
      id: Date.now() + Math.random(),
      xPct: Math.min(95, Math.max(5, xPct)),
      yPct: Math.min(95, Math.max(5, yPct)),
      text: ev.elementText || ev.elementId || 'Click'
    };
    setClickRipples(prev => [...prev.slice(-4), ripple]);
    setTimeout(() => {
      setClickRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 1200);
  };

  const handleStepChange = (idx) => {
    const validIdx = Math.max(0, Math.min(events.length - 1, idx));
    setCurrentStep(validIdx);
    triggerRippleForEvent(events[validIdx]);
  };

  if (!session) return null;

  const currentEvent = events[currentStep] || events[0] || null;
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

  // Filter events for timeline view
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

  // Calculate cursor coordinates for current replay step
  const cursorCoords = (() => {
    if (!currentEvent) return { xPct: 50, yPct: 50, isClick: false };
    if (currentEvent.eventType === 'click') {
      const xPct = currentEvent.xPct !== null && currentEvent.xPct !== undefined 
        ? currentEvent.xPct 
        : (currentEvent.x ? (currentEvent.x / 1200) * 100 : 50);
      const yPct = currentEvent.yPct !== null && currentEvent.yPct !== undefined 
        ? currentEvent.yPct 
        : (currentEvent.y ? (currentEvent.y / 800) * 100 : 50);
      return { xPct: Math.min(94, Math.max(6, xPct)), yPct: Math.min(92, Math.max(8, yPct)), isClick: true };
    }
    return { xPct: 50, yPct: 35, isClick: false };
  })();

  return (
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel modal-card"
        style={{
          width: '100%',
          maxWidth: viewMode === 'replay' ? '960px' : '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(11, 15, 25, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)',
          borderRadius: '20px',
          overflow: 'hidden',
          transition: 'max-width 0.3s ease'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <span className="badge-pill badge-indigo">
                User Session Journey
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>
                {session.sessionId}
              </span>

              {/* Frustration / Rage Click Badge */}
              {session.hasRageClick && (
                <span className="badge-pill" style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}>
                  <Flame size={12} style={{ display: 'inline', marginRight: '3px' }} />
                  Frustration / Rage Clicks
                </span>
              )}

              {/* Intent Tier Badge */}
              {session.intentTier && (
                <span className="badge-pill" style={{
                  background: session.intentTier === 'High Intent' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: session.intentTier === 'High Intent' ? '#34d399' : '#60a5fa',
                  border: `1px solid ${session.intentTier === 'High Intent' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                }}>
                  {session.intentTier}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Total steps: {events.length} interactions &bull; First seen: {events[0] ? formatTime(events[0].timestamp) : '--'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* View Mode Toggle Switch */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.4)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  background: viewMode === 'timeline' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: viewMode === 'timeline' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('replay')}
                style={{
                  background: viewMode === 'replay' ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Monitor size={12} />
                <span>Visual Replay</span>
              </button>
            </div>

            <button
              onClick={handleExportJSON}
              className="btn-ui btn-ui-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              title="Export complete session events as JSON"
            >
              <Download size={13} />
              <span className="hide-on-mobile">Export JSON</span>
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

        {/* Modal Body: Switch between Interactive Replay and Timeline */}
        {viewMode === 'replay' ? (
          /* ==========================================================
             INTERACTIVE SESSION REPLAY PLAYER
             ========================================================== */
          <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No events recorded for this session.
              </div>
            ) : (
              <>
                {/* Virtual Browser Container */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  {/* Browser Window Header & Address Bar */}
                  <div style={{
                    background: '#0f172a',
                    padding: '0.6rem 1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    {/* Window dots */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    </div>

                    {/* Address bar */}
                    <div style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#93c5fd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <span style={{ color: '#34d399', fontSize: '0.7rem' }}>🔒 https://</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentEvent?.pageUrl || 'localhost:5000/demo/index.html'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Step {currentStep + 1} / {events.length}
                    </div>
                  </div>

                  {/* Browser Virtual Viewport Area */}
                  <div style={{
                    height: '320px',
                    position: 'relative',
                    background: 'radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, rgba(3, 7, 18, 0.95) 100%)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none'
                  }}>
                    {/* Background Grid & Wireframe Simulation */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                      opacity: 0.6
                    }} />

                    {/* Simulated Page Wireframe Layout */}
                    <div style={{
                      position: 'absolute',
                      inset: '20px',
                      border: '1px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '15px',
                      gap: '12px',
                      pointerEvents: 'none'
                    }}>
                      {/* Wireframe Navbar */}
                      <div style={{ height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '100%', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px' }}>
                        <div style={{ width: '40px', height: '10px', background: 'rgba(99,102,241,0.3)', borderRadius: '3px' }} />
                        <div style={{ width: '30px', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }} />
                        <div style={{ width: '30px', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }} />
                      </div>
                      {/* Wireframe Hero / Content */}
                      <div style={{ flex: 1, display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1.5, background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', padding: '12px' }}>
                          <div style={{ width: '60%', height: '14px', background: 'rgba(56,189,248,0.2)', borderRadius: '3px', marginBottom: '8px' }} />
                          <div style={{ width: '85%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '6px' }} />
                          <div style={{ width: '45%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '14px' }} />
                          <div style={{ width: '100px', height: '22px', background: 'rgba(99,102,241,0.25)', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.4)' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }} />
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Animated Click Ripples */}
                    {clickRipples.map(ripple => (
                      <div 
                        key={ripple.id}
                        style={{
                          position: 'absolute',
                          left: `${ripple.xPct}%`,
                          top: `${ripple.yPct}%`,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 20
                        }}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          border: '2px solid #38bdf8',
                          animation: 'pulseRing 1s cubic-bezier(0.215, 0.61, 0.355, 1) forwards',
                          boxShadow: '0 0 16px rgba(56, 189, 248, 0.8)'
                        }} />
                        <span style={{
                          position: 'absolute',
                          top: '-24px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}>
                          {ripple.text}
                        </span>
                      </div>
                    ))}

                    {/* Virtual Mouse Pointer */}
                    <div style={{
                      position: 'absolute',
                      left: `${cursorCoords.xPct}%`,
                      top: `${cursorCoords.yPct}%`,
                      transform: 'translate(-3px, -3px)',
                      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      pointerEvents: 'none',
                      zIndex: 30
                    }}>
                      <div style={{ position: 'relative' }}>
                        <MousePointer 
                          size={24} 
                          color={cursorCoords.isClick ? '#38bdf8' : '#ffffff'} 
                          style={{
                            fill: cursorCoords.isClick ? '#0284c7' : 'rgba(255, 255, 255, 0.4)',
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
                            transform: cursorCoords.isClick ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.15s ease'
                          }} 
                        />
                        {/* Virtual Cursor Trail Glow */}
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: '2px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: cursorCoords.isClick ? '#38bdf8' : '#818cf8',
                          boxShadow: '0 0 10px #38bdf8'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player Controls Bar */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {/* Scrubber slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '40px' }}>
                      {currentEvent ? getRelativeTime(currentEvent.timestamp) : '+0s'}
                    </span>
                    <input 
                      type="range"
                      min={0}
                      max={events.length - 1}
                      value={currentStep}
                      onChange={(e) => handleStepChange(Number(e.target.value))}
                      style={{
                        flex: 1,
                        accentColor: '#6366f1',
                        cursor: 'pointer',
                        height: '6px'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
                      {events.length > 0 ? getRelativeTime(events[events.length - 1].timestamp) : '+0s'}
                    </span>
                  </div>

                  {/* Playback Buttons & Speed */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStepChange(0)}
                        className="btn-ui btn-ui-secondary"
                        style={{ padding: '0.35rem 0.6rem' }}
                        title="Restart from Step 1"
                      >
                        <RotateCcw size={14} />
                      </button>

                      <button
                        onClick={() => handleStepChange(currentStep - 1)}
                        disabled={currentStep === 0}
                        className="btn-ui btn-ui-secondary"
                        style={{ padding: '0.35rem 0.6rem' }}
                        title="Previous Step"
                      >
                        <SkipBack size={14} />
                      </button>

                      <button
                        onClick={() => {
                          if (currentStep >= events.length - 1) {
                            setCurrentStep(0);
                            setIsPlaying(true);
                          } else {
                            setIsPlaying(!isPlaying);
                          }
                        }}
                        className="btn-ui btn-ui-primary"
                        style={{ padding: '0.35rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                      </button>

                      <button
                        onClick={() => handleStepChange(currentStep + 1)}
                        disabled={currentStep >= events.length - 1}
                        className="btn-ui btn-ui-secondary"
                        style={{ padding: '0.35rem 0.6rem' }}
                        title="Next Step"
                      >
                        <SkipForward size={14} />
                      </button>
                    </div>

                    {/* Speed Multipliers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginRight: '4px' }}>Speed:</span>
                      {[0.5, 1, 2, 4].map(spd => (
                        <button
                          key={spd}
                          onClick={() => setPlaySpeed(spd)}
                          style={{
                            background: playSpeed === spd ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.04)',
                            color: playSpeed === spd ? '#ffffff' : 'var(--text-muted)',
                            border: `1px solid ${playSpeed === spd ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255,255,255,0.08)'}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Current Active Step Details Card */}
                {currentEvent && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                        {currentEvent.eventType === 'click' ? (
                          <span>
                            🖱️ Clicked <code style={{ color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                              &lt;{currentEvent.elementTag || 'element'}{currentEvent.elementId ? `#${currentEvent.elementId}` : ''}&gt;
                            </code>
                            {currentEvent.elementText && <span> "{currentEvent.elementText}"</span>}
                          </span>
                        ) : (
                          <span>
                            📄 Viewed <span style={{ color: '#a5b4fc' }}>{currentEvent.pageTitle || currentEvent.pagePath || currentEvent.pageUrl}</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Timestamp: {formatTime(currentEvent.timestamp)} ({getRelativeTime(currentEvent.timestamp)})
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {currentEvent.eventType === 'click' ? (
                        <span>Coordinates: X: {currentEvent.x}px, Y: {currentEvent.y}px</span>
                      ) : (
                        <span>Viewport: {currentEvent.viewportWidth || 1440} &times; {currentEvent.viewportHeight || 900}</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ==========================================================
             DETAILED CHRONOLOGICAL TIMELINE VIEW
             ========================================================== */
          <>
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
                    background: eventFilter === 'views' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: eventFilter === 'views' ? '#7dd3fc' : 'var(--text-muted)',
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

            {/* Timeline Scroll Area */}
            <div style={{
              padding: '1.5rem 1.75rem',
              overflowY: 'auto',
              flex: 1
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="pulse-beacon" style={{ margin: '0 auto 1rem', width: '12px', height: '12px' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>Loading session journey events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  No events found matching the selected filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                  {/* Subtle vertical spine guide line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '19px',
                    width: '2px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    zIndex: 0
                  }} />

                  {filteredEvents.map((ev, idx) => {
                    const isClick = ev.eventType === 'click';
                    const isExpanded = expandedIndex === idx;

                    return (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        {/* Event Type Icon Node */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: isClick 
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.1))' 
                            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(3, 105, 161, 0.1))',
                          border: `1px solid ${isClick ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isClick ? '0 0 12px rgba(16, 185, 129, 0.2)' : '0 0 12px rgba(56, 189, 248, 0.2)'
                        }}>
                          {isClick ? <MousePointer size={18} color="#34d399" /> : <Eye size={18} color="#38bdf8" />}
                        </div>

                        {/* Event Card */}
                        <div style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          padding: '1rem 1.25rem',
                          transition: 'border-color 0.2s ease'
                        }}>
                          {/* Card header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`badge-pill ${isClick ? 'badge-emerald' : 'badge-cyan'}`} style={{ fontSize: '0.7rem' }}>
                                {isClick ? 'Click Event' : 'Page View'}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                Step #{idx + 1}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                                {getRelativeTime(ev.timestamp)}
                              </span>
                              <span>&bull;</span>
                              <span>{formatTime(ev.timestamp)}</span>
                            </div>
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
          </>
        )}
      </div>

      <style>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.4);
            opacity: 1;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
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
