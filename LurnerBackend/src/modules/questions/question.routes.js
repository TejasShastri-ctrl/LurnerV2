import express from "express";
import * as questionController from "./question.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

/**
 * Question Routes
 */

// Execute SQL against a specific question's sandbox (Authenticated for activity tracking)
router.post("/execute", authMiddleware, questionController.executeSqlHandler);

// List all questions (metadata)
router.get("/", authMiddleware, questionController.listQuestions);

// Get specific question details
router.get("/:id", authMiddleware, questionController.getQuestionDetails);

export default router;
