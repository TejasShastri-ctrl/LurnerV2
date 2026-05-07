import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { fetchQueById, submitSolution, executeSql } from "./api/api";
import { useAuth } from "./context/AuthContext";

/* ── Toast component ── */
function Toast({ toasts, dismiss }) {
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px',
                    background: t.type === 'success' ? '#ecfdf5' : t.type === 'error' ? '#fef2f2' : '#f0f9ff',
                    border: `1px solid ${t.type === 'success' ? '#a7f3d0' : t.type === 'error' ? '#fecaca' : '#bae6fd'}`,
                    borderLeft: `4px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#38bdf8'}`,
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
                    minWidth: 280, maxWidth: 360,
                    pointerEvents: 'all', cursor: 'pointer',
                    animation: 'toastIn 0.3s ease forwards',
                }} onClick={() => dismiss(t.id)}>
                    <span style={{ fontSize: '1.1rem' }}>
                        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontWeight: 700, fontSize: '0.85rem',
                            color: t.type === 'success' ? '#065f46' : t.type === 'error' ? '#991b1b' : '#0369a1'
                        }}>
                            {t.title}
                        </div>
                        {t.body && (
                            <div style={{
                                fontSize: '0.78rem', marginTop: 2,
                                color: t.type === 'success' ? '#047857' : t.type === 'error' ? '#b91c1c' : '#0284c7'
                            }}>
                                {t.body}
                            </div>
                        )}
                    </div>
                </div>
            ))}
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

/* ── Difficulty badge helper ── */
const diffConfig = {
    EASY: { label: 'Easy', cls: 'badge badge-easy', color: '#10b981' },
    MEDIUM: { label: 'Medium', cls: 'badge badge-medium', color: '#f59e0b' },
    HARD: { label: 'Hard', cls: 'badge badge-hard', color: '#ef4444' },
};

/* ── Main component ── */
export function SqlExecutionWindow() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, isAuthenticated } = useAuth();
    const { toasts, add, dismiss } = useToast();

    const [question, setQuestion] = useState(null);
    const [query, setQuery] = useState("select * from employees");
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        if (id && token) {
            fetchQueById(id, token).then(setQuestion).catch(console.error);
        }
    }, [id, token]);

    const handleExecute = async () => {
        if (!isAuthenticated) { add('info', 'Sign in required', 'Please sign in to run queries.'); return navigate('/login'); }
        setExecuting(true); setError(null); setResults([]);
        try {
            const data = await executeSql(query, id, token);
            if (data.errorMessage) { setError(data.errorMessage); add('error', 'Query Error', data.errorMessage.substring(0, 80)); }
            else { setResults(Array.isArray(data.results) ? data.results : []); }
        } catch { setError("Network error: Could not connect to the database engine."); add('error', 'Network Error', 'Could not connect to the database engine.'); }
        finally { setExecuting(false); }
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) { add('info', 'Sign in required', 'Please sign in to submit.'); return navigate('/login'); }
        try {
            const data = await submitSolution(query, id, token);
            console.log(data.expectedOutput);
            console.log(results);
            if (data.isCorrect) add('success', 'Correct!', "You've solved this challenge. Great work!");
            else add('error', 'Not quite', "The output doesn't match the expected result.");
        } catch { add('error', 'Submit failed', 'Please try again.'); }
    };

    if (!question) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 36, height: 36, border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 14px'
                }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Initialising sandbox…</p>
            </div>
        </div>
    );

    const diff = diffConfig[question.difficulty] || diffConfig.EASY;

    return (
        <>
            <Toast toasts={toasts} dismiss={dismiss} />

            {/* Breadcrumb */}
            <nav style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 20, fontSize: '0.78rem', color: 'var(--text-muted)'
            }}>
                <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}
                    onClick={() => navigate('/')}>Arena</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span style={{ color: 'var(--text-secondary)' }}>Challenge #{id}</span>
            </nav>

            {/* Two-column layout */}
            <div style={{
                display: 'grid', gridTemplateColumns: '320px 1fr',
                gap: 20, alignItems: 'start'
            }}>

                {/* ── LEFT: Question panel ── */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 14,
                    position: 'sticky', top: 'calc(var(--header-h) + 24px)'
                }}>

                    {/* Question card */}
                    <div className="card" style={{ padding: '20px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <span className={diff.cls}>{diff.label}</span>
                            <span style={{
                                fontSize: '0.72rem', color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)'
                            }}>#{id}</span>
                        </div>
                        <h1 style={{
                            fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)',
                            letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.3
                        }}>
                            {question.title}
                        </h1>
                        <div style={{ width: '100%', height: 1, background: 'var(--border)', marginBottom: 14 }} />
                        <div style={{
                            fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8
                        }}>
                            Mission Brief
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            {question.description}
                        </p>
                    </div>

                    {/* Tips card */}
                    <div style={{
                        background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.15)',
                        borderRadius: 'var(--radius-md)', padding: '14px 16px'
                    }}>
                        <div style={{
                            fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-dark)',
                            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6
                        }}>Tip</div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--accent-dark)', lineHeight: 1.6 }}>
                            Press <kbd style={{
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem'
                            }}>Ctrl</kbd>
                            {' + '}
                            <kbd style={{
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem'
                            }}>Enter</kbd>
                            {' '}to run your query quickly.
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Editor + Results ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Editor card */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        {/* Editor toolbar */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 16px', borderBottom: '1px solid var(--border)',
                            background: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                                <span style={{
                                    marginLeft: 8, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                                    color: 'var(--text-muted)'
                                }}>query.sql</span>
                            </div>
                            <span style={{
                                fontSize: '0.68rem', color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)'
                            }}>SQL</span>
                        </div>
                        <Editor
                            height="300px"
                            theme="vs-dark"
                            language="sql"
                            value={query}
                            onChange={setQuery}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 16, bottom: 16 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                renderLineHighlight: 'gutter',
                            }}
                        />
                    </div>

                    {/* Action bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            id="run-query-btn"
                            className="btn btn-primary"
                            onClick={handleExecute}
                            disabled={executing}
                            style={{ padding: '10px 22px', gap: 8 }}
                        >
                            {executing ? (
                                <><div className="spinner" /> Executing…</>
                            ) : (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    Run Query
                                </>
                            )}
                        </button>
                        <button
                            id="submit-solution-btn"
                            className="btn btn-ghost"
                            onClick={handleSubmit}
                            style={{ padding: '10px 22px' }}
                        >
                            Submit Solution
                        </button>
                    </div>

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="card fade-up" style={{ overflow: 'hidden' }}>
                            <div style={{
                                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Query Results
                                </span>
                                <span style={{
                                    fontSize: '0.7rem', background: 'var(--bg-app)',
                                    border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px',
                                    color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)'
                                }}>
                                    {results.length} row{results.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                            {Object.keys(results[0]).map(key => (
                                                <th key={key} style={{
                                                    padding: '10px 16px', textAlign: 'left',
                                                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                                                    letterSpacing: '0.08em', color: 'var(--text-muted)',
                                                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap'
                                                }}>
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((row, i) => (
                                            <tr key={i} style={{
                                                borderBottom: '1px solid var(--border)',
                                                background: i % 2 === 1 ? '#fafbfc' : 'white',
                                                transition: 'background 0.1s'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#fafbfc' : 'white'}
                                            >
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j} style={{
                                                        padding: '10px 16px', color: 'var(--text-primary)',
                                                        fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit'
                                                    }}>
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="fade-up" style={{
                            background: 'var(--danger-bg)',
                            border: '1px solid rgba(239,68,68,0.2)', borderLeft: '4px solid var(--danger)',
                            borderRadius: 'var(--radius-md)', padding: '16px 20px'
                        }}>
                            <div style={{
                                fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)',
                                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8
                            }}>
                                Execution Error
                            </div>
                            <pre style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                                color: '#b91c1c', whiteSpace: 'pre-wrap', lineHeight: 1.6
                            }}>
                                {error}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
