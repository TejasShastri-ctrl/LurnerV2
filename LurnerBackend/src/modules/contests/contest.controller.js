import * as contestService from "./contest.service.js";
import * as questionService from "../questions/question.service.js";
import { executeSql } from "../../services/execution/SqlEngine.js";

export const createContestHandler = async (req, res) => {
    try {
        const contest = await contestService.createContest(req.body);
        res.status(201).json(contest);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const joinContestHandler = async (req, res) => {
    try {
        const participation = await contestService.joinContest(req.user.id, req.params.id);
        res.status(201).json(participation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getContestHandler = async (req, res) => {
    try {
        const contest = await contestService.getContestById(req.params.id);
        if (!contest) return res.status(404).json({ error: "Contest not found" });
        res.json(contest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const listContestsHandler = async (req, res) => {
    try {
        const contests = await contestService.getAllContests();
        res.json(contests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Specialized submission handler for contests
 */
export const contestSubmitHandler = async (req, res) => {
    const { sql, contestQuestionId } = req.body;
    const contestId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        // 1. Verify contest is active and user is a participant
        const contest = await contestService.getContestById(contestId);
        if (!contest) return res.status(404).json({ error: "Contest not found" });

        const now = new Date();
        if (now < new Date(contest.startTime) || now > new Date(contest.endTime)) {
            return res.status(403).json({ error: "Contest is not currently active" });
        }

        const isParticipant = await contestService.isUserInContest(userId, contestId);
        if (!isParticipant) {
            return res.status(403).json({ error: "You are not a participant in this contest" });
        }

        // 2. Fetch Contest Question
        const contestQuestion = await contestService.getContestQuestionById(contestQuestionId);
        if (!contestQuestion) return res.status(404).json({ error: "Contest Question not found" });

        // Check if user already solved it
        const alreadySolved = await contestService.hasUserSolvedQuestionInContest(userId, contestId, contestQuestionId);
        if (alreadySolved) {
            return res.status(400).json({ error: "You have already solved this question in this contest!" });
        }

        let results;
        let isCorrect = false;
        let status = "FAIL";
        let executionTimeMs = 0;
        let errorMessage = null;

        try {
            // 3. Execute SQL
            const execution = await executeSql(contestQuestion.initSql, sql);
            results = execution.data;
            executionTimeMs = execution.executionTimeMs;

            // 4. Compare Output
            // Normalize outputs as done in normal submissions
            const normalizeResult = (data) => {
                if (!data) return data;
                if (Array.isArray(data)) return data.map(normalizeResult);
                if (typeof data !== 'object') return data;
                return Object.keys(data).sort().reduce((acc, key) => {
                    acc[key] = normalizeResult(data[key]);
                    return acc;
                }, {});
            };

            const normResults = normalizeResult(results);
            const normExpected = normalizeResult(contestQuestion.expectedOutput);
            
            isCorrect = JSON.stringify(normResults) === JSON.stringify(normExpected);
            status = isCorrect ? "SUCCESS" : "FAIL";
            
        } catch (e) {
            status = "ERROR";
            errorMessage = e.error || e.message;
            executionTimeMs = e.executionTimeMs || 0;
        }

        // 5. Log the submission for the contest
        await contestService.recordContestSubmission({
            userId,
            contestId,
            contestQuestionId,
            code: sql,
            status,
            executionTimeMs,
            errorMessage,
            output: results || null
        });

        if (isCorrect) {
            // Update score (simple 10 points for now)
            await contestService.updateParticipantScore(userId, contestId, 10);
        }

        res.json({
            isCorrect,
            results,
            message: isCorrect ? "✅ Points added to your contest score!" : (status === "ERROR" ? `❌ Error: ${errorMessage}` : "❌ Incorrect solution")
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const contestExecuteHandler = async (req, res) => {
    const { sql, contestQuestionId } = req.body;

    try {
        const contestQuestion = await contestService.getContestQuestionById(contestQuestionId);
        if (!contestQuestion) return res.status(404).json({ error: "Contest Question not found" });

        let results;
        let executionTimeMs = 0;
        let errorMessage = null;

        try {
            const execution = await executeSql(contestQuestion.initSql, sql);
            results = execution.data;
            executionTimeMs = execution.executionTimeMs;
        } catch (e) {
            errorMessage = e.error || e.message;
            executionTimeMs = e.executionTimeMs || 0;
        }

        res.json({ results, executionTimeMs, errorMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
