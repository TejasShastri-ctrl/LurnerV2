import express from "express";
import * as submissionController from "./submission.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

/**
 * Submission Routes (Protected)
 */

// Submit a solution for validation
router.post("/", authMiddleware, submissionController.submitHandler);

// Get user submission history for a question
router.get("/history/:questionId", authMiddleware, submissionController.getHistory);


export default router;
