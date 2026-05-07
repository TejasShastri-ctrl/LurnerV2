import * as analyticsService from "./analytics.service.js";
import * as aiService from "./ai.service.js";

/**
 * Controller for handling detailed user analytics requests.
 */

export const getUserStatsSummaryHandler = async (req, res) => {
    try {
        const stats = await analyticsService.getUserStatsSummary(req.user.id);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getActivityHeatmapHandler = async (req, res) => {
    try {
        const heatmap = await analyticsService.getActivityHeatmap(req.user.id);
        res.json(heatmap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getSkillMasteryBreakdownHandler = async (req, res) => {
    try {
        const breakdown = await analyticsService.getSkillMasteryBreakdown(req.user.id);
        res.json(breakdown);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getErrorDistributionHandler = async (req, res) => {
    try {
        const errors = await analyticsService.getErrorDistribution(req.user.id);
        res.json(errors);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getPerformanceTelemetryHandler = async (req, res) => {
    try {
        const telemetry = await analyticsService.getPerformanceTelemetry(req.user.id);
        res.json(telemetry);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const generateAiReportHandler = async (req, res) => {
    try {
        const days = parseInt(req.body.days) || 7;
        const report = await aiService.generateAiReport(req.user.id, days);
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getAiReportHandler = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const report = await aiService.getLatestReport(req.user.id, days);
        if (!report) return res.status(404).json({ error: "No report found for this timeframe." });
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
