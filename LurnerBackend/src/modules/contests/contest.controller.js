import * as contestService from "./contest.service.js";
import * as questionService from "../questions/question.service.js";
import { executeSql } from "../../services/execution/SqlEngine.js";

export const createContestHandler = async (req, res) => {
    try {
        const contest = await contestService.createContest(req.body, req.user.id);
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
    const { sql, questionId } = req.body;
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

        // 2. Fetch Question
        const question = await questionService.getQuestionById(questionId);
        if (!question) return res.status(404).json({ error: "Question not found" });

        // 3. Execute SQL
        const results = await executeSql(question.initSql, sql);

        // 4. Compare Output
        const isCorrect = JSON.stringify(results) === JSON.stringify(question.expectedOutput);

        if (isCorrect) {
            // Update score (simple 10 points for now)
            await contestService.updateParticipantScore(userId, contestId, 10);
        }

        res.json({
            isCorrect,
            results,
            message: isCorrect ? "✅ Points added to your contest score!" : "❌ Incorrect solution"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
