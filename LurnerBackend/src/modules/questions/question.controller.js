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
            const execution = await executeSql(question.initSql, sql);
            results = execution.data;
            executionTimeMs = execution.executionTimeMs;
            status = "SUCCESS"; 
        } catch (e) {
            status = "ERROR";
            errorMessage = e.error || e.message;
            executionTimeMs = e.executionTimeMs || 0;
            results = null;
        }

        // 1. Save "Run" activity to ActivityLog for AI Telemetry
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
        console.error("❌ SQL Execution Error (Run):", e);
        res.status(500).json({ error: e.message });
    }
};

export const listQuestions = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const questions = await questionService.getAllQuestions(userId);
        res.json(questions);
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
        if (question.dbTableName) {
            try {
                const sample = await executeSql(question.initSql, `SELECT * FROM ${question.dbTableName} LIMIT 5`);
                schemaSample = sample.data;
            } catch (e) {
                console.error("Failed to generate schema sample:", e);
            }
        }

        res.json({ ...question, schemaSample });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
