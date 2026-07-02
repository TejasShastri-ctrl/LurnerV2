import * as questionService from "./question.service.js";
import { executeSql } from "../../services/execution/SqlEngine.js";
import * as submissionService from "../submissions/submission.service.js";
import prisma from "../../config/prisma.js";

export const executeSqlHandler = async (req, res) => {
    const { sql, questionId, sessionId } = req.body;
    const userId = req.user.id;
    
    try {
        const question = await questionService.getQuestionById(questionId || 1);
        if (!question) return res.status(404).json({ error: "Question not found" });

        let results;
        let executionTimeMs;
        let status = "FAIL";
        let errorMessage = null;

        try {
            const execution = await executeSql(question.dataset?.initSql || "", sql);
            results = execution.data;
            executionTimeMs = execution.executionTimeMs;
            status = "SUCCESS"; 
        } catch (e) {
            status = "ERROR";
            errorMessage = e.error || e.message;
            executionTimeMs = e.executionTimeMs || 0;
            results = null;
        }

        await prisma.activityLog.create({
            data: {
                userId,
                questionId: question.id,
                code: sql,
                status,
                executionTimeMs: executionTimeMs || 0,
                errorMessage: errorMessage || null,
                sessionId: sessionId || null
            }
        });

        res.json({ results, executionTimeMs, errorMessage });
    } catch (e) {
        console.error("SQL Execution Error (Run): ", e);
        res.status(500).json({ error: e.message });
    }
};

export const createQuestion = async(req, res) => {
    try {
        const question = await questionService.createQuestion(req.body);
        res.status(201).json({message: "Question created successfully"});
    }
    catch(e) {
        res.status(500).json({error: e.message});
    }
}

export const generateOutput = async (req, res) => {
    const { initSql, datasetId, solutionSql } = req.body;
    try {
        let sqlToRun = initSql;
        if (datasetId) {
            const dataset = await prisma.dataset.findUnique({ where: { id: parseInt(datasetId) } });
            if (dataset) sqlToRun = dataset.initSql;
        }
        const execution = await executeSql(sqlToRun, solutionSql);
        res.json({ expectedOutput: execution.data });
    } catch (e) {
        res.status(400).json({ error: e.error || e.message });
    }
};

export const updateQuestion = async(req,res) => {
    try {
        const question = await questionService.updateQuestion(req.params.id, req.body);
        res.status(200).json({message: "Question updated successfully"});
    }
    catch(e) { res.status(500).json({error: e.message}); }
}

export const deleteQuestion = async(req, res) => {
    try {
        await questionService.deleteQuestion(req.params.id);
        res.status(200).json({message: "Question deleted successfully"});
    } catch(e) {
        res.status(500).json({error: e.message});
    }
}

export const listQuestions = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const questions = await questionService.getAllQuestions(userId);
        res.json(questions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getTags = async (req, res) => {
    try {
        const tags = await questionService.getAllTags();
        res.json(tags);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getQuestionDetails = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(req.params.id);
        console.log('getquestionbyid endpoint hit : ', question);
        if (!question) return res.status(404).json({ error: "Question not found" });
        
        let schemaSample = null;
        let allTables = {};

        if (question.dataset && question.dataset.initSql) {
            try {
                // 1. Get all tables in this dataset
                const tablesResult = await executeSql(
                    question.dataset.initSql, 
                    "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%';"
                );
                
                if (tablesResult && tablesResult.data) {
                    for (const row of tablesResult.data) {
                        const tableName = row.name;
                        try {
                            const sample = await executeSql(question.dataset.initSql, `SELECT * FROM ${tableName} LIMIT 5`);
                            allTables[tableName] = sample.data;
                        } catch (err) {
                            console.error(`Failed to generate sample for table ${tableName}:`, err);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to list tables for dataset:", e);
            }

            // Fallback / legacy support for schemaSample
            if (question.dbTableName && allTables[question.dbTableName]) {
                schemaSample = allTables[question.dbTableName];
            } else if (question.dbTableName) {
                try {
                    const sample = await executeSql(question.dataset.initSql, `SELECT * FROM ${question.dbTableName} LIMIT 5`);
                    schemaSample = sample.data;
                } catch (e) {
                    console.error("Failed to generate schema sample:", e);
                }
            }
        }

        res.json({ ...question, schemaSample, allTables });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const listDatasets = async (req, res) => {
    try {
        const datasets = await questionService.getAllDatasets();
        res.json(datasets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createDataset = async (req, res) => {
    try {
        const dataset = await questionService.createDataset(req.body);
        res.status(201).json(dataset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateDataset = async (req, res) => {
    try {
        const dataset = await questionService.updateDataset(req.params.id, req.body);
        res.json(dataset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteDataset = async (req, res) => {
    try {
        await questionService.deleteDataset(req.params.id);
        res.json({ message: "Dataset deleted successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

