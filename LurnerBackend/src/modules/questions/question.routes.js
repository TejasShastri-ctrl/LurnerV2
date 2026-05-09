import express from "express";
import * as questionController from "./question.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import submissionLimiter from "../../middleware/rateLimiter.js";


const router = express.Router();

// Execute SQL against a specific question's sandbox (Authenticated for activity tracking)
router.post("/execute", authMiddleware, submissionLimiter, questionController.executeSqlHandler);

// List all questions (metadata)
router.get("/", authMiddleware, questionController.listQuestions);

// Get specific question details
router.get("/:id", authMiddleware, questionController.getQuestionDetails);

export default router;
