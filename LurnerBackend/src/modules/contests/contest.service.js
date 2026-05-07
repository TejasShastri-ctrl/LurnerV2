import prisma from "../../config/prisma.js";

/**
 * Create a new contest with questions
 */
export const createContest = async (data, creatorId) => {
    const { title, description, startTime, endTime, questionIds } = data;
    
    return prisma.contest.create({
        data: {
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            creatorId,
            questions: {
                create: questionIds.map((id, index) => ({
                    questionId: parseInt(id),
                    order: index
                }))
            }
        },
        include: {
            questions: true
        }
    });
};

/**
 * Join a contest
 */
export const joinContest = async (userId, contestId) => {
    return prisma.contestParticipant.create({
        data: {
            userId,
            contestId: parseInt(contestId)
        }
    });
};

/**
 * Get contest details
 */
export const getContestById = async (id) => {
    return prisma.contest.findUnique({
        where: { id: parseInt(id) },
        include: {
            questions: {
                include: {
                    question: true
                }
            },
            participants: {
                include: {
                    user: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: {
                    score: "desc"
                }
            }
        }
    });
};

/**
 * List all contests
 */
export const getAllContests = async () => {
    return prisma.contest.findMany({
        orderBy: { startTime: "desc" },
        include: {
            _count: {
                select: { participants: true }
            }
        }
    });
};

/**
 * Update score for a participant
 */
export const updateParticipantScore = async (userId, contestId, points) => {
    return prisma.contestParticipant.update({
        where: {
            userId_contestId: {
                userId,
                contestId: parseInt(contestId)
            }
        },
        data: {
            score: {
                increment: points
            }
        }
    });
};

/**
 * Check if a user is in a contest
 */
export const isUserInContest = async (userId, contestId) => {
    const participant = await prisma.contestParticipant.findUnique({
        where: {
            userId_contestId: {
                userId,
                contestId: parseInt(contestId)
            }
        }
    });
    return !!participant;
};
