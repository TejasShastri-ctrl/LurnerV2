import prisma from "../../config/prisma.js";


export const getQuestionById = async (id) => {
    return prisma.question.findUnique({
        where: { id: parseInt(id) }
    });
};

export const getAllQuestions = async (userId) => {
    // Ensure userId is a number or a value that won't match any user (like -1)
    const targetUserId = userId ? parseInt(userId) : -1;

    return prisma.question.findMany({
        select: {
            id: true,
            title: true,
            difficulty: true,
            description: true,
            progress: {
                where: { userId: targetUserId },
                select: {
                    isCompleted: true,
                    attempts: true
                }
            }
        }
    });
};
