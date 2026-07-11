import * as contestService from "./contest.service.js";
import { executeSql } from "../../services/execution/SqlEngine.js";
import { getIO } from "../../socket.js";
import prisma from "../../config/prisma.js";

// ── Scoring constants ──────────────────────────────────────────────────────
const BASE_SCORES = { EASY: 100, MEDIUM: 200, HARD: 350 };
const WRONG_ATTEMPT_PENALTY = 15;  // pts deducted per prior wrong attempt
const TIME_PENALTY_PER_5MIN = 5;   // pts deducted per 5-minute bracket elapsed

/**
 * Compute table previews for a given dataset's initSql.
 * Returns a map of { tableName: rows[] } or {} on failure.
 */
async function buildTablePreviews(initSql) {
    const previews = {};
    if (!initSql) return previews;
    try {
        const tablesResult = await executeSql(
            initSql,
            "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        );
        if (tablesResult?.data) {
            for (const row of tablesResult.data) {
                try {
                    const sample = await executeSql(initSql, `SELECT * FROM ${row.name} LIMIT 5`);
                    previews[row.name] = sample.data;
                } catch {
                    // Individual table failure is non-fatal
                }
            }
        }
    } catch (e) {
        console.error("buildTablePreviews failed:", e);
    }
    return previews;
}

// ── Handlers ───────────────────────────────────────────────────────────────

export const createContestHandler = async (req, res) => {
    try {
        const { title, description, startTime, endTime, questions } = req.body;

        // Pre-compute table previews for each question's dataset (once, at creation time)
        const questionsWithPreviews = await Promise.all(
            (questions || []).map(async (q) => {
                let tablePreviews = {};
                if (q.datasetId) {
                    const dataset = await prisma.dataset.findUnique({
                        where: { id: parseInt(q.datasetId) },
                        select: { initSql: true }
                    });
                    if (dataset?.initSql) {
                        tablePreviews = await buildTablePreviews(dataset.initSql);
                    }
                }
                return { ...q, tablePreviews };
            })
        );

        const contest = await contestService.createContest({
            title, description, startTime, endTime,
            questions: questionsWithPreviews
        });
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
        // If user is already a participant, treat as idempotent success
        if (error.code === "P2002") {
            return res.status(200).json({ message: "Already joined" });
        }
        res.status(400).json({ error: error.message });
    }
};

export const getContestHandler = async (req, res) => {
    try {
        const contest = await contestService.getContestById(req.params.id);
        if (!contest) return res.status(404).json({ error: "Contest not found" });

        // Attach tablePreviews from the cached DB column — no SQL execution needed
        const questions = contest.questions.map((q) => {
            const allTables = q.tablePreviews || {};
            const schemaSample = q.dbTableName ? (allTables[q.dbTableName] || null) : null;
            return { ...q, allTables, schemaSample };
        });

        res.json({ ...contest, questions });
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

export const getLeaderboardHandler = async (req, res) => {
    try {
        const leaderboard = await contestService.getLeaderboard(req.params.id);
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Record a server-side anti-cheat infraction.
 * Hard-disqualifies at threshold (3); further submissions will be rejected.
 */
export const infractionHandler = async (req, res) => {
    const contestId = parseInt(req.params.id);
    const userId = req.user.id;
    const { type } = req.body; // e.g. "EXIT_FULLSCREEN", "TAB_SWITCH"

    try {
        const participant = await contestService.getParticipant(userId, contestId);
        if (!participant) {
            return res.status(403).json({ error: "You are not a participant in this contest" });
        }

        // Already disqualified — nothing to do
        if (participant.isDisqualified) {
            return res.json({ infractions: participant.infractions, isDisqualified: true });
        }

        const updated = await contestService.logInfraction(userId, contestId, 3);

        console.log(`⚠️  Anti-cheat infraction [${type}] — User ${userId} in Contest ${contestId}: ${updated.infractions}/3 strikes`);

        if (updated.isDisqualified) {
            console.log(`🚫 User ${userId} has been DISQUALIFIED from Contest ${contestId}`);
        }

        res.json({ infractions: updated.infractions, isDisqualified: updated.isDisqualified });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Specialized submission handler for contests.
 * Includes: active-contest gate, participant check, disqualification check,
 * duplicate-solve prevention, dynamic scoring, and Socket.IO broadcast.
 */
export const contestSubmitHandler = async (req, res) => {
    const { sql, contestQuestionId } = req.body;
    const contestId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        // 1. Verify contest is active
        const contest = await contestService.getContestById(contestId);
        if (!contest) return res.status(404).json({ error: "Contest not found" });

        const now = new Date();
        if (now < new Date(contest.startTime) || now > new Date(contest.endTime)) {
            return res.status(403).json({ error: "Contest is not currently active" });
        }

        // 2. Verify participation and disqualification status
        const participant = await contestService.getParticipant(userId, contestId);
        if (!participant) {
            return res.status(403).json({ error: "You are not a participant in this contest" });
        }
        if (participant.isDisqualified) {
            return res.status(403).json({ error: "You have been disqualified from this contest." });
        }

        // 3. Fetch Contest Question
        const contestQuestion = await contestService.getContestQuestionById(contestQuestionId);
        if (!contestQuestion) return res.status(404).json({ error: "Contest Question not found" });

        // 4. Duplicate solve check
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
            // 5. Execute SQL
            const execution = await executeSql(contestQuestion.dataset?.initSql || "", sql);
            results = execution.data;
            executionTimeMs = execution.executionTimeMs;

            // 6. Compare Output
            const normalizeResult = (data) => {
                if (!data) return data;
                if (Array.isArray(data)) return data.map(normalizeResult);
                if (typeof data !== "object") return data;
                return Object.keys(data).sort().reduce((acc, key) => {
                    acc[key] = normalizeResult(data[key]);
                    return acc;
                }, {});
            };

            isCorrect = JSON.stringify(normalizeResult(results)) === JSON.stringify(normalizeResult(contestQuestion.expectedOutput));
            status = isCorrect ? "SUCCESS" : "FAIL";
        } catch (e) {
            status = "ERROR";
            errorMessage = e.error || e.message;
            executionTimeMs = e.executionTimeMs || 0;
        }

        // 7. Record submission
        await contestService.recordContestSubmission({
            userId,
            contestId,
            contestQuestionId: parseInt(contestQuestionId),
            code: sql,
            status,
            executionTimeMs,
            errorMessage,
            output: results || null
        });

        // 8. Update score on correct answer
        if (isCorrect) {
            const difficulty = contestQuestion.difficulty; // "EASY" | "MEDIUM" | "HARD"
            const basePts = BASE_SCORES[difficulty] || 100;

            // Penalty for prior wrong attempts
            const priorWrong = await contestService.countPriorWrongAttempts(userId, contestId, contestQuestionId);
            const attemptPenalty = priorWrong * WRONG_ATTEMPT_PENALTY;

            // Penalty for elapsed time (per 5-minute bracket since contest start)
            const elapsedMs = now - new Date(contest.startTime);
            const elapsedMin = Math.floor(elapsedMs / 60000);
            const timePenalty = Math.floor(elapsedMin / 5) * TIME_PENALTY_PER_5MIN;

            const pointsAwarded = Math.max(0, basePts - attemptPenalty - timePenalty);

            await contestService.updateParticipantScore(userId, contestId, pointsAwarded);

            // 9. Broadcast score update to contest room via Socket.IO
            try {
                const leaderboard = await contestService.getLeaderboard(contestId);
                getIO().to(`contest_${contestId}`).emit("score_update", { leaderboard });
            } catch (e) {
                console.error("Socket.IO emit failed (non-fatal):", e.message);
            }

            return res.json({
                isCorrect: true,
                results,
                message: `✅ Correct! +${pointsAwarded} pts (base ${basePts} − ${attemptPenalty} attempt penalty − ${timePenalty} time penalty)`
            });
        }

        res.json({
            isCorrect: false,
            results,
            message: status === "ERROR" ? `❌ Error: ${errorMessage}` : "❌ Incorrect solution"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const contestExecuteHandler = async (req, res) => {
    const { sql, contestQuestionId } = req.body;
    const contestId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        // Reject execution if user is disqualified
        const participant = await contestService.getParticipant(userId, contestId);
        if (participant?.isDisqualified) {
            return res.status(403).json({ error: "You have been disqualified from this contest." });
        }

        const contestQuestion = await contestService.getContestQuestionById(contestQuestionId);
        if (!contestQuestion) return res.status(404).json({ error: "Contest Question not found" });

        let results;
        let executionTimeMs = 0;
        let errorMessage = null;

        try {
            const execution = await executeSql(contestQuestion.dataset?.initSql || "", sql);
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
