import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { fetchContestById, joinContest, submitContestSolution } from '../api/api';
import { useAuth } from '../context/AuthContext';
import useLocalDraft from '../hooks/useLocalDraft';
import useAntiCheat from '../hooks/useAntiCheat';
import { Trophy, Clock, AlertTriangle, Play, CheckCircle, ArrowLeft, Shield } from 'lucide-react';

/* ── Custom Toast / Overlay for Anti-Cheat infractions ── */
function InfractionOverlay({ count, max, type, message, onResolve }) {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-99999 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] border border-red-500/30 rounded-2xl max-w-md w-full p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-fade-in">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-red-500 mb-2">Rule Violation Detected</h2>
                <div className="text-gray-400 text-sm mb-4 capitalize font-mono bg-black/40 py-1.5 px-3 rounded-md inline-block">
                    Event: {type.replace(/_/g, ' ')}
                </div>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    {message || "An infraction has been logged. You must stay inside the fullscreen contest interface."}
                </p>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3.5 mb-6">
                    <span className="text-[0.75rem] uppercase font-bold text-gray-500 block tracking-wider">Infraction Status</span>
                    <span className="text-2xl font-extrabold text-red-500">{count} / {max} strikes</span>
                </div>
                {count >= max ? (
                    <div className="text-red-400 text-sm font-semibold">
                        You have been locked out. Disqualifying session...
                    </div>
                ) : (
                    <button
                        onClick={onResolve}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all duration-150 shadow-[0_4px_12px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 cursor-pointer"
                    >
                        Resume Contest & Enter Fullscreen
                    </button>
                )}
            </div>
        </div>
    );
}

function MiniTable({ data }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return <div className="text-gray-500 text-xs p-2">Empty Table</div>;
    }
    return (
        <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left border-collapse text-[0.7rem]">
                <thead>
                    <tr className="border-b border-gray-850 text-gray-500">
                        {Object.keys(data[0]).map(k => <th key={k} className="p-1.5 font-bold">{k}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-850/40 text-gray-400">
                            {Object.values(row).map((v, i) => <td key={i} className="p-1.5 font-mono">{v === null ? 'NULL' : String(v)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ContestWorkspace() {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    
    // Sandbox execution state
    const [query, setQuery] = useState('SELECT * FROM employees');
    const [results, setResults] = useState([]);
    const [errorMessage, setErrorMessage] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [executionTimeMs, setExecutionTimeMs] = useState(0);
    const [activeTab, setActiveTab] = useState('result'); // result, expected, submission

    // Submission states
    const [submissionStatus, setSubmissionStatus] = useState(null); // success, fail, error
    const [solvedQuestions, setSolvedQuestions] = useState(new Set()); // set of questionIds

    // Timer state
    const [timeLeftMs, setTimeLeftMs] = useState(0);

    const [activePreviewTable, setActivePreviewTable] = useState(null);

    useEffect(() => {
        if (activeQuestion && activeQuestion.allTables) {
            const keys = Object.keys(activeQuestion.allTables);
            if (keys.length > 0) {
                if (activeQuestion.dbTableName && keys.includes(activeQuestion.dbTableName)) {
                    setActivePreviewTable(activeQuestion.dbTableName);
                } else {
                    setActivePreviewTable(keys[0]);
                }
            }
        }
    }, [activeQuestionIdx, activeQuestion]);

    // Load Local Drafts Hook
    const { drafts, saveDraft, clearDrafts } = useLocalDraft(contestId, user?.id);

    // Active state tracker for anti-cheat
    const [isStarted, setIsStarted] = useState(false);
    const [activeViolation, setActiveViolation] = useState(null);

    // Fetch contest data
    const loadContest = useCallback(async () => {
        setLoading(true);
        const data = await fetchContestById(contestId, token);
        if (data) {
            setContest(data);
            
            // Check if user is a participant
            const joined = data.participants?.some(p => p.userId === user?.id);
            setIsStarted(joined);

            // Load initial solved question IDs if user joined
            const userSubmissions = data.contestSubmissions || [];
            const solved = new Set(
                userSubmissions
                    .filter(s => s.userId === user?.id && s.status === 'SUCCESS')
                    .map(s => s.contestQuestionId)
            );
            setSolvedQuestions(solved);
        }
        setLoading(false);
    }, [contestId, token, user]);

    useEffect(() => {
        if (contestId && token) {
            loadContest();
        }
    }, [contestId, token, loadContest]);

    const activeQuestion = contest?.questions?.[activeQuestionIdx] || null;

    // Load draft when question changes
    useEffect(() => {
        if (activeQuestion) {
            const savedDraft = drafts[activeQuestion.id];
            if (savedDraft) {
                setQuery(savedDraft);
            } else {
                setQuery(`SELECT * FROM ${activeQuestion.dbTableName || 'table'} LIMIT 10;`);
            }
            setResults([]);
            setErrorMessage(null);
            setSubmissionStatus(null);
            setActiveTab('result');
        }
    }, [activeQuestionIdx, activeQuestion, drafts]);

    // Handle code changes in Monaco Editor
    const handleCodeChange = (val) => {
        setQuery(val);
        if (activeQuestion) {
            saveDraft(activeQuestion.id, val);
        }
    };

    // Countdown Timer logic
    useEffect(() => {
        if (!contest || !isStarted) return;

        const interval = setInterval(() => {
            const remaining = +new Date(contest.endTime) - +new Date();
            if (remaining <= 0) {
                setTimeLeftMs(0);
                clearInterval(interval);
                handleTimeExpired();
            } else {
                setTimeLeftMs(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [contest, isStarted]);

    const handleTimeExpired = async () => {
        // Submit last draft if available
        if (activeQuestion && query) {
            try {
                await submitContestSolution(contestId, activeQuestion.id, query, token);
            } catch (e) {
                console.error("Auto-submission failed:", e);
            }
        }
        clearDrafts();
        alert("Time is up! Your queries have been auto-submitted.");
        navigate('/contests');
    };

    // Anti-Cheat Callbacks
    const handleViolation = useCallback(({ type, message, count }) => {
        setActiveViolation({ type, message, count });
    }, []);

    const handleDisqualification = useCallback(async () => {
        // Auto-submit current code
        if (activeQuestion && query) {
            try {
                await submitContestSolution(contestId, activeQuestion.id, query, token);
            } catch {}
        }
        clearDrafts();
        alert("You have been disqualified due to multiple integrity violations!");
        navigate('/contests');
    }, [contestId, activeQuestion, query, token, clearDrafts, navigate]);

    // Anti-Cheat Hook initialization
    const { infractions, isFullscreen, enterFullscreen } = useAntiCheat({
        isActive: isStarted && timeLeftMs > 0 && !activeViolation,
        maxInfractions: 3,
        onViolation: handleViolation,
        onLimitExceeded: handleDisqualification
    });

    const handleResolveViolation = () => {
        setActiveViolation(null);
        enterFullscreen();
    };

    // Start contest join handler
    const handleStartContest = async () => {
        try {
            await joinContest(contestId, token);
            setIsStarted(true);
            await loadContest();
            setTimeout(() => {
                enterFullscreen();
            }, 500);
        } catch (e) {
            alert(e.message || "Failed to join contest.");
        }
    };

    // Run query sandbox handler
    const handleRunQuery = async () => {
        if (!activeQuestion) return;
        setExecuting(true);
        setErrorMessage(null);
        setResults([]);
        
        // Target backend execution logic
        try {
            const res = await fetch(`http://localhost:3000/api/contests/${contestId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sql: query, contestQuestionId: activeQuestion.id })
            });
            const data = await res.json();
            setExecuting(false);
            if (!res.ok || data.error || data.errorMessage) {
                setErrorMessage(data.error || data.errorMessage);
            } else {
                setResults(Array.isArray(data.results) ? data.results : []);
                setExecutionTimeMs(data.executionTimeMs || 10);
                setActiveTab('result');
            }
        } catch (e) {
            setExecuting(false);
            setErrorMessage("Failed to execute SQL: Server or Network Error");
        }
    };

    // Submit solution handler
    const handleSubmitSolution = async () => {
        if (!activeQuestion) return;
        setExecuting(true);
        setErrorMessage(null);
        setSubmissionStatus(null);

        try {
            const data = await submitContestSolution(contestId, activeQuestion.id, query, token);
            setExecuting(false);
            if (data.isCorrect) {
                setSubmissionStatus('SUCCESS');
                setSolvedQuestions(prev => new Set([...prev, activeQuestion.id]));
                // Update specific status and score in contest view
                loadContest();
            } else {
                setSubmissionStatus('FAIL');
            }
            setResults(Array.isArray(data.results) ? data.results : []);
            setActiveTab('submission');
        } catch (e) {
            setExecuting(false);
            setSubmissionStatus('ERROR');
            setErrorMessage(e.message || "Submission failed.");
            setActiveTab('submission');
        }
    };

    // Format remaining time to MM:SS
    const formatTime = (ms) => {
        const totalSecs = Math.floor(ms / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0d0f12] text-white">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Initialising Arena Workspace...</p>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0d0f12] text-white p-6">
                <div className="text-center max-w-md">
                    <h2 className="text-xl font-bold text-red-500 mb-2">Contest Not Found</h2>
                    <p className="text-gray-400 mb-6">The contest session does not exist or has been deleted.</p>
                    <button onClick={() => navigate('/contests')} className="px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
                        Back to Arena
                    </button>
                </div>
            </div>
        );
    }

    // Start Screen overlay if not joined
    if (!isStarted) {
        const start = new Date(contest.startTime);
        const end = new Date(contest.endTime);
        const durationMin = Math.round((end - start) / 60000);
        const hasEnded = new Date() > end;
        const hasNotStarted = new Date() < start;

        return (
            <div className="min-h-screen bg-[#0d0f12] text-white flex flex-col items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-[#14181f]/80 border border-gray-800 rounded-2xl p-10 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-2 text-blue-500 mb-4 font-mono font-bold text-sm tracking-widest uppercase">
                        <Trophy size={18} /> Lurner Arena Match
                    </div>
                    <h1 className="text-3xl font-extrabold mb-3 tracking-tight">{contest.title}</h1>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        {contest.description || "Complete SQL tasks within the timeframe and optimize your query execution structure to achieve maximum scores."}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-4 text-center">
                            <span className="text-xs text-gray-500 block font-semibold mb-1 uppercase tracking-wide">Duration</span>
                            <span className="text-lg font-bold text-gray-200">{durationMin} mins</span>
                        </div>
                        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-4 text-center">
                            <span className="text-xs text-gray-500 block font-semibold mb-1 uppercase tracking-wide">Questions</span>
                            <span className="text-lg font-bold text-gray-200">{contest.questions?.length || 0} Tasks</span>
                        </div>
                        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-4 text-center">
                            <span className="text-xs text-gray-500 block font-semibold mb-1 uppercase tracking-wide">Participants</span>
                            <span className="text-lg font-bold text-gray-200">{contest.participants?.length || 0} Joined</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-800/60 pt-8 flex items-center justify-between">
                        <button
                            onClick={() => navigate('/contests')}
                            className="px-6 py-3 bg-transparent text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition"
                        >
                            <ArrowLeft size={16} /> Leave Arena
                        </button>
                        {hasEnded ? (
                            <span className="px-6 py-3 bg-red-950/20 text-red-400 border border-red-950 font-bold rounded-lg text-sm">
                                Contest has ended
                            </span>
                        ) : hasNotStarted ? (
                            <span className="px-6 py-3 bg-yellow-950/20 text-yellow-500 border border-yellow-950 font-bold rounded-lg text-sm">
                                Not started yet
                            </span>
                        ) : (
                            <button
                                onClick={handleStartContest}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm tracking-wide transition shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 cursor-pointer"
                            >
                                Start Contest Session
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0d0f12] text-gray-200 overflow-hidden font-sans">
            
            {/* Infraction Alert Popups */}
            {activeViolation && (
                <InfractionOverlay
                    count={activeViolation.count}
                    max={3}
                    type={activeViolation.type}
                    message={activeViolation.message}
                    onResolve={handleResolveViolation}
                />
            )}

            {/* ── TOP HEADER BAR ── */}
            <header className="h-14 border-b border-gray-800/70 bg-[#11141b] flex items-center justify-between px-6 shrink-0 z-40">
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (window.confirm("Are you sure you want to pause/leave the contest? Your drafts will remain, but the clock will keep ticking!")) {
                                navigate('/contests');
                            }
                        }}
                        className="text-gray-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold py-1 bg-transparent border-none cursor-pointer"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="h-4 w-px bg-gray-800" />
                    <span className="text-sm font-bold text-gray-100 flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-500" /> {contest.title}
                    </span>
                </div>

                {/* Clock / Timer & Security indicator */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 px-3 py-1 bg-gray-800/35 border border-gray-800 rounded-md">
                        <Shield size={14} className={isFullscreen ? "text-green-500" : "text-red-500"} />
                        <span>Strikes: {infractions} / 3</span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-950/20 border border-red-800/30 text-red-400 font-mono font-bold text-sm tracking-wide shadow-md">
                        <Clock size={16} />
                        {formatTime(timeLeftMs)}
                    </div>
                </div>
            </header>

            {/* ── MAIN WORKSPACE CONTAINER ── */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 1. LEFT SIDEBAR: QUESTION LIST & SELECTED QUESTION DETAIL */}
                <div className="w-[38%] border-r border-gray-850 bg-[#11141b]/95 flex flex-col shrink-0 overflow-hidden">
                    
                    {/* Question Switcher Tabs */}
                    <div className="flex border-b border-gray-800 bg-[#11141b]/50 px-2 shrink-0">
                        {contest.questions?.map((q, idx) => {
                            const isSolved = solvedQuestions.has(q.id);
                            const isActive = idx === activeQuestionIdx;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setActiveQuestionIdx(idx)}
                                    className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer bg-transparent ${
                                        isActive 
                                            ? 'text-blue-500 border-blue-500' 
                                            : 'text-gray-400 border-transparent hover:text-gray-200'
                                    }`}
                                >
                                    Question {idx + 1}
                                    {isSolved && <CheckCircle size={13} className="text-green-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Question Content View */}
                    {activeQuestion ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <div className="text-[0.62rem] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Selected Task</div>
                                <h2 className="text-lg font-bold text-gray-150">{activeQuestion.title}</h2>
                                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[0.68rem] font-bold tracking-wide uppercase border ${
                                    activeQuestion.difficulty === 'HARD' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    activeQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-green-500/10 text-green-400 border-green-500/20'
                                }`}>
                                    {activeQuestion.difficulty}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Problem Description</h3>
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{activeQuestion.description}</p>
                            </div>

                            {/* Database table preview / Dataset Schema Inspector */}
                            {activeQuestion.allTables && Object.keys(activeQuestion.allTables).length > 0 ? (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                        Database Schema Inspector
                                    </h3>
                                    <div className="flex flex-wrap gap-1 mb-2 border-b border-gray-800 pb-1">
                                        {Object.keys(activeQuestion.allTables).map(tableName => (
                                            <button
                                                key={tableName}
                                                onClick={() => setActivePreviewTable(tableName)}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-t cursor-pointer border-none bg-transparent ${
                                                    activePreviewTable === tableName
                                                        ? 'text-blue-500 border-b-2 border-blue-500 font-bold'
                                                        : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                            >
                                                {tableName}
                                            </button>
                                        ))}
                                    </div>
                                    {activePreviewTable && activeQuestion.allTables[activePreviewTable] && (
                                        <div className="bg-[#14181f] border border-gray-800/80 rounded-lg p-3 overflow-x-auto">
                                            <MiniTable data={activeQuestion.allTables[activePreviewTable]} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                activeQuestion.dbTableName && (
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 mb-2.5 uppercase tracking-wide">
                                            Active Table Preview · <span className="text-blue-400 font-mono lowercase">{activeQuestion.dbTableName}</span>
                                        </h3>
                                        <div className="bg-[#14181f] border border-gray-800/80 rounded-lg p-3 text-[0.72rem] font-mono text-gray-400">
                                            Use SQL queries to search and return correct outputs based on the schema mapping.
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                            Select a question to get started.
                        </div>
                    )}
                </div>

                {/* 2. RIGHT SIDEBAR: CODE EDITOR + WORKSPACE OUTPUTS */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#14181f]/40">
                    
                    {/* Monaco Editor Pane */}
                    <div className="flex-1 relative border-b border-gray-850">
                        <div className="absolute top-3 right-4 z-10">
                            <span className="text-[0.62rem] font-extrabold text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded tracking-wide uppercase">
                                SQL
                            </span>
                        </div>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme="vs-dark"
                            value={query}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "var(--font-mono)",
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                padding: { top: 14 },
                                lineNumbersMinChars: 3,
                                background: '#14181f'
                            }}
                        />
                    </div>

                    {/* Output panel tabs */}
                    <div className="h-[40%] flex flex-col bg-[#11141b] overflow-hidden">
                        
                        {/* Tab header buttons */}
                        <div className="h-10 bg-[#0d0f12] border-b border-gray-850 flex items-center justify-between px-4 shrink-0">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setActiveTab('result')}
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer bg-transparent border-none ${
                                        activeTab === 'result' ? 'text-blue-500 bg-blue-500/5' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    Console Output
                                </button>
                                <button
                                    onClick={() => setActiveTab('expected')}
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer bg-transparent border-none ${
                                        activeTab === 'expected' ? 'text-blue-500 bg-blue-500/5' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    Expected Results
                                </button>
                                <button
                                    onClick={() => setActiveTab('submission')}
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer bg-transparent border-none ${
                                        activeTab === 'submission' ? 'text-blue-500 bg-blue-500/5' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    Submission Result
                                </button>
                            </div>

                            {/* Workspace Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRunQuery}
                                    disabled={executing}
                                    className="px-3.5 py-1 bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 rounded font-bold text-xs transition cursor-pointer disabled:opacity-40"
                                >
                                    {executing && activeTab === 'result' ? "Running..." : "Run Query"}
                                </button>
                                <button
                                    onClick={handleSubmitSolution}
                                    disabled={executing}
                                    className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs border-none transition cursor-pointer disabled:opacity-40 shadow-md"
                                >
                                    {executing && activeTab === 'submission' ? "Submitting..." : "Submit Answer"}
                                </button>
                            </div>
                        </div>

                        {/* Tab body rendering */}
                        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                            
                            {activeTab === 'result' && (
                                errorMessage ? (
                                    <div className="text-red-500 bg-red-950/15 border border-red-950 rounded-lg p-4">
                                        <div className="font-bold mb-1">Execution Error</div>
                                        {errorMessage}
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-800 text-gray-500">
                                                    {Object.keys(results[0]).map(k => <th key={k} className="p-2">{k}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((row, idx) => (
                                                    <tr key={idx} className="border-b border-gray-800/40 text-gray-300">
                                                        {Object.values(row).map((v, i) => <td key={i} className="p-2">{v === null ? 'NULL' : String(v)}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="text-[0.65rem] text-gray-500 mt-2">Executed in {executionTimeMs}ms</div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 h-full flex items-center justify-center">
                                        No run output yet. Click "Run Query" to see console results.
                                    </div>
                                )
                            )}

                            {activeTab === 'expected' && (
                                activeQuestion?.expectedOutput ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-800 text-gray-500">
                                                    {Object.keys(activeQuestion.expectedOutput[0] || {}).map(k => <th key={k} className="p-2">{k}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(activeQuestion.expectedOutput || []).map((row, idx) => (
                                                    <tr key={idx} className="border-b border-gray-800/40 text-gray-300">
                                                        {Object.values(row).map((v, i) => <td key={i} className="p-2">{v === null ? 'NULL' : String(v)}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 h-full flex items-center justify-center">
                                        No expected output sample exists.
                                    </div>
                                )
                            )}

                            {activeTab === 'submission' && (
                                submissionStatus === 'SUCCESS' ? (
                                    <div className="text-green-500 bg-green-950/15 border border-green-950 rounded-lg p-5 flex items-start gap-3">
                                        <CheckCircle size={20} className="shrink-0" />
                                        <div>
                                            <div className="font-bold text-sm">Correct Answer!</div>
                                            <p className="text-[0.75rem] text-gray-400 mt-1">Your query outputs match the expected contest validation matrix. Points added to leaderboard!</p>
                                        </div>
                                    </div>
                                ) : submissionStatus === 'FAIL' ? (
                                    <div className="text-red-500 bg-red-950/15 border border-red-950 rounded-lg p-5 flex items-start gap-3">
                                        <AlertTriangle size={20} className="shrink-0" />
                                        <div>
                                            <div className="font-bold text-sm">Wrong Answer!</div>
                                            <p className="text-[0.75rem] text-gray-400 mt-1">Your query outputs do not match the expected validation matrix. Please review columns, ordering, or aggregates.</p>
                                        </div>
                                    </div>
                                ) : submissionStatus === 'ERROR' ? (
                                    <div className="text-red-500 bg-red-950/15 border border-red-950 rounded-lg p-4">
                                        <div className="font-bold mb-1">Submission Error</div>
                                        {errorMessage}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 h-full flex items-center justify-center">
                                        Submit your query to see correctness results.
                                    </div>
                                )
                            )}
                        </div>

                        {/* Status bar */}
                        <div className="h-6 bg-[#0d0f12] border-t border-gray-850 flex items-center px-4 text-[0.65rem] font-bold text-gray-500 tracking-wider gap-3">
                            <span className={executing ? 'text-blue-500' : 'text-green-500'}>
                                {executing ? '● EXECUTING' : '● READY'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
