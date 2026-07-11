import express from "express";
import * as contestController from "./contest.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import submissionLimiter from "../../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Contest Routes
 */

// List all contests (public — anyone can see the contest list)
router.get("/", contestController.listContestsHandler);

// Create a new contest (auth required; admin enforcement is handled externally for now)
router.post("/", authMiddleware, contestController.createContestHandler);

// Get specific contest details (questions, leaderboard, user submissions)
router.get("/:id", authMiddleware, contestController.getContestHandler);

// Join a contest
router.post("/:id/join", authMiddleware, contestController.joinContestHandler);

// Get contest leaderboard
router.get("/:id/leaderboard", authMiddleware, contestController.getLeaderboardHandler);

// Submit a solution for a contest question (rate-limited: 1 req / 2s per user)
router.post("/:id/submit", authMiddleware, submissionLimiter, contestController.contestSubmitHandler);

// Execute query for a contest question (dry-run, no submission recorded)
router.post("/:id/execute", authMiddleware, contestController.contestExecuteHandler);

// Report an anti-cheat infraction (client-side detection → server validation)
router.post("/:id/infraction", authMiddleware, contestController.infractionHandler);

export default router;
