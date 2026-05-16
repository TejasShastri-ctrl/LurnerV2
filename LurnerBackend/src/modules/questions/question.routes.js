import express from "express";
import * as questionController from "./question.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import submissionLimiter from "../../middleware/rateLimiter.js";


const router = express.Router();

router.post("/execute", authMiddleware, submissionLimiter, questionController.executeSqlHandler);
router.get("/", authMiddleware, questionController.listQuestions);
router.get("/tags", authMiddleware, questionController.getTags);
router.get("/:id", authMiddleware, questionController.getQuestionDetails);
router.post("/createQuestion", authMiddleware, questionController.createQuestion);

// For initSQL execution and expected ouput generation in admin panel
router.post("/generateOutput", authMiddleware, questionController.generateOutput);
router.delete("/delete/:id", authMiddleware, questionController.deleteQuestion);
router.put("/update/:id", authMiddleware, questionController.updateQuestion);

export default router;
