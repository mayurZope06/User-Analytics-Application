import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Zap,
  Compass,
  ShoppingCart,
  CreditCard,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import { getApiUrl } from '../api/config';

export default function FunnelView({ onSimulateTraffic }) {
  const [funnelData, setFunnelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFunnel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/events/funnel'));
      const data = await res.json();
      if (data.success && data.funnel) {
        setFunnelData(data.funnel);
      } else {
        setError('Failed to load funnel metrics');
      }
    } catch (err) {
      console.error('Error fetching funnel:', err);
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnel();
  }, []);

  const getStageIcon = (id) => {
    switch (id) {
      case 'discovery': return <Compass size={18} color="#38bdf8" />;
      case 'engagement': return <ShoppingCart size={18} color="#818cf8" />;
      case 'consideration': return <CreditCard size={18} color="#c084fc" />;
      case 'conversion': return <Award size={18} color="#34d399" />;
      default: return <Sparkles size={18} color="#38bdf8" />;
    }
  };

  const getStageGradient = (index) => {
    const gradients = [
      'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)',
      'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
      'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.15) 100%)',
      'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%)'
    ];
    return gradients[index] || gradients[0];
  };

  const getProgressBarColor = (index) => {
    const colors = [
      'linear-gradient(90deg, #38bdf8, #60a5fa)',
      'linear-gradient(90deg, #818cf8, #a855f7)',
      'linear-gradient(90deg, #c084fc, #ec4899)',
      'linear-gradient(90deg, #34d399, #10b981)'
    ];
    return colors[index] || colors[0];
  };

  return (
    <div className="fade-in">
      {/* Funnel Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              E-Commerce Conversion Funnel & Drop-off
            </h2>
            <span className="badge-pill badge-indigo">
              CRO Heuristics
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Stage-by-stage drop-off analytics tracking visitors from storefront discovery through checkout intent.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn-ui btn-ui-secondary"
            onClick={fetchFunnel}
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Recalculate Funnel</span>
          </button>
          {onSimulateTraffic && (
            <button
              className="btn-ui btn-ui-success"
              onClick={async () => {
                await onSimulateTraffic();
                setTimeout(fetchFunnel, 1000);
              }}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <Zap size={13} />
              <span>Simulate User Flow</span>
            </button>
          )}
        </div>
      </div>

      {loading && !funnelData ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="pulse-beacon" style={{ margin: '0 auto 1rem', width: '12px', height: '12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Calculating stage-by-stage conversion metrics...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: '#f87171' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 0.75rem' }} />
          <p>{error}</p>
          <button className="btn-ui btn-ui-secondary" onClick={fetchFunnel} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </div>
      ) : funnelData ? (
        <>
          {/* Top KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Overall Conversion Rate */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  End-to-End Conversion
                </span>
                <Award size={16} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', margin: '0.5rem 0 0.25rem' }}>
                {funnelData.overallConversionRate}%
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {funnelData.totalConverted} converted out of {funnelData.totalEntrants} total visitors
              </div>
            </div>

            {/* Total Funnel Entrants */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Funnel Entrants
                </span>
                <Compass size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8', margin: '0.5rem 0 0.25rem' }}>
                {funnelData.totalEntrants}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Storefront landing page visits
              </div>
            </div>

            {/* Critical Drop-off Bottleneck */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Primary Bottleneck
                </span>
                <TrendingDown size={16} color="#f87171" />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fca5a5', margin: '0.5rem 0 0.25rem' }}>
                {funnelData.highestDropOffStage || 'None detected'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Highest relative abandonment stage
              </div>
            </div>
          </div>

          {/* Interactive Funnel Visualization */}
          <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Conversion Stage Waterfall</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                (Sequential user transition rates)
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {funnelData.stages.map((stage, idx) => {
                const isLast = idx === funnelData.stages.length - 1;
                const widthPercent = funnelData.totalEntrants > 0
                  ? Math.max(18, Math.round((stage.count / funnelData.totalEntrants) * 100))
                  : 100;

                return (
                  <div key={stage.id} style={{ position: 'relative' }}>
                    {/* Stage Card */}
                    <div style={{
                      background: getStageGradient(idx),
                      border: '1px solid var(--border-medium)',
                      borderRadius: '12px',
                      padding: '1.15rem 1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getStageIcon(stage.id)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#ffffff' }}>
                              {stage.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {stage.description}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                              {stage.count} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>users</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                              {stage.conversionRate}% transition
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress representation */}
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${widthPercent}%`,
                          background: getProgressBarColor(idx),
                          borderRadius: '9999px',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>

                    {/* Drop-off connector callout */}
                    {!isLast && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.65rem 0',
                        position: 'relative'
                      }}>
                        <div style={{
                          background: stage.dropOffRate > 40 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          border: `1px solid ${stage.dropOffRate > 40 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          borderRadius: '9999px',
                          padding: '0.25rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: stage.dropOffRate > 40 ? '#fca5a5' : '#fcd34d'
                        }}>
                          <TrendingDown size={13} />
                          <span>
                            {stage.dropOffRate}% drop-off ({stage.dropOffCount} abandonments)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Insights & Recommendations */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <Sparkles size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                CausalFunnel Heuristic Recommendations
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#38bdf8', marginBottom: '0.35rem' }}>
                  Pricing Page Optimization
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Users who reach the pricing tier comparison convert at a high intent rate. Adding floating pricing CTAs on the product catalog can accelerate transition into Stage 3.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#a855f7', marginBottom: '0.35rem' }}>
                  Frustration & Rage Click Prevention
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Session analysis flags multiple rapid clicks on product showcase buttons. Providing instant loading feedback or visual button ripples eliminates user confusion.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#34d399', marginBottom: '0.35rem' }}>
                  Real-Time Testbench Validation
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Use the Live Testbench tab or Simulate button to test multi-step user conversions across different desktop and mobile viewports.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
