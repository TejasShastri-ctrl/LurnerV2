import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllQuestions } from '../api/api.js';
import { useAuth } from '../context/AuthContext';

/* ── Difficulty metadata ── */
const DIFFICULTY_META = {
  EASY:   { label: 'Easy',   cls: 'badge-easy' },
  MEDIUM: { label: 'Medium', cls: 'badge-medium' },
  HARD:   { label: 'Hard',   cls: 'badge-hard' },
};

/* ── Difficulty badge ── */
function DiffBadge({ difficulty }) {
  const m = DIFFICULTY_META[difficulty] || DIFFICULTY_META.EASY;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr>
      {[44, 44, 280, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: '14px 20px' }}>
          <div className="skeleton" style={{ height: 13, width: w }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Filter pill button ── */
function FilterPill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: '0.78rem', fontWeight: 600,
        background: active ? 'var(--bg-content)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        transition: 'all 0.14s',
      }}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch]       = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchAllQuestions(token)
        .then(data => {
          setQuestions(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          setQuestions([]);
          setLoading(false);
        });
    }
  }, [token]);

  const difficulties = ['ALL', 'EASY', 'MEDIUM', 'HARD'];
  const statuses = ['ALL', 'SOLVED', 'UNSOLVED'];
  const safeQuestions = Array.isArray(questions) ? questions : [];

  const filtered = safeQuestions.filter(q => {
    const matchDiff = filter === 'ALL' || q.difficulty === filter;
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const progress = q.progress && q.progress[0];
    const isSolved = progress?.isCompleted;
    let matchStatus = true;
    if (statusFilter === 'SOLVED') matchStatus = isSolved;
    if (statusFilter === 'UNSOLVED') matchStatus = !isSolved;
    return matchDiff && matchSearch && matchStatus;
  });

  const counts = {
    ALL:      safeQuestions.length,
    EASY:     safeQuestions.filter(q => q.difficulty === 'EASY').length,
    MEDIUM:   safeQuestions.filter(q => q.difficulty === 'MEDIUM').length,
    HARD:     safeQuestions.filter(q => q.difficulty === 'HARD').length,
    SOLVED:   safeQuestions.filter(q => q.progress && q.progress[0]?.isCompleted).length,
    UNSOLVED: safeQuestions.filter(q => !q.progress || !q.progress[0]?.isCompleted).length,
  };

  return (
    <div style={{ padding: '28px 28px 28px 28px', maxWidth: 940 }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', marginBottom: 4,
        }}>
          Problem Set
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Solve SQL challenges to sharpen your skills.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 16,
      }}>
        {/* Filter groups */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Difficulty filter */}
          <div style={{
            display: 'flex', gap: 2, background: 'var(--bg-app)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {difficulties.map(d => (
              <FilterPill key={d} active={filter === d} onClick={() => setFilter(d)}>
                {d === 'ALL' ? 'All' : DIFFICULTY_META[d].label}
                <span style={{ marginLeft: 5, opacity: 0.55, fontWeight: 500 }}>
                  {counts[d]}
                </span>
              </FilterPill>
            ))}
          </div>

          {/* Status filter */}
          <div style={{
            display: 'flex', gap: 2, background: 'var(--bg-app)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {statuses.map(s => (
              <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'Everything' : s.charAt(0) + s.slice(1).toLowerCase()}
                <span style={{ marginLeft: 5, opacity: 0.55, fontWeight: 500 }}>
                  {counts[s]}
                </span>
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 32, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
              border: '1px solid var(--border)', borderRadius: 7, outline: 'none',
              fontSize: '0.82rem', color: 'var(--text-primary)',
              background: 'var(--bg-content)', width: 210,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-light)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-content)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
              <th style={thStyle({ width: 44 })}>Status</th>
              <th style={thStyle({ width: 50 })}>#</th>
              <th style={thStyle({ textAlign: 'left' })}>Title</th>
              <th style={thStyle({ width: 110 })}>Difficulty</th>
              <th style={thStyle({ width: 80 })}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '52px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {search ? `No problems match "${search}"` : 'No problems available yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((q, idx) => {
                const isHovered = hoveredId === q.id;
                const progress = q.progress && q.progress[0];
                const isSolved = progress?.isCompleted;
                const isAttempted = progress?.attempts > 0;

                return (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/editor/${q.id}`)}
                    onMouseEnter={() => setHoveredId(q.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isHovered ? 'var(--accent-light)' : 'var(--bg-content)',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* Status indicator */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {isSolved ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : isAttempted ? (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', margin: '0 auto' }} />
                      ) : null}
                    </td>

                    {/* Row index */}
                    <td style={{
                      padding: '14px 20px', textAlign: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                      color: 'var(--text-muted)', fontWeight: 500,
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* Title */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontWeight: 600,
                        color: isHovered ? 'var(--accent)' : 'var(--text-primary)',
                        transition: 'color 0.12s',
                      }}>
                        {q.title}
                      </span>
                      {q.description && (
                        <p style={{
                          marginTop: 2, fontSize: '0.75rem', color: 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 400,
                        }}>
                          {q.description}
                        </p>
                      )}
                    </td>

                    {/* Difficulty */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <DiffBadge difficulty={q.difficulty} />
                    </td>

                    {/* Action arrow */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: isHovered ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        transition: 'color 0.12s, transform 0.12s',
                        transform: isHovered ? 'translateX(2px)' : 'none',
                      }}>
                        Solve
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer row */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: '9px 20px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {filtered.length} of {safeQuestions.length} problem{safeQuestions.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--success)' }}>{counts.EASY} Easy</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--warning)' }}>{counts.MEDIUM} Medium</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--danger)' }}>{counts.HARD} Hard</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function thStyle(extra = {}) {
  return {
    padding: '10px 20px',
    fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--text-muted)', textAlign: 'center',
    whiteSpace: 'nowrap',
    ...extra,
  };
}
