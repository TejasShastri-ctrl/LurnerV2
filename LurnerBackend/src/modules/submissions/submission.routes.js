import express from "express";
import * as submissionController from "./submission.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

import rateLimit from 'express-rate-limit';

const submissionLimiter = rateLimit({
    windowMs: 2000,
    max: 1, // each IP limited to 1 req per windowMs
    message: { error: "You are submitting too fast. Please wait a moment." },
});

// Submit a solution for validation
router.post("/", submissionLimiter, authMiddleware, submissionController.submitHandler);

// submission history
router.get("/history/:questionId", authMiddleware, submissionController.getHistory);


export default router;
