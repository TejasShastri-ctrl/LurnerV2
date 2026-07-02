import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { fetchQueById, submitSolution, executeSql, fetchHistory } from "./api/api";
import { useAuth } from "./context/AuthContext";
import { ToastContainer, toast } from 'react-toastify';

/* ── Custom toast component (stacked, bottom-right) ── */
function Toast({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const styles = {
          success: { bg: 'bg-[var(--color-success-bg)]', border: 'border-[var(--color-success-border)]', accent: 'border-l-[var(--color-success)]',   title: 'text-[#065f46]', body: 'text-[#047857]' },
          error:   { bg: 'bg-[var(--color-danger-bg)]',  border: 'border-[var(--color-danger-border)]',  accent: 'border-l-[var(--color-danger)]',     title: 'text-[#991b1b]', body: 'text-[#b91c1c]' },
          info:    { bg: 'bg-[var(--color-info-bg)]',    border: 'border-[var(--color-info-border)]',    accent: 'border-l-[var(--color-info)]',       title: 'text-[#0c4a6e]', body: 'text-[#0369a1]' },
        };
        const s = styles[t.type] || styles.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`flex items-start gap-2.5 px-4 py-3 ${s.bg} border ${s.border} border-l-[3px] ${s.accent} rounded-[var(--radius-md)] shadow-[0_4px_12px_rgba(17,24,39,0.08)] min-w-[270px] max-w-[340px] pointer-events-auto cursor-pointer toast-in`}
          >
            <div className="flex-1">
              <div className={`font-bold text-[0.84rem] ${s.title}`}>{t.title}</div>
              {t.body && <div className={`text-[0.76rem] mt-0.5 ${s.body}`}>{t.body}</div>}
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toasts, add, dismiss } = useToast();

  const [question, setQuestion]             = useState(null);
  const [query, setQuery]                   = useState('SELECT * FROM employees');
  const [results, setResults]               = useState([]);
  const [history, setHistory]               = useState([]);
  const [errorMessage, setErrorMessage]     = useState(null);
  const [executing, setExecuting]           = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState('result');
  const [diagnostic, setDiagnostic]         = useState(null);
  const [sessionId] = useState(() => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15));
  
  const [activePreviewTable, setActivePreviewTable] = useState(null);

  useEffect(() => {
    if (question && question.allTables) {
      const keys = Object.keys(question.allTables);
      if (keys.length > 0) {
        if (question.dbTableName && keys.includes(question.dbTableName)) {
          setActivePreviewTable(question.dbTableName);
        } else {
          setActivePreviewTable(keys[0]);
        }
      }
    }
  }, [question]);

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
    setExecuting(true); setErrorMessage(null);
    const start = performance.now();
    try {
      const data = await executeSql(query, id, token, sessionId);
      setExecutionTimeMs(Math.round(performance.now() - start));
      setResults([]);
      if (data.errorMessage) {
        setErrorMessage(data.errorMessage);
        add('error', 'Query Error', data.errorMessage.substring(0, 80));
      } else {
        setResults(Array.isArray(data.results) ? data.results : []);
        setActiveTab('result');
      }
    } catch (e) {
      if (e.status === 429) {
        toast.warn("You are running the query too frequently. Please wait 2 seconds before trying");
        return;
      }
      setErrorMessage('Network error: Could not connect to the database engine.');
      add('error', 'Network Error', 'Could not connect to the database engine.');
    } finally { loadHistory(); setExecuting(false); }
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
    } catch (e) {
      if (e.status === 429) { toast.warn("You are submitting too frequently. Please wait 2 seconds before trying"); return; }
      add('error', 'Submit failed', 'Please try again.');
    }
  };

  const restoreFromHistory = (code) => {
    setQuery(code);
    add('info', 'Code Restored', 'Past attempt has been loaded into the editor.');
  };

  /* ── Loading screen ── */
  if (loading || !question) return (
    <div className="h-screen flex items-center justify-center bg-[var(--color-bg-app)]">
      <div className="text-center">
        <div className="w-8 h-8 border-[2.5px] border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mx-auto mb-3 spin-loader" />
        <p className="text-[var(--color-text-muted)] text-[0.85rem]">Initialising sandbox…</p>
      </div>
    </div>
  );

  return (
    <>
      <Toast toasts={toasts} dismiss={dismiss} />

      <div className="flex flex-col h-screen overflow-hidden">
        <ToastContainer style={{ width: '250px' }} toastStyle={{ minHeight: '120px' }} theme="dark" position="top-right" autoClose={3000} />

        {/* ── Toolbar ── */}
        <div className="h-[50px] bg-[var(--color-bg-content)] border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] flex items-center gap-[5px] text-[0.82rem] font-medium py-1 transition-colors duration-150 hover:text-[var(--color-text-primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Questions
            </button>

            <div className="w-px h-[18px] bg-[var(--color-border)]" />

            <span className="text-[0.875rem] font-semibold text-[var(--color-text-primary)]">
              {question.title}
            </span>

            <span className="text-[0.68rem] font-semibold px-[7px] py-[2px] rounded-[4px] bg-[var(--color-bg-app)] text-[var(--color-text-muted)] border border-[var(--color-border)] font-mono">
              #{id}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--color-bg-subtle)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {executing ? 'Running…' : 'Run Query'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={executing}
              className="inline-flex items-center justify-center gap-1.5 px-[18px] py-1.5 bg-[var(--color-accent)] text-white border-none rounded-[var(--radius-sm)] text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>

        {/* ── Content panes ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Problem brief */}
          <div className="w-[40%] shrink-0 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-content)]">
            <div className="p-5 overflow-y-auto flex-1">
              <h2 className="text-[0.9rem] font-bold text-[var(--color-text-primary)] mb-2.5">Description</h2>
              <div className="text-[0.875rem] leading-[1.65] text-[var(--color-text-secondary)]">
                {question.description}
              </div>

              {/* Schema preview */}
              {question.allTables && Object.keys(question.allTables).length > 0 ? (
                <div className="mt-7">
                  <h3 className="text-[0.7rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.06em] mb-2">
                    Schema Table Inspector
                  </h3>
                  {/* Tabs for all tables in the dataset */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5 border-b border-[var(--color-border)] pb-1">
                    {Object.keys(question.allTables).map(tableName => (
                      <button
                        key={tableName}
                        onClick={() => setActivePreviewTable(tableName)}
                        className={`px-2 py-1 text-xs font-semibold rounded-t cursor-pointer border-none bg-transparent ${
                          activePreviewTable === tableName
                            ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] font-bold'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        {tableName}
                      </button>
                    ))}
                  </div>
                  {activePreviewTable && question.allTables[activePreviewTable] && (
                    <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-subtle)] overflow-x-auto">
                      <DataGrid data={question.allTables[activePreviewTable]} isMini />
                    </div>
                  )}
                </div>
              ) : (
                question.schemaSample && (
                  <div className="mt-7">
                    <h3 className="text-[0.7rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.06em] mb-2.5">
                      Table Preview ·{' '}
                      <span className="text-[var(--color-accent)] normal-case">{question.dbTableName}</span>
                    </h3>
                    <div className="border border-[var(--color-border)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-subtle)] overflow-x-auto">
                      <DataGrid data={question.schemaSample} isMini />
                    </div>
                  </div>
                )
              )}

              <div className="mt-6">
                <h3 className="text-[0.7rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.06em] mb-2">
                  Difficulty
                </h3>
                <DifficultyBadge level={question.difficulty} />
              </div>
            </div>
          </div>

          {/* Right: Editor + Results */}
          <div className="flex-1 flex flex-col bg-[var(--color-bg-app)] overflow-hidden">

            {/* Editor */}
            <div className="flex-1 relative border-b border-[var(--color-border)]">
              <div className="absolute top-2.5 right-3 z-10">
                <span className="text-[0.62rem] font-bold text-[var(--color-text-muted)] bg-white/85 px-[7px] py-[3px] rounded-[4px] border border-[var(--color-border)] tracking-[0.05em] uppercase">
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
            <div className="h-[38%] flex flex-col bg-[var(--color-bg-content)]">

              {/* Tab bar */}
              <div className="h-[38px] bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] flex items-center px-3 gap-0.5 shrink-0">
                <TabButton active={activeTab === 'result'}   onClick={() => setActiveTab('result')}>Output</TabButton>
                <TabButton active={activeTab === 'expected'} onClick={() => setActiveTab('expected')}>Expected</TabButton>
                <TabButton active={activeTab === 'history'}  onClick={() => setActiveTab('history')}>
                  History {history.length > 0 && `(${history.length})`}
                </TabButton>
                <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')}>
                  Analysis {diagnostic?.mismatches?.length > 0 && `(${diagnostic.mismatches.length})`}
                </TabButton>
                <div className="flex-1" />
                {results.length > 0 && activeTab === 'result' && (
                  <span className="text-[0.7rem] text-[var(--color-text-muted)] font-medium">
                    {results.length} row{results.length !== 1 ? 's' : ''}
                  </span>
                )}
                {executionTimeMs > 0 && activeTab === 'result' && (
                  <span className="text-[0.68rem] text-[var(--color-text-muted)] font-medium ml-2.5 font-mono">
                    {executionTimeMs}ms
                  </span>
                )}
              </div>

              {/* Tab body */}
              <div className="flex-1 overflow-auto relative">
                {activeTab === 'result'   && <DataGrid data={results} error={errorMessage} />}
                {activeTab === 'expected' && <DataGrid data={question.expectedOutput} />}
                {activeTab === 'analysis' && <DiagnosticReport data={diagnostic} />}
                {activeTab === 'history'  && (
                  <div className="p-3.5">
                    {history.length === 0 ? (
                      <div className="text-center py-8 text-[var(--color-text-muted)] text-[0.84rem]">
                        No submissions yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {history.map(h => (
                          <HistoryRow key={h.id} h={h} onRestore={restoreFromHistory} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="h-[22px] bg-[var(--color-bg-subtle)] border-t border-[var(--color-border)] flex items-center px-3 text-[0.65rem] font-semibold text-[var(--color-text-muted)] tracking-[0.04em] gap-3 shrink-0">
                <span className={executing ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]'}>
                  {executing ? '● RUNNING' : '● READY'}
                </span>
                {executionTimeMs > 0 && !executing && <span>LAST: {executionTimeMs}ms</span>}
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
  const dotColor = { SUCCESS: 'bg-[var(--color-success)]', FAIL: 'bg-[var(--color-warning)]', ERROR: 'bg-[var(--color-danger)]' };
  return (
    <div className="flex items-center gap-3.5 px-3.5 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-sm)]">
      <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotColor[h.status] || 'bg-[var(--color-text-muted)]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-[3px]">
          <span className="text-[0.74rem] font-bold text-[var(--color-text-primary)]">{h.status}</span>
          <span className="text-[0.68rem] text-[var(--color-text-muted)]">{new Date(h.createdAt).toLocaleString()}</span>
        </div>
        <div className="text-[0.72rem] font-mono text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[380px]">
          {h.code}
        </div>
      </div>
      <button
        onClick={() => onRestore(h.code)}
        className="px-[11px] py-1 text-[0.7rem] font-semibold bg-[var(--color-bg-content)] border border-[var(--color-border)] rounded-[5px] cursor-pointer text-[var(--color-text-secondary)] transition-all duration-[140ms] shrink-0 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        Restore
      </button>
    </div>
  );
}

/* ── Difficulty badge ── */
function DifficultyBadge({ level }) {
  const cls = {
    EASY:   'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
    MEDIUM: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    HARD:   'bg-[var(--color-danger-bg)]  text-[var(--color-danger)]  border-[var(--color-danger-border)]',
  };
  const labels = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };
  return (
    <span className={`inline-flex items-center px-[9px] py-[2px] rounded-[4px] border text-[0.7rem] font-semibold tracking-[0.04em] ${cls[level] || cls.EASY}`}>
      {labels[level] || level}
    </span>
  );
}

/* ── Tab button ── */
function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-[5px] border-none cursor-pointer text-[0.75rem] font-semibold transition-all duration-[120ms] bg-transparent rounded-none',
        'border-b-2',
        active
          ? 'text-[var(--color-accent)] border-b-[var(--color-accent)]'
          : 'text-[var(--color-text-muted)] border-b-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* ── Data Grid ── */
function DataGrid({ data, error, isMini = false }) {
  if (error) {
    return (
      <div className="m-4 p-5 text-[var(--color-danger)] font-mono text-[0.82rem] whitespace-pre-wrap border-l-[3px] border-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-[var(--radius-sm)]">
        <div className="font-bold mb-1.5">Execution Error</div>
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-[0.82rem]">
        No results yet. Run a query to see output.
      </div>
    );
  }

  const headers  = Object.keys(data[0]);
  const fontSize = isMini ? 'text-[0.7rem]' : 'text-[0.8rem]';
  const cellPad  = isMini ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <table className={`w-full border-collapse font-mono ${fontSize}`}>
      <thead>
        <tr className="sticky top-0 z-[5] bg-[var(--color-bg-subtle)]">
          <th className={`${cellPad} text-left text-[0.68rem] font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.04em] border-b border-[var(--color-border)] border-r border-[var(--color-border)] whitespace-nowrap ${isMini ? 'w-7' : 'w-9'}`}>
            #
          </th>
          {headers.map(h => (
            <th key={h} className={`${cellPad} text-left text-[0.68rem] font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.04em] border-b border-[var(--color-border)] whitespace-nowrap`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={`border-b border-[var(--color-border)] ${i % 2 === 0 ? 'bg-[var(--color-bg-content)]' : 'bg-[var(--color-bg-subtle)]'}`}>
            <td className={`${cellPad} text-center text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border-r border-[var(--color-border)]`}>
              {i + 1}
            </td>
            {headers.map(h => (
              <td key={h} className={`${cellPad} text-[var(--color-text-primary)] whitespace-nowrap`}>
                {row[h] === null
                  ? <span className="text-[var(--color-text-muted)] italic">NULL</span>
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

/* ── Diagnostic Report ── */
function DiagnosticReport({ data }) {
  if (!data) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)] text-[0.84rem]">
        No analysis data available. Submit a solution to see structural feedback.
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="p-5 text-[var(--color-danger)] text-[0.82rem]">
        <strong>Analysis Error:</strong> {data.error}
      </div>
    );
  }

  const mismatches = data.mismatches || [];

  return (
    <div className="p-4">
      <h3 className="text-[0.75rem] font-bold text-[var(--color-text-primary)] mb-3.5 flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Structural SQL Diagnosis
      </h3>

      {mismatches.length === 0 ? (
        <div className="p-4 bg-[var(--color-success-bg)] border border-[var(--color-success-border)] rounded-lg text-[var(--color-success)] text-[0.84rem] flex gap-2.5">
          <span>✅</span>
          <div>
            <div className="font-bold">Structure matches perfectly!</div>
            <div className="text-[0.78rem] opacity-80 mt-0.5">The structural skeleton of your query matches the solution. If your output is still wrong, check your data values or join conditions.</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {mismatches.map((m, i) => {
            const sev = m.severity;
            const bg   = sev === 'HIGH' ? 'bg-[var(--color-danger-bg)]'  : sev === 'MEDIUM' ? 'bg-[var(--color-warning-bg)]'  : 'bg-[var(--color-info-bg)]';
            const bdr  = sev === 'HIGH' ? 'border-[var(--color-danger-border)]' : sev === 'MEDIUM' ? 'border-[var(--color-warning-border)]' : 'border-[var(--color-info-border)]';
            return (
              <div key={i} className={`px-3.5 py-3 ${bg} border ${bdr} rounded-lg flex gap-3`}>
                <span className="text-[1rem]">
                  {sev === 'HIGH' ? '🚨' : sev === 'MEDIUM' ? '⚠️' : '💡'}
                </span>
                <div>
                  <div className="text-[0.65rem] font-extrabold uppercase tracking-[0.04em] text-[var(--color-text-muted)] mb-0.5">
                    {m.type.replace(/_/g, ' ')} • {sev}
                  </div>
                  <div className="text-[0.84rem] text-[var(--color-text-primary)] font-medium leading-[1.4]">
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail breakdown */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        <details>
          <summary className="text-[0.68rem] font-bold text-[var(--color-text-muted)] cursor-pointer outline-none">
            View Structural Comparison (AST Skeleton)
          </summary>
          <div className="flex gap-4 mt-3">
            <div className="flex-1">
              <div className="text-[0.62rem] font-extrabold text-[var(--color-text-muted)] mb-1">YOUR QUERY</div>
              <pre className="text-[0.7rem] bg-[var(--color-bg-subtle)] p-2.5 rounded-[6px] overflow-auto">
                {JSON.stringify(data.userSkeleton, null, 2)}
              </pre>
            </div>
            <div className="flex-1">
              <div className="text-[0.62rem] font-extrabold text-[var(--color-text-muted)] mb-1">SOLUTION</div>
              <pre className="text-[0.7rem] bg-[var(--color-bg-subtle)] p-2.5 rounded-[6px] overflow-auto">
                {JSON.stringify(data.solutionSkeleton, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
