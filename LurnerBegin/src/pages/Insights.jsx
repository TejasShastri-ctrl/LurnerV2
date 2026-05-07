import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';

/* ── Stat card icons (simple SVG, no emojis) ── */
const STAT_ICONS = {
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  repeat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1 21 5l-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23 3 19l4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
};

export default function Insights() {
  const { token } = useAuth();
  const [stats, setStats]       = useState(null);
  const [heatmap, setHeatmap]   = useState([]);
  const [skills, setSkills]     = useState([]);
  const [errors, setErrors]     = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading]   = useState(true);

  // AI Report states
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (token) {
      Promise.all([
        api.fetchUserStats(token),
        api.fetchActivityHeatmap(token),
        api.fetchSkillMastery(token),
        api.fetchErrorDistribution(token),
        api.fetchPerformanceTelemetry(token),
      ]).then(([s, h, sk, e, t]) => {
        setStats(s);
        setHeatmap(h);
        setSkills(sk);
        setErrors(e);
        setTelemetry(t);
        setLoading(false);
      }).catch(err => {
        console.error('Failed to load insights:', err);
        setLoading(false);
      });

      // Try to load cached AI report silently
      api.fetchAiReport(token, 7).then(report => {
        if (report) setAiReport(report.reportData);
      }).catch(console.error);
    }
  }, [token]);

  const handleGenerateAiReport = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await api.generateAiReport(token, 7);
      setAiReport(response.reportData);
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI report');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 28px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Analyzing your SQL performance…
      </div>
    );
  }

  return (
    <div style={{ padding: '28px', maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', marginBottom: 4,
        }}>
          Personal Insights
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          A breakdown of your SQL mastery and submission habits.
        </p>
      </div>

      {/* Summary stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        <StatCard
          title="Total Solved"
          value={stats?.totalSolved || 0}
          icon={STAT_ICONS.trophy}
          iconColor="var(--accent)"
          iconBg="var(--accent-light)"
        />
        <StatCard
          title="Accuracy"
          value={`${stats?.accuracy || 0}%`}
          icon={STAT_ICONS.target}
          iconColor="var(--success)"
          iconBg="var(--success-bg)"
        />
        <StatCard
          title="Avg Latency"
          value={`${telemetry?.averageExecutionTimeMs || 0}ms`}
          icon={STAT_ICONS.zap}
          iconColor="var(--warning)"
          iconBg="var(--warning-bg)"
        />
        <StatCard
          title="Total Runs"
          value={stats?.totalSubmissions || 0}
          icon={STAT_ICONS.repeat}
          iconColor="#7c6df0"
          iconBg="#f0effe"
        />
      </div>

      {/* Main grid — topic mastery + error breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Skill Mastery */}
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{
            fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 20,
          }}>
            Topic Mastery
          </h2>
          {skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No skill data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {skills.map(skill => (
                <div key={skill.topic}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 6, fontSize: '0.85rem',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{skill.topic}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {skill.solvedQuestions}/{skill.totalQuestions} solved
                    </span>
                  </div>
                  <div style={{
                    height: 7, background: 'var(--bg-app)',
                    borderRadius: 99, overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${skill.masteryPercentage}%`,
                      background: 'var(--accent)',
                      borderRadius: 99,
                      transition: 'width 0.8s ease-out',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Error breakdown */}
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{
            fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 20,
          }}>
            Frequent Pitfalls
          </h2>
          {errors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {errors.map(err => (
                <div
                  key={err.errorType}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)' }}>
                    {err.errorType}
                  </span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    background: 'var(--danger)', color: 'white',
                    padding: '2px 8px', borderRadius: 99,
                  }}>
                    {err.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No errors recorded yet — clean slate! ✓
            </div>
          )}
        </section>
      </div>

      {/* Activity Heatmap */}
      <section className="card" style={{ padding: 24 }}>
        <h2 style={{
          fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: 16,
        }}>
          Activity — Last 30 Days
        </h2>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dateStr = date.toISOString().split('T')[0];
            const activity = heatmap.find(h => h.date === dateStr);
            const count = activity ? activity.count : 0;

            // Muted green scale that fits the light theme
            let bg = 'var(--border)';
            if (count > 0) bg = '#bbf7d0';
            if (count > 2) bg = '#4ade80';
            if (count > 5) bg = 'var(--success)';

            return (
              <div
                key={i}
                title={`${dateStr}: ${count} activit${count === 1 ? 'y' : 'ies'}`}
                style={{
                  width: 22, height: 22,
                  background: bg,
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.04)',
                  cursor: count > 0 ? 'default' : 'default',
                  transition: 'opacity 0.15s',
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Less</span>
          {['var(--border)', '#bbf7d0', '#4ade80', 'var(--success)'].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, background: c, borderRadius: 3, border: '1px solid rgba(0,0,0,0.04)' }} />
          ))}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>More</span>
        </div>
      </section>

      {/* AI Insights Section */}
      <section className="card" style={{ padding: 24, marginTop: 24, border: '1px solid var(--accent-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8
            }}>
              ✨ AI Performance Review (Last 7 Days)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Personalized breakdown of your strengths and weaknesses by AI.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerateAiReport} 
            disabled={aiLoading}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {aiLoading ? 'Generating...' : aiReport ? 'Regenerate Report' : 'Generate Report'}
          </button>
        </div>

        {aiError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>
            Error: {aiError}
          </div>
        )}

        {aiReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 8, borderLeft: '4px solid var(--accent)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>
                "{aiReport.executive_summary}"
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>Strengths</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiReport.strengths}</p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--warning)', marginBottom: 8 }}>Areas for Improvement</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiReport.areas_for_improvement}</p>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Competence Scores</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {Object.entries(aiReport.competence_scores || {}).map(([topic, score]) => (
                  <div key={topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {topic.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontWeight: 700 }}>{score}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${score}%`, 
                        background: score > 75 ? 'var(--success)' : score > 40 ? 'var(--warning)' : 'var(--danger)',
                        borderRadius: 4
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {aiReport.common_mistakes?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>Common Mistakes to Avoid</h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {aiReport.common_mistakes.map((mistake, idx) => (
                    <li key={idx}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          !aiLoading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Click "Generate Report" to let the AI analyze your recent queries.
            </div>
          )
        )}
      </section>
    </div>
  );
}

/* ── Stat card component ── */
function StatCard({ title, value, icon, iconColor, iconBg }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: iconBg,
        color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '0.68rem', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 2,
        }}>
          {title}
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}
