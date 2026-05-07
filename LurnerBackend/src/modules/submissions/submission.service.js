import prisma from "../../config/prisma.js";

/**
 * Service to handle Submission persistence.
 */

export const createSubmission = async (data) => {
    return prisma.submission.create({
        data
    });
};

export const getSubmissionsForQuestion = async (questionId) => {
    return prisma.submission.findMany({
        where: { questionId: parseInt(questionId) },
        orderBy: { createdAt: "desc" }
    });
};

export const getUserSubmissionsForQuestion = async (userId, questionId) => {
    return prisma.submission.findMany({
        where: { 
            userId: parseInt(userId),
            questionId: parseInt(questionId) 
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            status: true,
            code: true,
            createdAt: true,
            executionTimeMs: true
        }
    });
};
