import { useParams, useNavigate, replace } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { fetchQueById, submitSolution, executeSql, fetchHistory } from "./api/api";
import { useAuth } from "./context/AuthContext";

/* ── Toast component ── */
function Toast({ toasts, dismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const colors = {
          success: { bg: 'var(--success-bg)', border: 'var(--success-border)', accent: 'var(--success)', text: '#065f46', sub: '#047857' },
          error:   { bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  accent: 'var(--danger)',  text: '#991b1b', sub: '#b91c1c' },
          info:    { bg: 'var(--info-bg)',     border: 'var(--info-border)',    accent: 'var(--info)',    text: '#0c4a6e', sub: '#0369a1' },
        };
        const c = colors[t.type] || colors.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.accent}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              minWidth: 270, maxWidth: 340,
              pointerEvents: 'all', cursor: 'pointer',
              animation: 'toastIn 0.28s ease forwards',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: c.text }}>
                {t.title}
              </div>
              {t.body && (
                <div style={{ fontSize: '0.76rem', marginTop: 2, color: c.sub }}>
                  {t.body}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((type, title, body) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, title, body }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, add, dismiss };
}

/* ── Main component ── */
export function SqlExecutionWindow() {
  const { id }                   = useParams();
  const navigate                 = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toasts, add, dismiss } = useToast();

  const [question, setQuestion]        = useState(null);
  const [query, setQuery]              = useState('SELECT * FROM employees');
  const [results, setResults]          = useState([]);
  const [history, setHistory]          = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [executing, setExecuting]      = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [loading, setLoading]          = useState(true);
  const [activeTab, setActiveTab]      = useState('result');
  const [diagnostic, setDiagnostic]    = useState(null);
  const [sessionId]                    = useState(() => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15));

  const loadHistory = useCallback(async () => {
    if (id && token) {
      const data = await fetchHistory(id, token);
      setHistory(Array.isArray(data) ? data : []);
    }
  }, [id, token]);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      fetchQueById(id, token)
        .then(data => { setQuestion(data); setLoading(false); loadHistory(); })
        .catch(() => setLoading(false));
    }
  }, [id, token, loadHistory]);

  const handleExecute = async () => {
    if (!isAuthenticated) { add('info', 'Sign in required', 'Please sign in to run queries.'); return navigate('/login', { replace: true }); }
    setExecuting(true); setErrorMessage(null); setResults([]);
    const start = performance.now();
    try {
      const data = await executeSql(query, id, token, sessionId);
      setExecutionTimeMs(Math.round(performance.now() - start));
      if (data.errorMessage) {
        setErrorMessage(data.errorMessage);
        add('error', 'Query Error', data.errorMessage.substring(0, 80));
      } else {
        setResults(Array.isArray(data.results) ? data.results : []);
        console.log('returned result : ', data.results);
        console.log('expected result : ', question.expectedOutput);
        setActiveTab('result');
      }
      loadHistory();
    } catch {
      setErrorMessage('Network error: Could not connect to the database engine.');
      add('error', 'Network Error', 'Could not connect to the database engine.');
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) { add('info', 'Sign in required', 'Please sign in to submit.'); return navigate('/login'); }
    try {
      const data = await submitSolution(query, id, token, sessionId);
      setDiagnostic(data.diagnostic);
      
      if (data.isCorrect) {
        add('success', 'Correct!', "You've solved this challenge.");
      } else {
        const hint = data.diagnostic?.mismatches?.[0]?.message || "The output doesn't match the expected result.";
        add('error', 'Not quite', hint);
        if (data.diagnostic?.mismatches?.length > 0) setActiveTab('analysis');
      }
      loadHistory();
    } catch { add('error', 'Submit failed', 'Please try again.'); }
  };

  const restoreFromHistory = (code) => {
    setQuery(code);
    add('info', 'Code Restored', 'Past attempt has been loaded into the editor.');
  };

  /* ── Loading screen ── */
  if (loading || !question) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '2.5px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.75s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Initialising sandbox…</p>
      </div>
    </div>
  );

  return (
    <>
      <Toast toasts={toasts} dismiss={dismiss} />

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* ── Toolbar ── */}
        <div style={{
          height: 50, background: 'var(--bg-content)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                gap: 5, fontSize: '0.82rem', fontWeight: 500, padding: '4px 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Questions
            </button>

            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {question.title}
            </span>

            <span style={{
              fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              background: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)',
            }}>
              #{id}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExecute}
              disabled={executing}
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              {executing ? 'Running…' : 'Run Query'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={executing}
              className="btn btn-primary"
              style={{ padding: '6px 18px', fontSize: '0.82rem' }}
            >
              Submit
            </button>
          </div>
        </div>

        {/* ── Content panes ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: Problem brief */}
          <div style={{
            width: "40%", flexShrink: 0,  
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-content)',
          }}>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <h2 style={{
                fontSize: '0.9rem', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: 10,
              }}>
                Description
              </h2>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                {question.description}
              </div>

              {/* Schema preview */}
              {question.schemaSample && (
                <div style={{ marginTop: 28 }}>
                  <h3 style={{
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                  }}>
                    Table Preview ·{' '}
                    <span style={{ color: 'var(--accent)', textTransform: 'none' }}>
                      {question.dbTableName}
                    </span>
                  </h3>
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden', background: 'var(--bg-subtle)', overflowX: 'auto',
                  }}>
                    <DataGrid data={question.schemaSample} isMini />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <h3 style={{
                  fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
                }}>
                  Difficulty
                </h3>
                <DifficultyBadge level={question.difficulty} />
              </div>
            </div>
          </div>

          {/* Right: Editor + Results */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', overflow: 'hidden' }}>

            {/* Editor */}
            <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 10 }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  color: 'var(--text-muted)', background: 'rgba(255,255,255,0.85)',
                  padding: '3px 7px', borderRadius: 4, border: '1px solid var(--border)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  SQL
                </span>
              </div>
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-light"
                value={query}
                onChange={setQuery}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 14 },
                  lineNumbersMinChars: 3,
                }}
              />
            </div>

            {/* Results panel */}
            <div style={{ height: '38%', display: 'flex', flexDirection: 'column', background: 'var(--bg-content)' }}>

              {/* Tab bar */}
              <div style={{
                height: 38, background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', padding: '0 12px', gap: 2,
                flexShrink: 0,
              }}>
                <TabButton active={activeTab === 'result'}   onClick={() => setActiveTab('result')}>Output</TabButton>
                <TabButton active={activeTab === 'expected'} onClick={() => setActiveTab('expected')}>Expected</TabButton>
                 <TabButton active={activeTab === 'history'}  onClick={() => setActiveTab('history')}>
                  History {history.length > 0 && `(${history.length})`}
                </TabButton>
                <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')}>
                  Analysis {diagnostic?.mismatches?.length > 0 && `(${diagnostic.mismatches.length})`}
                </TabButton>
                <div style={{ flex: 1 }} />
                {results.length > 0 && activeTab === 'result' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {results.length} row{results.length !== 1 ? 's' : ''}
                  </span>
                )}
                {executionTimeMs > 0 && activeTab === 'result' && (
                  <span style={{
                    fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500,
                    marginLeft: 10, fontFamily: 'var(--font-mono)',
                  }}>
                    {executionTimeMs}ms
                  </span>
                )}
              </div>

              {/* Tab body */}
              <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {activeTab === 'result'   && <DataGrid data={results} error={errorMessage} />}
                {activeTab === 'expected' && <DataGrid data={question.expectedOutput} />}
                {activeTab === 'analysis' && <DiagnosticReport data={diagnostic} />}
                {activeTab === 'history'  && (
                  <div style={{ padding: '14px' }}>
                    {history.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        No submissions yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {history.map(h => (
                          <HistoryRow key={h.id} h={h} onRestore={restoreFromHistory} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div style={{
                height: 22, background: 'var(--bg-subtle)',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)',
                letterSpacing: '0.04em', gap: 12, flexShrink: 0,
              }}>
                <span style={{ color: executing ? 'var(--accent)' : 'var(--success)' }}>
                  {executing ? '● RUNNING' : '● READY'}
                </span>
                {executionTimeMs > 0 && !executing && (
                  <span>LAST: {executionTimeMs}ms</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── History row ── */
function HistoryRow({ h, onRestore }) {
  const statusColors = {
    SUCCESS: 'var(--success)',
    FAIL:    'var(--warning)',
    ERROR:   'var(--danger)',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: statusColors[h.status] || 'var(--text-muted)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {h.status}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {new Date(h.createdAt).toLocaleString()}
          </span>
        </div>
        <div style={{
          fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380,
        }}>
          {h.code}
        </div>
      </div>
      <button
        onClick={() => onRestore(h.code)}
        style={{
          padding: '4px 11px', fontSize: '0.7rem', fontWeight: 600,
          background: 'var(--bg-content)', border: '1px solid var(--border)',
          borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)',
          transition: 'all 0.14s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        Restore
      </button>
    </div>
  );
}

/* ── Difficulty badge ── */
function DifficultyBadge({ level }) {
  const map = { EASY: 'badge-easy', MEDIUM: 'badge-medium', HARD: 'badge-hard' };
  const labels = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };
  return (
    <span className={`badge ${map[level] || 'badge-easy'}`}>
      {labels[level] || level}
    </span>
  );
}

/* ── Tab button ── */
function TabButton({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', border: 'none', cursor: 'pointer',
      fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.12s',
      background: 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      borderRadius: 0,
    }}>
      {children}
    </button>
  );
}

/* ── Data Grid ── */
function DataGrid({ data, error, isMini = false }) {
  if (error) {
    return (
      <div style={{
        padding: 20, color: 'var(--danger)',
        fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap',
        borderLeft: '3px solid var(--danger)', margin: 16,
        background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Execution Error</div>
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: '0.82rem',
      }}>
        No results yet. Run a query to see output.
      </div>
    );
  }

  const headers = Object.keys(data[0]);
  const fontSize = isMini ? '0.7rem' : '0.8rem';
  const cellPad = isMini ? '4px 8px' : '6px 12px';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize }}>
      <thead>
        <tr style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-subtle)' }}>
          <th style={gridThStyle({ width: isMini ? 28 : 36, borderRight: '1px solid var(--border)', padding: cellPad })}>
            #
          </th>
          {headers.map(h => (
            <th key={h} style={gridThStyle({ padding: cellPad })}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-content)' : 'var(--bg-subtle)' }}>
            <td style={{
              padding: cellPad, textAlign: 'center',
              color: 'var(--text-muted)', background: 'var(--bg-subtle)',
              borderRight: '1px solid var(--border)',
            }}>
              {i + 1}
            </td>
            {headers.map(h => (
              <td key={h} style={{ padding: cellPad, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {row[h] === null
                  ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>
                  : String(row[h])
                }
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function gridThStyle(extra = {}) {
  return {
    padding: '7px 12px',
    textAlign: 'left',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    ...extra,
  };
}

/* ── Diagnostic Report ── */
function DiagnosticReport({ data }) {
  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
        No analysis data available. Submit a solution to see structural feedback.
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ padding: 20, color: 'var(--danger)', fontSize: '0.82rem' }}>
        <strong>Analysis Error:</strong> {data.error}
      </div>
    );
  }

  const mismatches = data.mismatches || [];

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        Structural SQL Diagnosis
      </h3>

      {mismatches.length === 0 ? (
        <div style={{ 
          padding: '16px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', 
          borderRadius: 8, color: 'var(--success)', fontSize: '0.84rem', display: 'flex', gap: 10
        }}>
          <span>✅</span>
          <div>
            <div style={{ fontWeight: 700 }}>Structure matches perfectly!</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 2 }}>The structural skeleton of your query matches the solution. If your output is still wrong, check your data values or join conditions.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mismatches.map((m, i) => (
            <div key={i} style={{
              padding: '12px 14px',
              background: m.severity === 'HIGH' ? 'var(--danger-bg)' : m.severity === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--info-bg)',
              border: `1px solid ${m.severity === 'HIGH' ? 'var(--danger-border)' : m.severity === 'MEDIUM' ? 'var(--warning-border)' : 'var(--info-border)'}`,
              borderRadius: 8,
              display: 'flex', gap: 12
            }}>
              <span style={{ fontSize: '1rem' }}>
                {m.severity === 'HIGH' ? '🚨' : m.severity === 'MEDIUM' ? '⚠️' : '💡'}
              </span>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 2 }}>
                  {m.type.replace(/_/g, ' ')} • {m.severity}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                  {m.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail breakdown (Debug/Advanced) */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <details>
          <summary style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
            View Structural Comparison (AST Skeleton)
          </summary>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>YOUR QUERY</div>
              <pre style={{ fontSize: '0.7rem', background: 'var(--bg-subtle)', padding: 10, borderRadius: 6, overflow: 'auto' }}>
                {JSON.stringify(data.userSkeleton, null, 2)}
              </pre>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>SOLUTION</div>
              <pre style={{ fontSize: '0.7rem', background: 'var(--bg-subtle)', padding: 10, borderRadius: 6, overflow: 'auto' }}>
                {JSON.stringify(data.solutionSkeleton, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
