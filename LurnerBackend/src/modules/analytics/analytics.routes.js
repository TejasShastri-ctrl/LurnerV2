import express from "express";
import * as analyticsController from "./analytics.controller.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

/**
 * User Analytics Routes
 */

// Basic stats: Solved count, accuracy, etc.
router.get("/user-stats-summary", authMiddleware, analyticsController.getUserStatsSummaryHandler);

// Activity data for heatmaps (last 30 days)
router.get("/activity-heatmap", authMiddleware, analyticsController.getActivityHeatmapHandler);

// Skill mastery: Performance grouped by Tag/Topic
router.get("/skill-mastery-breakdown", authMiddleware, analyticsController.getSkillMasteryBreakdownHandler);

// Error analysis: Most common syntax/logic mistakes
router.get("/error-distribution", authMiddleware, analyticsController.getErrorDistributionHandler);

// Performance telemetry: Execution times and trends
router.get("/performance-telemetry", authMiddleware, analyticsController.getPerformanceTelemetryHandler);

// AI Reports
router.post("/ai-report", authMiddleware, analyticsController.generateAiReportHandler);
router.get("/ai-report", authMiddleware, analyticsController.getAiReportHandler);

export default router;
