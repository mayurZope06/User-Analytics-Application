import React from 'react';
import { Users, Activity, MousePointerClick, Globe, ArrowUpRight, TrendingUp, Zap } from 'lucide-react';

export default function StatsOverview({ sessions = [], pages = [] }) {
  const totalSessions = sessions.length;
  const totalEvents = sessions.reduce((acc, s) => acc + (s.totalEvents || 0), 0);
  const totalPageViews = sessions.reduce((acc, s) => acc + (s.pageViews || 0), 0);
  const totalClicks = sessions.reduce((acc, s) => acc + (s.clicks || 0), 0);
  const uniquePages = pages.length;

  const clickRatio = totalEvents > 0 ? ((totalClicks / totalEvents) * 100).toFixed(1) : '0';
  const avgEventsPerSession = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : '0';

  const cards = [
    {
      title: 'Active Sessions',
      value: totalSessions.toLocaleString(),
      change: 'Live Traffic',
      subtext: `${avgEventsPerSession} events/session`,
      icon: Users,
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.25)',
      badgeClass: 'badge-indigo'
    },
    {
      title: 'Ingested Events',
      value: totalEvents.toLocaleString(),
      change: `${totalPageViews} Views`,
      subtext: 'Real-time stream',
      icon: Activity,
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.25)',
      badgeClass: 'badge-cyan'
    },
    {
      title: 'Interaction Clicks',
      value: totalClicks.toLocaleString(),
      change: `${clickRatio}% CTR`,
      subtext: 'High engagement',
      icon: MousePointerClick,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.25)',
      badgeClass: 'badge-emerald'
    },
    {
      title: 'Tracked URLs',
      value: uniquePages.toLocaleString(),
      change: `${uniquePages} Routes`,
      subtext: 'Catalog & Pricing',
      icon: Globe,
      color: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.25)',
      badgeClass: 'badge-amber'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem'
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx} 
            className="glass-panel glow-card"
            style={{
              padding: '1.35rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default'
            }}
          >
            {/* Ambient Background Radial Glow */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: card.glow,
              borderRadius: '50%',
              filter: 'blur(24px)',
              pointerEvents: 'none'
            }} />

            {/* Header with Title and Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.title}
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: '0.2rem' }}>
                  {card.value}
                </div>
              </div>

              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: `rgba(${card.color === '#6366f1' ? '99, 102, 241' : card.color === '#06b6d4' ? '6, 182, 212' : card.color === '#10b981' ? '16, 185, 129' : '139, 92, 246'}, 0.12)`,
                border: `1px solid ${card.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} color={card.color} />
              </div>
            </div>

            {/* Bottom Row with Badge and Context Subtext */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginTop: '0.5rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap'
            }}>
              <span className={`badge-pill ${card.badgeClass}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                <TrendingUp size={11} />
                <span>{card.change}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.subtext}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
