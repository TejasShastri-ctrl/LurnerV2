import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';

/* ── Stat card icons ── */
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
  const [stats, setStats]         = useState(null);
  const [heatmap, setHeatmap]     = useState([]);
  const [skills, setSkills]       = useState([]);
  const [errors, setErrors]       = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading]     = useState(true);

  const [aiReport, setAiReport]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState(null);

  useEffect(() => {
    if (token) {
      Promise.all([
        api.fetchUserStats(token),
        api.fetchActivityHeatmap(token),
        api.fetchSkillMastery(token),
        api.fetchErrorDistribution(token),
        api.fetchPerformanceTelemetry(token),
      ]).then(([s, h, sk, e, t]) => {
        setStats(s); setHeatmap(h); setSkills(sk); setErrors(e); setTelemetry(t);
        setLoading(false);
      }).catch(err => { console.error('Failed to load insights:', err); setLoading(false); });

      api.fetchAiReport(token, 7).then(report => {
        if (report) setAiReport(report.reportData);
      }).catch(console.error);
    }
  }, [token]);

  const handleGenerateAiReport = async () => {
    setAiLoading(true); setAiError(null);
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
      <div className="p-10 text-[var(--color-text-muted)] text-sm">
        Analyzing your SQL performance…
      </div>
    );
  }

  return (
    <div className="p-7 max-w-[1100px]">

      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-[1.35rem] font-bold text-[var(--color-text-primary)] tracking-tight mb-1">
          Personal Insights
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          A breakdown of your SQL mastery and submission habits.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 mb-6">
        <StatCard title="Total Solved"  value={stats?.totalSolved || 0}                           icon={STAT_ICONS.trophy} iconColor="var(--color-accent)"   iconBg="var(--color-accent-light)" />
        <StatCard title="Accuracy"      value={`${stats?.accuracy || 0}%`}                        icon={STAT_ICONS.target} iconColor="var(--color-success)"  iconBg="var(--color-success-bg)"  />
        <StatCard title="Avg Latency"   value={`${telemetry?.averageExecutionTimeMs || 0}ms`}     icon={STAT_ICONS.zap}    iconColor="var(--color-warning)"  iconBg="var(--color-warning-bg)"  />
        <StatCard title="Total Runs"    value={stats?.totalSubmissions || 0}                       icon={STAT_ICONS.repeat} iconColor="#7c6df0"               iconBg="#f0effe"                  />
      </div>

      {/* Main grid — topic mastery + error breakdown */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">

        {/* Skill Mastery */}
        <section className="bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[0_1px_4px_rgba(17,24,39,0.07)] p-6">
          <h2 className="text-[0.95rem] font-bold text-[var(--color-text-primary)] mb-5">
            Topic Mastery
          </h2>
          {skills.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-[0.85rem]">No skill data yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {skills.map(skill => (
                <div key={skill.topic}>
                  <div className="flex justify-between mb-1.5 text-[0.85rem]">
                    <span className="font-semibold text-[var(--color-text-primary)]">{skill.topic}</span>
                    <span className="text-[var(--color-text-muted)] text-[0.78rem]">
                      {skill.solvedQuestions}/{skill.totalQuestions} solved
                    </span>
                  </div>
                  <div className="h-[7px] bg-[var(--color-bg-app)] rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="h-full bg-[var(--color-accent)] rounded-full transition-[width] duration-[800ms] ease-out"
                      style={{ width: `${skill.masteryPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Error breakdown */}
        <section className="bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[0_1px_4px_rgba(17,24,39,0.07)] p-6">
          <h2 className="text-[0.95rem] font-bold text-[var(--color-text-primary)] mb-5">
            Frequent Pitfalls
          </h2>
          {errors.length > 0 ? (
            <div className="flex flex-col gap-2">
              {errors.map(err => (
                <div
                  key={err.errorType}
                  className="px-3 py-[9px] bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-[var(--radius-sm)] flex justify-between items-center"
                >
                  <span className="text-[0.8rem] font-semibold text-[var(--color-danger)]">{err.errorType}</span>
                  <span className="text-[0.72rem] font-bold bg-[var(--color-danger)] text-white px-2 py-[2px] rounded-full">
                    {err.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)] text-[0.85rem]">
              No errors recorded yet — clean slate! ✓
            </div>
          )}
        </section>
      </div>

      {/* Activity Heatmap */}
      <section className="bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[0_1px_4px_rgba(17,24,39,0.07)] p-6">
        <h2 className="text-[0.95rem] font-bold text-[var(--color-text-primary)] mb-4">
          Activity — Last 30 Days
        </h2>
        <div className="flex gap-[5px] flex-wrap">
          {Array.from({ length: 30 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dateStr = date.toISOString().split('T')[0];
            const activity = heatmap.find(h => h.date === dateStr);
            const count = activity ? activity.count : 0;
            let bg = 'var(--color-border)';
            if (count > 0) bg = '#bbf7d0';
            if (count > 2) bg = '#4ade80';
            if (count > 5) bg = 'var(--color-success)';
            return (
              <div
                key={i}
                title={`${dateStr}: ${count} activit${count === 1 ? 'y' : 'ies'}`}
                className="w-[22px] h-[22px] rounded-[4px] border border-black/[0.04] transition-opacity duration-150"
                style={{ background: bg }}
              />
            );
          })}
        </div>
        <div className="flex gap-1.5 items-center mt-3">
          <span className="text-[0.7rem] text-[var(--color-text-muted)]">Less</span>
          {['var(--color-border)', '#bbf7d0', '#4ade80', 'var(--color-success)'].map((c, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-[3px] border border-black/[0.04]" style={{ background: c }} />
          ))}
          <span className="text-[0.7rem] text-[var(--color-text-muted)]">More</span>
        </div>
      </section>

      {/* AI Insights Section */}
      <section className="mt-6 bg-[var(--color-bg-content)] border border-[var(--color-accent-light)] rounded-[var(--radius-md)] shadow-[0_1px_4px_rgba(17,24,39,0.07)] p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-[1.05rem] font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
              ✨ AI Performance Review (Last 7 Days)
            </h2>
            <p className="text-[var(--color-text-muted)] text-[0.85rem] m-0">
              Personalized breakdown of your strengths and weaknesses by AI.
            </p>
          </div>
          <button
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] text-white text-[0.85rem] font-semibold rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
            onClick={handleGenerateAiReport}
            disabled={aiLoading}
          >
            {aiLoading ? 'Generating...' : aiReport ? 'Regenerate Report' : 'Generate Report'}
          </button>
        </div>

        {aiError && (
          <div className="text-[var(--color-danger)] text-[0.85rem] mb-4">Error: {aiError}</div>
        )}

        {aiReport ? (
          <div className="flex flex-col gap-5">
            <div className="p-4 bg-[var(--color-bg-app)] rounded-lg border-l-4 border-[var(--color-accent)]">
              <p className="text-[0.9rem] text-[var(--color-text-primary)] font-medium m-0">
                "{aiReport.executive_summary}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3 className="text-[0.85rem] font-bold text-[var(--color-success)] mb-2">Strengths</h3>
                <p className="text-[0.85rem] text-[var(--color-text-secondary)] leading-relaxed">{aiReport.strengths}</p>
              </div>
              <div>
                <h3 className="text-[0.85rem] font-bold text-[var(--color-warning)] mb-2">Areas for Improvement</h3>
                <p className="text-[0.85rem] text-[var(--color-text-secondary)] leading-relaxed">{aiReport.areas_for_improvement}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[0.85rem] font-bold text-[var(--color-text-primary)] mb-3">Competence Scores</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(aiReport.competence_scores || {}).map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex justify-between mb-1.5 text-[0.8rem]">
                      <span className="font-semibold text-[var(--color-text-secondary)] capitalize">
                        {topic.replace(/_/g, ' ')}
                      </span>
                      <span className="font-bold">{score}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-border)] rounded-[4px] overflow-hidden">
                      <div
                        className="h-full rounded-[4px]"
                        style={{
                          width: `${score}%`,
                          background: score > 75 ? 'var(--color-success)' : score > 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {aiReport.common_mistakes?.length > 0 && (
              <div className="mt-2">
                <h3 className="text-[0.85rem] font-bold text-[var(--color-danger)] mb-2">Common Mistakes to Avoid</h3>
                <ul className="m-0 pl-5 text-[0.85rem] text-[var(--color-text-secondary)] leading-relaxed">
                  {aiReport.common_mistakes.map((mistake, idx) => (
                    <li key={idx}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          !aiLoading && (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-[0.85rem]">
              Click "Generate Report" to let the AI analyze your recent queries.
            </div>
          )
        )}
      </section>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ title, value, icon, iconColor, iconBg }) {
  return (
    <div className="bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[0_1px_4px_rgba(17,24,39,0.07)] px-5 py-[18px] flex items-center gap-3.5">
      <div
        className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[0.68rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.07em] mb-0.5">
          {title}
        </div>
        <div className="text-[1.3rem] font-bold text-[var(--color-text-primary)] leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}
