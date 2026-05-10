import express from "express";
import * as submissionController from "./submission.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import submissionLimiter from "../../middleware/rateLimiter.js";

const router = express.Router();
router.post("/", submissionLimiter, authMiddleware, submissionController.submitHandler);
router.get("/history/:questionId", authMiddleware, submissionController.getHistory); //submission history

export default router;