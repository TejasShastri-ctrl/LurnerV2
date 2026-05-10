import express from "express";
import * as questionController from "./question.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import submissionLimiter from "../../middleware/rateLimiter.js";


const router = express.Router();

router.post("/execute", authMiddleware, submissionLimiter, questionController.executeSqlHandler);
router.get("/", authMiddleware, questionController.listQuestions);
router.get("/:id", authMiddleware, questionController.getQuestionDetails);

export default router;
