import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllQuestions, createQuestion, updateQuestion, deleteQuestion, generateExpectedOutput, fetchAllTags } from '../api/api';
import { Plus, Edit2, Trash2, X, Save, Database, Code, Play, Tags, RefreshCw } from 'lucide-react';

const Admin = () => {
    const { token } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'EASY',
        tagId: 1,
        initSql: '',
        dbTableName: '',
        solutionSql: '',
        expectedOutput: ''
    });

    useEffect(() => {
        console.log("Form post latest change : ", formData);
    }, [formData])

    useEffect(() => {
        loadData();
    }, [token]);

    const loadData = async () => {
        setLoading(true);
        const [questionsData, tagsData] = await Promise.all([
            fetchAllQuestions(token),
            fetchAllTags(token)
        ]);
        setQuestions(questionsData);
        setTags(tagsData);
        setLoading(false);
        if (tagsData?.length > 0) {
            setFormData(prev => ({ ...prev, tagId: tagsData[0].id }));
        }
    };

    const loadQuestions = async () => {
        const data = await fetchAllQuestions(token);
        setQuestions(data);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'tagId' ? parseInt(value) || 1 : value
        }));
        console.log(formData);
    };

    const handleExpectedOutputChange = (e) => {
        setFormData(prev => ({ ...prev, expectedOutput: e.target.value }));
    };

    const openEditor = (question = null) => {
        if (question) {
            setCurrentQuestion(question);
            setFormData({
                title: question.title || '',
                description: question.description || '',
                difficulty: question.difficulty || 'EASY',
                tagId: question.tagId || 1,
                initSql: question.initSql || '',
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
                initSql: '',
                dbTableName: '',
                solutionSql: '',
                expectedOutput: ''
            });
        }
        setIsEditing(true);
    };

    const closeEditor = () => {
        setIsEditing(false);
        setCurrentQuestion(null);
    };

    const handleSave = async () => {
        try {
            let parsedExpectedOutput = formData.expectedOutput;
            if (typeof formData.expectedOutput === 'string' && formData.expectedOutput.trim() !== '') {
                try {
                    parsedExpectedOutput = JSON.parse(formData.expectedOutput);
                } catch (err) {
                    alert('Invalid JSON in Expected Output!');
                    return;
                }
            }

            const payload = {
                ...formData,
                expectedOutput: parsedExpectedOutput
            };

            if (currentQuestion) {
                await updateQuestion(currentQuestion.id, payload, token);
            } else {
                await createQuestion(payload, token);
            }
            closeEditor();
            loadQuestions();
        } catch (e) {
            console.error(e);
            alert('Error saving question: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await deleteQuestion(id, token);
                loadQuestions();
            } catch (e) {
                console.error(e);
                alert('Error deleting question');
            }
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateOutput = async () => {
        if (!formData.initSql || !formData.solutionSql) {
            alert('Please provide both Init SQL and Solution SQL to generate output.');
            return;
        }
        setIsGenerating(true);
        try {
            const data = await generateExpectedOutput(formData.initSql, formData.solutionSql, token);
            setFormData(prev => ({
                ...prev,
                expectedOutput: JSON.stringify(data.expectedOutput, null, 2)
            }));
            alert('Output generated successfully!');
        } catch (e) {
            console.error(e);
            alert('Error generating output: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto text-gray-200 font-sans">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent m-0">Content Management</h1>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.3)]" onClick={() => openEditor()}>
                    <Plus size={20} /> Add New Question
                </button>
            </div>

            {loading ? (
                <div className="text-center p-12 text-gray-400 text-xl">Loading questions...</div>
            ) : (
                <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-600/40 overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">ID</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Title</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Difficulty</th>
                                <th className="text-left p-4 bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-600/40">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => (
                                <tr key={q.id} className="border-b border-gray-600/20 transition-colors duration-200 hover:bg-gray-700/30">
                                    <td className="p-4 text-gray-300">{q.id}</td>
                                    <td className="p-4 text-gray-300">{q.title}</td>
                                    <td className="p-4 text-gray-300">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold tracking-wide ${q.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' :
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
            )}

            {isEditing && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-8">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-600/40">
                        <div className="p-6 border-b border-gray-600/40 flex justify-between items-center">
                            <h2 className="m-0 text-gray-100 text-2xl font-semibold">{currentQuestion ? 'Edit Question' : 'Create Question'}</h2>
                            <button className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={closeEditor}><X size={24} /></button>
                        </div>
                        <h3>Note: The following form is a one-way question generator and does not have supported runs before putting in the initial and solution SQLs</h3>
                        <h3>It is recommended that you ensure the initSQL and solutionSQL are valid and match the question's description and requirements</h3>
                        <div className="p-6 overflow-y-auto flex flex-col gap-6">
                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-gray-400 text-sm font-medium flex items-center">Title</label>
                                <input className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Find High Earners" />
                            </div>

                            <div className="flex gap-6">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-gray-400 text-sm font-medium flex items-center">Difficulty</label>
                                    <select className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border" name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                                        <option value="EASY">EASY</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HARD">HARD</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-gray-400 text-sm font-medium flex items-center">Tag ID</label>
                                    <select className='bg-black text-sm font-medium flex items-center' name='tagId' value={formData.tagId} onChange={handleInputChange}>
                                        {tags.map(tag => {
                                            return <option key={tag.id} value={tag.id}>{tag.name}</option>
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-gray-400 text-sm font-medium flex items-center">Description (Markdown allowed)</label>
                                <textarea className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border h-24 resize-y" name="description" value={formData.description} onChange={handleInputChange} placeholder="Problem description..."></textarea>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-gray-400 text-sm font-medium flex items-center"><Database size={16} className="mr-2" /> DB Table Name</label>
                                    <input className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border" name="dbTableName" value={formData.dbTableName} onChange={handleInputChange} placeholder="e.g. employees" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-gray-400 text-sm font-medium flex items-center"><Code size={16} className="mr-2" /> Init SQL (Table Creation & Seeding)</label>
                                <textarea className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border h-36 font-mono resize-y" name="initSql" value={formData.initSql} onChange={handleInputChange} placeholder="CREATE TABLE ...; INSERT INTO ...;"></textarea>
                            </div>

                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-gray-400 text-sm font-medium flex items-center"><Play size={16} className="mr-2" /> Solution SQL</label>
                                <textarea className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border h-24 font-mono resize-y" name="solutionSql" value={formData.solutionSql} onChange={handleInputChange} placeholder="SELECT * FROM ..."></textarea>
                            </div>

                            <div className="flex flex-col gap-2 flex-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-gray-400 text-sm font-medium flex items-center">Expected Output (JSON Format)</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateOutput}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md text-sm font-semibold hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} />
                                        {isGenerating ? "Generating..." : "Auto-Generate Output"}
                                    </button>
                                </div>
                                <textarea className="bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-100 text-base outline-none transition-colors focus:border-blue-500 w-full box-border h-36 font-mono resize-y" name="expectedOutput" value={formData.expectedOutput} onChange={handleExpectedOutputChange} placeholder="[{ &quot;id&quot;: 1, &quot;name&quot;: &quot;Alice&quot; }]"></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-600/40 flex justify-end gap-4">
                            <button className="px-6 py-3 bg-transparent text-gray-300 border border-gray-600/50 rounded-lg font-semibold cursor-pointer transition-all hover:bg-gray-700/50 hover:text-white" onClick={closeEditor}>Cancel</button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white border-none rounded-lg font-semibold cursor-pointer transition-all hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" onClick={handleSave}><Save size={18} /> {currentQuestion ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
