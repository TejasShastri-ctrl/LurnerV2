import prisma from "../../config/prisma.js";

/**
 * Create a new contest with questions
 */
export const createContest = async (data) => {
    const { title, description, startTime, endTime, questions } = data;
    
    return prisma.contest.create({
        data: {
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            questions: {
                create: questions.map((q, index) => ({
                    order: index,
                    title: q.title,
                    description: q.description,
                    difficulty: q.difficulty,
                    initSql: q.initSql,
                    dbTableName: q.dbTableName,
                    solutionSql: q.solutionSql,
                    expectedOutput: q.expectedOutput
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
                select: {
                    id: true,
                    order: true,
                    title: true,
                    description: true,
                    difficulty: true,
                    dbTableName: true,
                    initSql: true, 
                    expectedOutput: true
                    // EXPLICITLY OMIT solutionSql
                },
                orderBy: { order: "asc" }
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

/**
 * Get a specific Contest Question by its ID
 */
export const getContestQuestionById = async (id) => {
    return prisma.contestQuestion.findUnique({
        where: { id: parseInt(id) }
    });
};

/**
 * Check if a user has already successfully solved this question in this contest
 */
export const hasUserSolvedQuestionInContest = async (userId, contestId, contestQuestionId) => {
    const submission = await prisma.contestSubmission.findFirst({
        where: {
            userId,
            contestId: parseInt(contestId),
            contestQuestionId: parseInt(contestQuestionId),
            status: "SUCCESS"
        }
    });
    return !!submission;
};

/**
 * Record a submission for a contest
 */
export const recordContestSubmission = async (data) => {
    return prisma.contestSubmission.create({
        data
    });
};
