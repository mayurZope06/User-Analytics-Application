import React, { useEffect, useRef, useState } from 'react';
import { 
  Flame, 
  CircleDot, 
  Grid, 
  Layers, 
  Sliders, 
  Eye, 
  ExternalLink,
  MapPin,
  RefreshCw,
  Sparkles,
  MousePointer,
  Crosshair,
  Info,
  Maximize2
} from 'lucide-react';
import { API_BASE, getApiUrl } from '../api/config';

export default function HeatmapView({ pages = [], sessions = [] }) {
  const [selectedUrl, setSelectedUrl] = useState('');
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState('heatmap'); // 'heatmap', 'dots', 'grid'
  const [showPreviewBg, setShowPreviewBg] = useState(true);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [radius, setRadius] = useState(38);
  const [opacity, setOpacity] = useState(0.85);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (pages.length > 0 && !selectedUrl) {
      setSelectedUrl(pages[0].pageUrl);
    } else if (!selectedUrl) {
      setSelectedUrl(`${API_BASE}/demo/index.html`);
    }
  }, [pages]);

  useEffect(() => {
    if (!selectedUrl) return;
    setLoading(true);

    const query = new URLSearchParams({ url: selectedUrl });
    if (sessionFilter !== 'all') {
      query.append('sessionId', sessionFilter);
    }

    fetch(getApiUrl(`/api/events/clicks?${query.toString()}`))
      .then(res => res.json())
      .then(data => {
        if (data.success && data.clicks) {
          setClicks(data.clicks);
        } else {
          setClicks([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load click data:', err);
        setClicks([]);
        setLoading(false);
      });
  }, [selectedUrl, sessionFilter]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (clicks.length === 0) return;

    if (displayMode === 'heatmap') {
      // 1. Draw radial gradient alpha masks
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = width;
      shadowCanvas.height = height;
      const sCtx = shadowCanvas.getContext('2d');

      clicks.forEach(click => {
        let px = click.x;
        let py = click.y;

        if (click.xPct !== null && click.xPct !== undefined) {
          px = (click.xPct / 100) * width;
        }
        if (click.yPct !== null && click.yPct !== undefined) {
          py = (click.yPct / 100) * height;
        }

        const radGrad = sCtx.createRadialGradient(px, py, 0, px, py, radius);
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        sCtx.fillStyle = radGrad;
        sCtx.beginPath();
        sCtx.arc(px, py, radius, 0, Math.PI * 2);
        sCtx.fill();
      });

      // 2. Colorize alpha values with heat gradient
      const imgData = sCtx.getImageData(0, 0, width, height);
      const data = imgData.data;

      function getHeatColor(alpha) {
        const norm = alpha / 255;
        let r = 0, g = 0, b = 0;
        if (norm <= 0.25) {
          const t = norm / 0.25;
          r = 0;
          g = Math.round(255 * t);
          b = 255;
        } else if (norm <= 0.5) {
          const t = (norm - 0.25) / 0.25;
          r = 0;
          g = 255;
          b = Math.round(255 * (1 - t));
        } else if (norm <= 0.75) {
          const t = (norm - 0.5) / 0.25;
          r = Math.round(255 * t);
          g = 255;
          b = 0;
        } else {
          const t = (norm - 0.75) / 0.25;
          r = 255;
          g = Math.round(255 * (1 - t));
          b = 0;
        }
        return [r, g, b, Math.round(alpha * opacity)];
      }

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          const [r, g, b, a] = getHeatColor(alpha);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }

      ctx.putImageData(imgData, 0, 0);

    } else if (displayMode === 'dots') {
      // 2. Draw crisp neon scatter dots
      clicks.forEach((click) => {
        let px = click.x;
        let py = click.y;

        if (click.xPct !== null && click.xPct !== undefined) {
          px = (click.xPct / 100) * width;
        }
        if (click.yPct !== null && click.yPct !== undefined) {
          py = (click.yPct / 100) * height;
        }

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.fill();

        // Mid ring
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

    } else if (displayMode === 'grid') {
      // 3. Grid matrix
      const cols = 16;
      const rows = 12;
      const cellW = width / cols;
      const cellH = height / rows;
      const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

      let maxCount = 1;
      clicks.forEach(click => {
        let px = click.x;
        let py = click.y;
        if (click.xPct !== null) px = (click.xPct / 100) * width;
        if (click.yPct !== null) py = (click.yPct / 100) * height;

        const col = Math.min(cols - 1, Math.max(0, Math.floor(px / cellW)));
        const row = Math.min(rows - 1, Math.max(0, Math.floor(py / cellH)));
        grid[row][col]++;
        if (grid[row][col] > maxCount) maxCount = grid[row][col];
      });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const count = grid[r][c];
          if (count > 0) {
            const intensity = count / maxCount;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + intensity * 0.75})`;
            ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count.toString(), c * cellW + cellW / 2, r * cellH + cellH / 2);
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
    }
  }, [clicks, displayMode, radius, opacity]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = mouseX * scaleX;
    const canvasY = mouseY * scaleY;

    let closest = null;
    let minDistance = 25;

    clicks.forEach((click) => {
      let px = click.x;
      let py = click.y;
      if (click.xPct !== null) px = (click.xPct / 100) * canvas.width;
      if (click.yPct !== null) py = (click.yPct / 100) * canvas.height;

      const dist = Math.hypot(px - canvasX, py - canvasY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...click, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top };
      }
    });

    setHoveredPoint(closest);
  };

  const uniqueSessionCount = new Set(clicks.map(c => c.sessionId)).size;

  return (
    <div className="fade-in">
      {/* Top Controls Toolbar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          {/* URL Selection */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Target Page URL
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedUrl}
                onChange={(e) => setSelectedUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.86rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {pages.map((p, idx) => (
                  <option key={idx} value={p.pageUrl}>
                    {p.pageUrl} ({p.clicks || 0} clicks)
                  </option>
                ))}
                {!pages.some(p => p.pageUrl === selectedUrl) && (
                  <option value={selectedUrl}>{selectedUrl}</option>
                )}
              </select>

              <a 
                href={selectedUrl} 
                target="_blank" 
                rel="noreferrer"
                className="btn-ui btn-ui-secondary"
                style={{ padding: '0.55rem', borderRadius: '8px' }}
                title="Open this URL in standalone tab"
              >
                <ExternalLink size={15} />
              </a>
            </div>
          </div>

          {/* Visualization Modes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Visualization Mode
            </label>
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={() => setDisplayMode('heatmap')}
                className="btn-ui"
                style={{
                  background: displayMode === 'heatmap' ? 'var(--primary)' : 'transparent',
                  color: displayMode === 'heatmap' ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem'
                }}
              >
                <Flame size={13} />
                <span>Heatmap</span>
              </button>
              <button 
                onClick={() => setDisplayMode('dots')}
                className="btn-ui"
                style={{
                  background: displayMode === 'dots' ? 'var(--primary)' : 'transparent',
                  color: displayMode === 'dots' ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem'
                }}
              >
                <CircleDot size={13} />
                <span>Dots</span>
              </button>
              <button 
                onClick={() => setDisplayMode('grid')}
                className="btn-ui"
                style={{
                  background: displayMode === 'grid' ? 'var(--primary)' : 'transparent',
                  color: displayMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem'
                }}
              >
                <Grid size={13} />
                <span>Grid</span>
              </button>
            </div>
          </div>

          {/* Session Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Filter By Session
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.82rem',
                outline: 'none',
                minWidth: '160px'
              }}
            >
              <option value="all">All Sessions ({sessions.length})</option>
              {sessions.map(s => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId.substring(0, 18)}...
                </option>
              ))}
            </select>
          </div>

          {/* Sliders & Preview Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingTop: '1.2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Radius:</span>
              <input 
                type="range" 
                min="15" 
                max="65" 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ width: '75px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Opacity:</span>
              <input 
                type="range" 
                min="0.2" 
                max="1" 
                step="0.05"
                value={opacity} 
                onChange={(e) => setOpacity(Number(e.target.value))}
                style={{ width: '75px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>

            <button 
              className={`btn-ui ${showPreviewBg ? 'btn-ui-primary' : 'btn-ui-secondary'}`}
              onClick={() => setShowPreviewBg(!showPreviewBg)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.76rem' }}
              title="Toggle page background preview"
            >
              <Eye size={13} />
              <span>Backdrop</span>
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Canvas Container */}
      <div 
        ref={containerRef}
        className="glass-panel heatmap-canvas-container" 
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          minHeight: '750px',
          border: '1px solid var(--border-medium)',
          background: '#030712'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Floating Top Indicator Bar */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '0.45rem 0.95rem',
          borderRadius: '9999px',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          fontSize: '0.76rem',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, color: '#38bdf8' }}>{clicks.length}</span>
            <span style={{ color: 'var(--text-secondary)' }}>clicks plotted</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, color: '#a5b4fc' }}>{uniqueSessionCount}</span>
            <span style={{ color: 'var(--text-secondary)' }}>unique visitors</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cold</span>
            <div style={{
              width: '70px',
              height: '6px',
              borderRadius: '9999px',
              background: 'linear-gradient(to right, #00f, #0ff, #0f0, #ff0, #f00)'
            }} />
            <span style={{ color: 'var(--text-muted)' }}>Hot</span>
          </div>
        </div>

        {/* Live Page Preview Underneath */}
        {showPreviewBg && selectedUrl && (
          <iframe 
            src={selectedUrl}
            title="Tracked Page Layout"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              zIndex: 1,
              pointerEvents: 'none',
              filter: 'brightness(0.85) contrast(1.05)'
            }}
          />
        )}

        {/* Canvas Overlay */}
        <canvas 
          ref={canvasRef}
          width={1200}
          height={850}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            cursor: displayMode === 'dots' ? 'crosshair' : 'default'
          }}
        />

        {/* Tooltip in Dots Mode */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(hoveredPoint.screenX + 14, 900)}px`,
            top: `${Math.max(hoveredPoint.screenY - 14, 20)}px`,
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid #38bdf8',
            borderRadius: '10px',
            padding: '0.65rem 0.9rem',
            pointerEvents: 'none',
            fontSize: '0.76rem',
            boxShadow: 'var(--shadow-elevated)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            maxWidth: '300px'
          }}>
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Crosshair size={13} />
              <span>&lt;{hoveredPoint.elementTag || 'element'}{hoveredPoint.elementId ? `#${hoveredPoint.elementId}` : ''}&gt;</span>
            </div>
            {hoveredPoint.elementText && (
              <div style={{ color: '#e2e8f0', marginBottom: '0.3rem', fontStyle: 'italic' }}>
                "{hoveredPoint.elementText}"
              </div>
            )}
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              Coords: X: {hoveredPoint.x}px, Y: {hoveredPoint.y}px
              {hoveredPoint.xPct !== null && ` (${hoveredPoint.xPct}% × ${hoveredPoint.yPct}%)`}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.25rem' }}>
              Session: {hoveredPoint.sessionId?.substring(0, 16)}...
            </div>
          </div>
        )}

        {/* Empty State Banner if no clicks on this page */}
        {clicks.length === 0 && !loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '2.5rem 3.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid var(--border-medium)',
            backdropFilter: 'blur(14px)',
            boxShadow: 'var(--shadow-elevated)'
          }}>
            <MousePointer size={36} color="#818cf8" style={{ marginBottom: '0.85rem' }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', color: '#ffffff' }}>No Clicks Logged for this Page</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '380px', marginBottom: '1.35rem' }}>
              Open the demo store or use the live simulator to generate user clicks and watch them cluster on the heatmap.
            </p>
            <a 
              href={selectedUrl} 
              target="_blank" 
              rel="noreferrer"
              className="btn-ui btn-ui-primary"
              style={{ textDecoration: 'none' }}
            >
              Open Store & Click Buttons &rarr;
            </a>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .heatmap-canvas-container {
            min-height: 480px !important;
          }
        }
      `}</style>
    </div>
  );
}
