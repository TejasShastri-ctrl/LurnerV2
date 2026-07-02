import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    fetchAllQuestions, 
    createQuestion, 
    updateQuestion, 
    deleteQuestion, 
    generateExpectedOutput, 
    fetchAllTags, 
    fetchContests, 
    createContest,
    fetchAllDatasets,
    createDataset,
    updateDataset,
    deleteDataset
} from '../api/api';
import { Plus, Edit2, Trash2, X, Save, Database, Code, Play, RefreshCw, Calendar, Trophy, Trash, FileText } from 'lucide-react';

const Admin = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'contests', or 'datasets'
    const [questions, setQuestions] = useState([]);
    const [contests, setContests] = useState([]);
    const [tags, setTags] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Question Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', difficulty: 'EASY',
        tagId: 1, datasetId: '', dbTableName: '', solutionSql: '', expectedOutput: ''
    });

    // Dataset Form State
    const [isEditingDataset, setIsEditingDataset] = useState(false);
    const [currentDataset, setCurrentDataset] = useState(null);
    const [datasetFormData, setDatasetFormData] = useState({
        name: '', description: '', initSql: ''
    });

    // Contest Form State
    const [isEditingContest, setIsEditingContest] = useState(false);
    const [contestFormData, setContestFormData] = useState({
        title: '', description: '', startTime: '', endTime: '', questions: []
    });
    const [generatingQuestionIdx, setGeneratingQuestionIdx] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => { loadData(); }, [token]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [questionsData, tagsData, contestsData, datasetsData] = await Promise.all([
                fetchAllQuestions(token),
                fetchAllTags(token),
                fetchContests(token),
                fetchAllDatasets(token)
            ]);
            setQuestions(questionsData);
            setTags(tagsData);
            setContests(contestsData);
            setDatasets(datasetsData);
            if (tagsData?.length > 0) {
                setFormData(prev => ({ ...prev, tagId: tagsData[0].id }));
            }
            if (datasetsData?.length > 0) {
                setFormData(prev => ({ ...prev, datasetId: datasetsData[0].id }));
            }
        } catch (e) {
            console.error("Failed to load admin dashboard data:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadQuestions = async () => {
        const data = await fetchAllQuestions(token);
        setQuestions(data);
    };

    const loadContests = async () => {
        const data = await fetchContests(token);
        setContests(data);
    };

    const loadDatasets = async () => {
        const data = await fetchAllDatasets(token);
        setDatasets(data);
    };

    // Question form change handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'tagId' ? parseInt(value) || 1 : 
                    name === 'datasetId' ? parseInt(value) || '' : value 
        }));
    };

    const handleExpectedOutputChange = (e) => {
        setFormData(prev => ({ ...prev, expectedOutput: e.target.value }));
    };

    // Open/Close question editor
    const openEditor = (question = null) => {
        if (question) {
            setCurrentQuestion(question);
            setFormData({
                title: question.title || '',
                description: question.description || '',
                difficulty: question.difficulty || 'EASY',
                tagId: question.tagId || 1,
                datasetId: question.datasetId || (datasets[0]?.id || ''),
                dbTableName: question.dbTableName || '',
                solutionSql: question.solutionSql || '',
                expectedOutput: question.expectedOutput ? JSON.stringify(question.expectedOutput, null, 2) : ''
            });
        } else {
            setCurrentQuestion(null);
            setFormData({ 
                title: '', 
                description: '', 
                difficulty: 'EASY', 
                tagId: tags[0]?.id || 1, 
                datasetId: datasets[0]?.id || '', 
                dbTableName: '', 
                solutionSql: '', 
                expectedOutput: '' 
            });
        }
        setIsEditing(true);
    };

    const closeEditor = () => { setIsEditing(false); setCurrentQuestion(null); };

    // Save Question
    const handleSave = async () => {
        if (!formData.datasetId) {
            alert('Please select a Dataset. Create one first if none exist.');
            return;
        }
        try {
            let parsedExpectedOutput = formData.expectedOutput;
            if (typeof formData.expectedOutput === 'string' && formData.expectedOutput.trim() !== '') {
                try { parsedExpectedOutput = JSON.parse(formData.expectedOutput); }
                catch (err) { alert('Invalid JSON in Expected Output!'); return; }
            }
            const payload = { ...formData, expectedOutput: parsedExpectedOutput };
            if (currentQuestion) { await updateQuestion(currentQuestion.id, payload, token); }
            else { await createQuestion(payload, token); }
            closeEditor();
            loadQuestions();
        } catch (e) { console.error(e); alert('Error saving question: ' + e.message); }
    };

    // Delete Question
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try { await deleteQuestion(id, token); loadQuestions(); }
            catch (e) { console.error(e); alert('Error deleting question'); }
        }
    };

    // Generate output for standard question
    const handleGenerateOutput = async () => {
        if (!formData.datasetId || !formData.solutionSql) {
            alert('Please provide both a Dataset and a Solution SQL to generate expected output.');
            return;
        }
        setIsGenerating(true);
        try {
            const data = await generateExpectedOutput({ datasetId: formData.datasetId, solutionSql: formData.solutionSql }, token);
            setFormData(prev => ({ ...prev, expectedOutput: JSON.stringify(data.expectedOutput, null, 2) }));
            alert('Output generated successfully!');
        } catch (e) { console.error(e); alert('Error generating output: ' + e.message); }
        finally { setIsGenerating(false); }
    };

    // --- DATASET HANDLERS ---
    const openDatasetEditor = (dataset = null) => {
        if (dataset) {
            setCurrentDataset(dataset);
            setDatasetFormData({
                name: dataset.name || '',
                description: dataset.description || '',
                initSql: dataset.initSql || ''
            });
        } else {
            setCurrentDataset(null);
            setDatasetFormData({ name: '', description: '', initSql: '' });
        }
        setIsEditingDataset(true);
    };

    const closeDatasetEditor = () => {
        setIsEditingDataset(false);
        setCurrentDataset(null);
    };

    const handleDatasetInputChange = (e) => {
        const { name, value } = e.target;
        setDatasetFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveDataset = async () => {
        if (!datasetFormData.name || !datasetFormData.initSql) {
            alert('Please provide both a Dataset Name and SQL Schema.');
            return;
        }
        try {
            if (currentDataset) {
                await updateDataset(currentDataset.id, datasetFormData, token);
                alert('Dataset updated successfully!');
            } else {
                const newDataset = await createDataset(datasetFormData, token);
                alert('Dataset created successfully!');
                // Auto-select this dataset if we are currently editing a question
                if (isEditing) {
                    setFormData(prev => ({ ...prev, datasetId: newDataset.id }));
                }
            }
            closeDatasetEditor();
            loadDatasets();
        } catch (e) {
            console.error(e);
            alert('Error saving dataset: ' + e.message);
        }
    };

    const handleDeleteDataset = async (id) => {
        if (window.confirm('Are you sure you want to delete this dataset? Questions using it may break!')) {
            try {
                await deleteDataset(id, token);
                loadDatasets();
            } catch (e) {
                console.error(e);
                alert('Error deleting dataset');
            }
        }
    };

    // --- CONTEST HANDLERS ---
    const openContestEditor = () => {
        setContestFormData({
            title: '',
            description: '',
            startTime: '',
            endTime: '',
            questions: []
        });
        setIsEditingContest(true);
    };

    const closeContestEditor = () => {
        setIsEditingContest(false);
    };

    const handleContestInputChange = (e) => {
        const { name, value } = e.target;
        setContestFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContestQuestionChange = (idx, field, value) => {
        setContestFormData(prev => {
            const nextQuestions = [...prev.questions];
            nextQuestions[idx] = { 
                ...nextQuestions[idx], 
                [field]: field === 'datasetId' ? parseInt(value) || '' : value 
            };
            return { ...prev, questions: nextQuestions };
        });
    };

    const addContestQuestion = () => {
        setContestFormData(prev => ({
            ...prev,
            questions: [...prev.questions, {
                title: '',
                difficulty: 'EASY',
                description: '',
                dbTableName: '',
                datasetId: datasets[0]?.id || '',
                solutionSql: '',
                expectedOutput: ''
            }]
        }));
    };

    const removeContestQuestion = (idx) => {
        setContestFormData(prev => {
            const nextQuestions = [...prev.questions];
            nextQuestions.splice(idx, 1);
            return { ...prev, questions: nextQuestions };
        });
    };

    const handleGenerateContestQuestionOutput = async (idx) => {
        const q = contestFormData.questions[idx];
        if (!q.datasetId || !q.solutionSql) {
            alert('Please select a Dataset and enter a Solution SQL.');
            return;
        }
        setGeneratingQuestionIdx(idx);
        try {
            const data = await generateExpectedOutput({ datasetId: q.datasetId, solutionSql: q.solutionSql }, token);
            handleContestQuestionChange(idx, 'expectedOutput', JSON.stringify(data.expectedOutput, null, 2));
            alert('Expected Output generated successfully!');
        } catch (e) {
            console.error(e);
            alert('Error generating output: ' + e.message);
        } finally {
            setGeneratingQuestionIdx(null);
        }
    };

    const handleSaveContest = async () => {
        if (!contestFormData.title || !contestFormData.startTime || !contestFormData.endTime) {
            alert('Title, Start Time, and End Time are required.');
            return;
        }
        if (contestFormData.questions.length === 0) {
            alert('A contest must contain at least one question.');
            return;
        }

        try {
            const formattedQuestions = [];
            for (let i = 0; i < contestFormData.questions.length; i++) {
                const q = contestFormData.questions[i];
                if (!q.title || !q.datasetId || !q.expectedOutput) {
                    alert(`Question ${i + 1} is missing key details (Title, Dataset, or Expected Output).`);
                    return;
                }
                
                let parsedOutput;
                try {
                    parsedOutput = typeof q.expectedOutput === 'string' ? JSON.parse(q.expectedOutput) : q.expectedOutput;
                } catch (err) {
                    alert(`Invalid JSON in Question ${i + 1} Expected Output.`);
                    return;
                }

                formattedQuestions.push({
                    ...q,
                    expectedOutput: parsedOutput
                });
            }

            const payload = {
                ...contestFormData,
                questions: formattedQuestions
            };

            await createContest(payload, token);
            closeContestEditor();
            loadContests();
            alert('Contest created successfully!');
        } catch (e) {
            console.error(e);
            alert('Error saving contest: ' + e.message);
        }
    };

    /* ── Shared form field styles ── */
    const fieldBase = 'bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border';
    const labelBase = 'text-gray-400 text-sm font-medium flex items-center';

    return (
        <div className="p-8 max-w-7xl mx-auto text-gray-200">
            
            {/* Tab switch navigation */}
            <div className="flex gap-4 mb-6 border-b border-gray-700 pb-px">
                <button
                    onClick={() => setActiveTab('questions')}
                    className={`pb-3 text-sm font-bold bg-transparent border-none cursor-pointer border-b-2 px-1 transition-colors ${
                        activeTab === 'questions' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                >
                    Questions Panel
                </button>
                <button
                    onClick={() => setActiveTab('datasets')}
                    className={`pb-3 text-sm font-bold bg-transparent border-none cursor-pointer border-b-2 px-1 transition-colors ${
                        activeTab === 'datasets' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                >
                    Datasets Panel
                </button>
                <button
                    onClick={() => setActiveTab('contests')}
                    className={`pb-3 text-sm font-bold bg-transparent border-none cursor-pointer border-b-2 px-1 transition-colors ${
                        activeTab === 'contests' ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                >
                    Contests Panel
                </button>
            </div>

            {/* Header section dynamically shifts */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent m-0">
                    {activeTab === 'questions' ? 'Content Management' : 
                     activeTab === 'datasets' ? 'Database Environments' : 'Tournament Administration'}
                </h1>
                
                {activeTab === 'questions' ? (
                    <button
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                        onClick={() => openEditor()}
                    >
                        <Plus size={20} /> Add New Question
                    </button>
                ) : activeTab === 'datasets' ? (
                    <button
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white border-none rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                        onClick={() => openDatasetEditor()}
                    >
                        <Database size={20} /> Add New Dataset
                    </button>
                ) : (
                    <button
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white border-none rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                        onClick={openContestEditor}
                    >
                        <Plus size={20} /> Create Contest
                    </button>
                )}
            </div>

            {/* Main Tables */}
            {loading ? (
                <div className="text-center p-12 text-gray-400 text-xl">Loading data...</div>
            ) : activeTab === 'questions' ? (
                /* Questions list table */
                <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-600/40 overflow-hidden shadow-xl animate-fade-in">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-16">ID</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Title</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-48">Dataset Schema</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-32">Difficulty</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q.id} className="border-b border-gray-600/20 transition-colors duration-200 hover:bg-gray-700/30">
                                    <td className="p-4 text-gray-300 font-mono">#{q.id}</td>
                                    <td className="p-4 text-gray-300 font-semibold">{q.title}</td>
                                    <td className="p-4 text-gray-400 text-sm">{q.dataset?.name || 'No Dataset'}</td>
                                    <td className="p-4 text-gray-300">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold tracking-wide ${
                                            q.difficulty === 'HARD'   ? 'bg-red-500/20 text-red-400'   :
                                            q.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                                                                        'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">
                                        <div className="flex gap-4">
                                            <button className="bg-transparent border-none text-gray-400 cursor-pointer p-1 transition-colors hover:text-blue-400 flex items-center justify-center" onClick={() => openEditor(q)} title="Edit">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="bg-transparent border-none text-red-400 cursor-pointer p-1 transition-colors hover:text-red-300 flex items-center justify-center" onClick={() => handleDelete(q.id)} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'datasets' ? (
                /* Datasets list table */
                <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-600/40 overflow-hidden shadow-xl animate-fade-in">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-16">ID</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-64">Name</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Description</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datasets.map(d => (
                                <tr key={d.id} className="border-b border-gray-600/20 transition-colors duration-200 hover:bg-gray-700/30">
                                    <td className="p-4 text-gray-300 font-mono">#{d.id}</td>
                                    <td className="p-4 text-gray-300 font-bold">{d.name}</td>
                                    <td className="p-4 text-gray-400 text-sm line-clamp-1">{d.description || 'No description provided.'}</td>
                                    <td className="p-4 text-gray-300">
                                        <div className="flex gap-4">
                                            <button className="bg-transparent border-none text-gray-400 cursor-pointer p-1 transition-colors hover:text-blue-400 flex items-center justify-center" onClick={() => openDatasetEditor(d)} title="Edit">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="bg-transparent border-none text-red-400 cursor-pointer p-1 transition-colors hover:text-red-300 flex items-center justify-center" onClick={() => handleDeleteDataset(d.id)} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {datasets.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">No database environments found. Click "Add New Dataset" to create one.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Contests list table */
                <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-600/40 overflow-hidden shadow-xl animate-fade-in">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-16">ID</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Contest Title</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Start Date</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">End Date</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40 w-32">Questions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contests.map(c => (
                                <tr key={c.id} className="border-b border-gray-600/20 transition-colors duration-200 hover:bg-gray-700/30">
                                    <td className="p-4 text-gray-300 font-mono">#{c.id}</td>
                                    <td className="p-4 text-gray-350 font-bold">{c.title}</td>
                                    <td className="p-4 text-gray-400 text-sm font-mono">{new Date(c.startTime).toLocaleString()}</td>
                                    <td className="p-4 text-gray-400 text-sm font-mono">{new Date(c.endTime).toLocaleString()}</td>
                                    <td className="p-4 text-gray-300">
                                        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-full font-bold text-xs font-mono border border-indigo-500/20">
                                            {c.questions?.length || 0} Questions
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {contests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">No scheduled contests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- Standard Edit/Create Question Modal --- */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-8">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-600/40 animate-fade-in">
                        <div className="p-6 border-b border-gray-600/40 flex justify-between items-center">
                            <h2 className="m-0 text-gray-100 text-2xl font-semibold">
                                {currentQuestion ? 'Edit Question' : 'Create Question'}
                            </h2>
                            <button className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={closeEditor}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className={labelBase}>Title</label>
                                <input className={fieldBase} name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Find High Earners" />
                            </div>
                            <div className="flex gap-6">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className={labelBase}>Difficulty</label>
                                    <select className={fieldBase} name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                        <option value="EASY">EASY</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HARD">HARD</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className={labelBase}>Tag</label>
                                    <select className={fieldBase} name="tagId" value={formData.tagId} onChange={handleInputChange}>
                                        {tags.map(tag => (
                                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelBase}>Description (Markdown allowed)</label>
                                <textarea className={`${fieldBase} h-24 resize-y`} name="description" value={formData.description} onChange={handleInputChange} placeholder="Problem description..." />
                            </div>

                            {/* Normalized Dataset Dropdown */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className={labelBase}><Database size={16} className="mr-2 text-emerald-400" /> Database Schema (Dataset)</label>
                                    <button 
                                        type="button" 
                                        onClick={() => openDatasetEditor()}
                                        className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-600/30 transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        <Plus size={12} /> New Dataset
                                    </button>
                                </div>
                                <select className={fieldBase} name="datasetId" value={formData.datasetId} onChange={handleInputChange}>
                                    <option value="" disabled>-- Select a Database Environment --</option>
                                    {datasets.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className={labelBase}><FileText size={16} className="mr-2" /> Primary Table Name (for preview mapping)</label>
                                <input className={fieldBase} name="dbTableName" value={formData.dbTableName} onChange={handleInputChange} placeholder="e.g. employees" />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className={labelBase}><Play size={16} className="mr-2" /> Solution SQL</label>
                                <textarea className={`${fieldBase} h-24 font-mono resize-y`} name="solutionSql" value={formData.solutionSql} onChange={handleInputChange} placeholder="SELECT * FROM ..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className={labelBase}>Expected Output (JSON Format)</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateOutput}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md text-sm font-semibold hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                                        {isGenerating ? 'Generating...' : 'Auto-Generate Output'}
                                    </button>
                                </div>
                                <textarea className={`${fieldBase} h-36 font-mono resize-y`} name="expectedOutput" value={formData.expectedOutput} onChange={handleExpectedOutputChange} placeholder='[{ "id": 1, "name": "Alice" }]' />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-600/40 flex justify-end gap-4">
                            <button className="px-6 py-3 bg-transparent text-gray-300 border border-gray-600/50 rounded-lg font-semibold cursor-pointer transition-all hover:bg-gray-700/50 hover:text-white" onClick={closeEditor}>
                                Cancel
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" onClick={handleSave}>
                                <Save size={18} /> {currentQuestion ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Dataset Edit/Create Modal --- */}
            {isEditingDataset && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] p-8">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] border border-gray-600/40 animate-fade-in">
                        <div className="p-6 border-b border-gray-600/40 flex justify-between items-center">
                            <h2 className="m-0 text-gray-100 text-2xl font-semibold flex items-center gap-2">
                                <Database className="text-emerald-400" size={24} /> 
                                {currentDataset ? 'Edit Database Environment' : 'Create New Database Environment'}
                            </h2>
                            <button className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={closeDatasetEditor}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className={labelBase}>Dataset Name</label>
                                <input className={fieldBase} name="name" value={datasetFormData.name} onChange={handleDatasetInputChange} placeholder="e.g. Employee Directory" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelBase}>Dataset Description</label>
                                <textarea className={`${fieldBase} h-20 resize-y`} name="description" value={datasetFormData.description} onChange={handleDatasetInputChange} placeholder="Explain the database context, tables available, etc..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelBase}><Code size={16} className="mr-2 text-blue-400" /> Schema configuration SQL (Tables & Seed values)</label>
                                <textarea className={`${fieldBase} h-56 font-mono resize-y`} name="initSql" value={datasetFormData.initSql} onChange={handleDatasetInputChange} placeholder="CREATE TABLE users (id INTEGER, name TEXT);&#10;INSERT INTO users VALUES (1, 'Admin');" />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-600/40 flex justify-end gap-4">
                            <button className="px-6 py-3 bg-transparent text-gray-300 border border-gray-600/50 rounded-lg font-semibold cursor-pointer transition-all hover:bg-gray-700/50 hover:text-white" onClick={closeDatasetEditor}>
                                Cancel
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" onClick={handleSaveDataset}>
                                <Save size={18} /> {currentDataset ? 'Update Dataset' : 'Save Dataset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Contest Creation Modal with Dynamic Nested Forms --- */}
            {isEditingContest && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-8">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-600/40 animate-fade-in">
                        <div className="p-6 border-b border-gray-600/40 flex justify-between items-center">
                            <h2 className="m-0 text-gray-100 text-2xl font-semibold flex items-center gap-2">
                                <Trophy className="text-yellow-500" size={24} /> Set Up New Contest
                            </h2>
                            <button className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={closeContestEditor}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex flex-col gap-6">
                            
                            {/* Contest Meta */}
                            <div className="grid grid-cols-2 gap-6 bg-gray-900/30 p-4 border border-gray-700/40 rounded-xl">
                                <div className="flex flex-col gap-2 col-span-2">
                                    <label className={labelBase}>Contest Name / Title</label>
                                    <input className={fieldBase} name="title" value={contestFormData.title} onChange={handleContestInputChange} placeholder="e.g. Weekly SQL Sprint #1" />
                                </div>
                                <div className="flex flex-col gap-2 col-span-2">
                                    <label className={labelBase}>Contest Description</label>
                                    <textarea className={`${fieldBase} h-20 resize-y`} name="description" value={contestFormData.description} onChange={handleContestInputChange} placeholder="Rules, metrics, or description..." />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelBase}><Calendar size={14} className="mr-1.5 text-blue-400" /> Start Date & Time</label>
                                    <input type="datetime-local" className={fieldBase} name="startTime" value={contestFormData.startTime} onChange={handleContestInputChange} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelBase}><Calendar size={14} className="mr-1.5 text-blue-400" /> End Date & Time</label>
                                    <input type="datetime-local" className={fieldBase} name="endTime" value={contestFormData.endTime} onChange={handleContestInputChange} />
                                </div>
                            </div>

                            {/* Contest Questions Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-150 flex items-center gap-2">
                                        <Code size={18} className="text-indigo-400" /> Contest Challenge List ({contestFormData.questions.length})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addContestQuestion}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg text-sm font-semibold transition cursor-pointer"
                                    >
                                        <Plus size={16} /> Add Task
                                    </button>
                                </div>

                                {contestFormData.questions.length === 0 ? (
                                    <div className="border border-dashed border-gray-700/60 rounded-xl p-8 text-center text-gray-500 text-sm">
                                        No questions added yet. Click "Add Task" to configure queries.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-5">
                                        {contestFormData.questions.map((q, idx) => (
                                            <div key={idx} className="border border-gray-700 bg-gray-900/10 rounded-xl overflow-hidden p-5 relative">
                                                
                                                {/* Delete question index */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeContestQuestion(idx)}
                                                    className="absolute top-4 right-4 text-red-500 hover:text-red-400 transition cursor-pointer bg-transparent border-none p-1"
                                                    title="Remove Question"
                                                >
                                                    <Trash size={16} />
                                                </button>

                                                <h4 className="text-sm font-bold text-gray-300 mb-4 pb-2 border-b border-gray-700/40">
                                                    Challenge #{idx + 1} Details
                                                </h4>

                                                <div className="grid grid-cols-3 gap-4 mb-4">
                                                    <div className="flex flex-col gap-1.5 col-span-2">
                                                        <label className="text-xs text-gray-400">Question Title</label>
                                                        <input 
                                                            className={fieldBase}
                                                            value={q.title} 
                                                            onChange={(e) => handleContestQuestionChange(idx, 'title', e.target.value)} 
                                                            placeholder="e.g. Find Active Subscriptions" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs text-gray-400">Difficulty</label>
                                                        <select 
                                                            className={fieldBase}
                                                            value={q.difficulty}
                                                            onChange={(e) => handleContestQuestionChange(idx, 'difficulty', e.target.value)}
                                                        >
                                                            <option value="EASY">EASY</option>
                                                            <option value="MEDIUM">MEDIUM</option>
                                                            <option value="HARD">HARD</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1.5 mb-4">
                                                    <label className="text-xs text-gray-400">Problem Description</label>
                                                    <textarea 
                                                        className={`${fieldBase} h-16 resize-y`}
                                                        value={q.description} 
                                                        onChange={(e) => handleContestQuestionChange(idx, 'description', e.target.value)} 
                                                        placeholder="Challenge description details..." 
                                                    />
                                                </div>

                                                {/* Dataset Picker for Contest Questions */}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs text-gray-400">Database Environment (Dataset)</label>
                                                        <select 
                                                            className={fieldBase}
                                                            value={q.datasetId}
                                                            onChange={(e) => handleContestQuestionChange(idx, 'datasetId', e.target.value)}
                                                        >
                                                            <option value="" disabled>-- Select Dataset --</option>
                                                            {datasets.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs text-gray-400">Primary Table Name (for preview mapping)</label>
                                                        <input 
                                                            className={fieldBase}
                                                            value={q.dbTableName} 
                                                            onChange={(e) => handleContestQuestionChange(idx, 'dbTableName', e.target.value)} 
                                                            placeholder="e.g. orders" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="flex flex-col gap-1.5 col-span-2">
                                                        <label className="text-xs text-gray-400">Solution SQL (perfect reference query)</label>
                                                        <textarea 
                                                            className={`${fieldBase} h-20 font-mono resize-y`}
                                                            value={q.solutionSql} 
                                                            onChange={(e) => handleContestQuestionChange(idx, 'solutionSql', e.target.value)} 
                                                            placeholder="SELECT * FROM orders..." 
                                                        />
                                                    </div>
                                                </div>

                                                {/* Nested Expected output */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs text-gray-400">Expected Output JSON</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGenerateContestQuestionOutput(idx)}
                                                            disabled={generatingQuestionIdx === idx}
                                                            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-semibold hover:bg-indigo-500/30 transition disabled:opacity-50"
                                                        >
                                                            <RefreshCw size={12} className={generatingQuestionIdx === idx ? 'animate-spin' : ''} />
                                                            {generatingQuestionIdx === idx ? 'Generating...' : 'Auto-Generate Expected JSON'}
                                                        </button>
                                                    </div>
                                                    <textarea 
                                                        className={`${fieldBase} h-28 font-mono resize-y`}
                                                        value={q.expectedOutput} 
                                                        onChange={(e) => handleContestQuestionChange(idx, 'expectedOutput', e.target.value)} 
                                                        placeholder='[{ "id": 1, "col": "val" }]' 
                                                    />
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Modal footer */}
                        <div className="p-6 border-t border-gray-600/40 flex justify-end gap-4">
                            <button className="px-6 py-3 bg-transparent text-gray-300 border border-gray-600/50 rounded-lg font-semibold cursor-pointer transition-all hover:bg-gray-700/50 hover:text-white" onClick={closeContestEditor}>
                                Cancel
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" onClick={handleSaveContest}>
                                <Save size={18} /> Publish Contest
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
