import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllQuestions } from '../api/api.js';
import { useAuth } from '../context/AuthContext';

/* ── Difficulty metadata ── */
const DIFFICULTY_META = {
  EASY:   { label: 'Easy',   cls: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]' },
  MEDIUM: { label: 'Medium', cls: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]' },
  HARD:   { label: 'Hard',   cls: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]' },
};

function DiffBadge({ difficulty }) {
  const m = DIFFICULTY_META[difficulty] || DIFFICULTY_META.EASY;
  return (
    <span className={`inline-flex items-center px-[9px] py-[2px] rounded-[4px] text-[0.7rem] font-semibold tracking-[0.04em] ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr>
      {[44, 44, 280, 80, 60].map((w, i) => (
        <td key={i} className="px-5 py-[14px]">
          <div className="skeleton h-[13px]" style={{ width: w }} />
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
      className={[
        'px-[13px] py-[5px] rounded-[6px] border-none cursor-pointer text-[0.78rem] font-semibold transition-all duration-[140ms]',
        active
          ? 'bg-[#111d13] text-[#ffffff] shadow-[0_1px_2px_rgba(17,24,39,0.05)]'
          : 'bg-transparent text-[var(--color-text-muted)]',
      ].join(' ')}
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
        .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => { setQuestions([]); setLoading(false); });
    }
  }, [token]);

  const difficulties = ['ALL', 'EASY', 'MEDIUM', 'HARD'];
  const statuses = ['ALL', 'SOLVED', 'UNSOLVED'];
  const safeQuestions = Array.isArray(questions) ? questions : [];

  const filtered = safeQuestions.filter(q => {
    const matchDiff   = filter === 'ALL' || q.difficulty === filter;
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const progress    = q.progress && q.progress[0];
    const isSolved    = progress?.isCompleted;
    let matchStatus   = true;
    if (statusFilter === 'SOLVED')   matchStatus = isSolved;
    if (statusFilter === 'UNSOLVED') matchStatus = !isSolved;
    return matchDiff && matchSearch && matchStatus;
  });

  const counts = {
    ALL:     safeQuestions.length,
    EASY:    safeQuestions.filter(q => q.difficulty === 'EASY').length,
    MEDIUM:  safeQuestions.filter(q => q.difficulty === 'MEDIUM').length,
    HARD:    safeQuestions.filter(q => q.difficulty === 'HARD').length,
    SOLVED:  safeQuestions.filter(q => q.progress && q.progress[0]?.isCompleted).length,
    UNSOLVED:safeQuestions.filter(q => !q.progress || !q.progress[0]?.isCompleted).length,
  };

  /* Shared TH style */
  const thClass = 'px-5 py-[10px] text-[0.68rem] font-bold uppercase tracking-[0.07em] text-[var(--color-text-muted)] text-center whitespace-nowrap';

  return (
    <div className="p-7 max-w-[940px]">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[1.35rem] font-bold text-[var(--color-text-primary)] tracking-tight mb-1">
          Problem Set
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Solve SQL challenges to sharpen your skills.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">

        {/* Filter groups */}
        <div className="flex gap-2 flex-wrap">
          {/* Difficulty filter */}
          <div className="flex gap-0.5 bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-lg p-[3px]">
            {difficulties.map(d => (
              <FilterPill key={d} active={filter === d} onClick={() => setFilter(d)}>
                {d === 'ALL' ? 'All' : DIFFICULTY_META[d].label}
                <span className={`ml-[5px] opacity-55 font-medium}`}>{counts[d]}</span>
              </FilterPill>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-0.5 bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-lg p-[3px]">
            {statuses.map(s => (
              <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'Everything' : s.charAt(0) + s.slice(1).toLowerCase()}
                <span className="ml-[5px] opacity-55 font-medium">{counts[s]}</span>
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3.5 py-[7px] border border-[var(--color-border)] rounded-[7px] outline-none text-[0.82rem] text-[var(--color-text-primary)] bg-[var(--color-bg-content)] w-[210px] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-light)]"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden shadow-[0_1px_4px_rgba(17,24,39,0.07)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
              <th className={thClass} style={{ width: 44 }}>Status</th>
              <th className={thClass} style={{ width: 50 }}>#</th>
              <th className={`${thClass} text-left`}>Title</th>
              <th className={thClass} style={{ width: 110 }}>Difficul\ty</th>
              <th className={thClass} style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-[52px] text-center text-[var(--color-text-muted)] text-[0.85rem]">
                  {search ? `No problems match "${search}"` : 'No problems available yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((q, idx) => {
                const isHovered   = hoveredId === q.id;
                const progress    = q.progress && q.progress[0];
                const isSolved    = progress?.isCompleted;
                const isAttempted = progress?.attempts > 0;

                return (
                  <tr
                    key={q.id}
                    onClick={() => window.open(`/editor/${q.id}`, '_blank')}
                    onMouseEnter={() => setHoveredId(q.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={[
                      'cursor-pointer transition-colors duration-[120ms]',
                      idx < filtered.length - 1 ? 'border-b border-[var(--color-border)]' : '',
                      isHovered ? 'bg-[var(--color-accent-light)]' : 'bg-[var(--color-bg-content)]',
                    ].join(' ')}
                  >
                    {/* Status indicator */}
                    <td className="px-5 py-[14px] text-center">
                      {isSolved ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isAttempted ? (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] mx-auto" />
                      ) : null}
                    </td>

                    {/* Row index */}
                    <td className="px-5 py-[14px] text-center font-mono text-[0.75rem] text-[var(--color-text-muted)] font-medium">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* Title */}
                    <td className="px-5 py-[14px]">
                      <span className={`font-semibold transition-colors duration-[120ms] ${isHovered ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                        {q.title}
                      </span>
                      {q.description && (
                        <p className="mt-0.5 text-[0.75rem] text-[var(--color-text-muted)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[400px]">
                          {q.description}
                        </p>
                      )}
                    </td>

                    {/* Difficulty */}
                    <td className="px-5 py-[14px] text-center">
                      <DiffBadge difficulty={q.difficulty} />
                    </td>

                    {/* Action arrow */}
                    <td className="px-5 py-[14px] text-center">
                      <span
                        className={`text-[0.75rem] font-semibold inline-flex items-center gap-1 transition-all duration-[120ms] ${isHovered ? 'text-[var(--color-accent)] translate-x-0.5' : 'text-[var(--color-text-muted)]'}`}
                      >
                        Solve
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
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
          <div className="px-5 py-[9px] border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-between">
            <span className="text-[0.75rem] text-[var(--color-text-muted)]">
              Showing {filtered.length} of {safeQuestions.length} problem{safeQuestions.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-3.5">
              <span className="text-[0.72rem] font-semibold text-[var(--color-success)]">{counts.EASY} Easy</span>
              <span className="text-[0.72rem] font-semibold text-[var(--color-warning)]">{counts.MEDIUM} Medium</span>
              <span className="text-[0.72rem] font-semibold text-[var(--color-danger)]">{counts.HARD} Hard</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
