import prisma from "../../config/prisma.js";

/**
 * Service for aggregating user-specific analytics.
 */

/**
 * Get high-level summary stats for a user.
 */
export const getUserStatsSummary = async (userId) => {
    const [totalSolved, totalSubmissions, successSubmissions] = await Promise.all([
        prisma.userQuestionProgress.count({
            where: { userId, isCompleted: true }
        }),
        prisma.submission.count({
            where: { userId }
        }),
        prisma.submission.count({
            where: { userId, status: "SUCCESS" }
        })
    ]);

    const accuracy = totalSubmissions > 0 
        ? Math.round((successSubmissions / totalSubmissions) * 100) 
        : 0;

    return {
        totalSolved,
        totalSubmissions,
        accuracy,
        successRate: accuracy // Explicit name for readability
    };
};

/**
 * Get activity distribution over the last 30 days for a heatmap.
 */
export const getActivityHeatmap = async (userId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activity = await prisma.submission.groupBy({
        by: ['createdAt'],
        where: {
            userId,
            createdAt: { gte: thirtyDaysAgo }
        },
        _count: {
            id: true
        }
    });

    // Format into { date: YYYY-MM-DD, count: N }
    const formattedMap = activity.reduce((acc, curr) => {
        const date = curr.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + curr._count.id;
        return acc;
    }, {});

    return Object.entries(formattedMap).map(([date, count]) => ({ date, count }));
};

/**
 * Get proficiency breakdown by Question Tags (Topics).
 */
export const getSkillMasteryBreakdown = async (userId) => {
    // Get all tags and count questions in each
    const tags = await prisma.tag.findMany({
        include: {
            _count: { select: { questions: true } }
        }
    });

    // Get user's completed questions grouped by tag
    const solvedByTag = await prisma.userQuestionProgress.findMany({
        where: { userId, isCompleted: true },
        include: {
            question: { select: { tagId: true } }
        }
    });

    const solvedCounts = solvedByTag.reduce((acc, curr) => {
        const tagId = curr.question.tagId;
        acc[tagId] = (acc[tagId] || 0) + 1;
        return acc;
    }, {});

    return tags.map(tag => ({
        topic: tag.name,
        totalQuestions: tag._count.questions,
        solvedQuestions: solvedCounts[tag.id] || 0,
        masteryPercentage: tag._count.questions > 0 
            ? Math.round(((solvedCounts[tag.id] || 0) / tag._count.questions) * 100) 
            : 0
    }));
};

/**
 * Get the distribution of error types to identify common mistakes.
 */
export const getErrorDistribution = async (userId) => {
    const errors = await prisma.submission.findMany({
        where: { 
            userId, 
            status: "ERROR",
            errorMessage: { not: null }
        },
        select: { errorMessage: true }
    });

    const distribution = errors.reduce((acc, curr) => {
        const msg = curr.errorMessage.split(':')[0]; // Get the error type (e.g. "SQLITE_ERROR")
        acc[msg] = (acc[msg] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(distribution)
        .map(([errorType, count]) => ({ errorType, count }))
        .sort((a, b) => b.count - a.count);
};

/**
 * Get execution time trends for performance analysis.
 */
export const getPerformanceTelemetry = async (userId) => {
    const submissions = await prisma.submission.findMany({
        where: { userId, executionTimeMs: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { executionTimeMs: true, createdAt: true }
    });

    const avgTime = submissions.length > 0
        ? Math.round(submissions.reduce((sum, s) => sum + s.executionTimeMs, 0) / submissions.length)
        : 0;

    return {
        averageExecutionTimeMs: avgTime,
        recentTrend: submissions.reverse().map(s => s.executionTimeMs)
    };
};
