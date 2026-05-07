import express from "express";
import * as contestController from "./contest.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

/**
 * Contest Routes
 */

// List all contests
router.get("/", contestController.listContestsHandler); 

// Create a new contest
router.post("/", authMiddleware, contestController.createContestHandler);

// Get specific contest details (including leaderboard)
router.get("/:id", authMiddleware, contestController.getContestHandler);

// Join a contest
router.post("/:id/join", authMiddleware, contestController.joinContestHandler);

// Submit a solution for a contest question
router.post("/:id/submit", authMiddleware, contestController.contestSubmitHandler);

export default router;
