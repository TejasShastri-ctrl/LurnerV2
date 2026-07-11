import prisma from "../../config/prisma.js";

/**
 * Create a new contest with questions.
 * Accepts pre-computed tablePreviews per question to avoid re-running SQL on every fetch.
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
                    datasetId: parseInt(q.datasetId),
                    dbTableName: q.dbTableName,
                    solutionSql: q.solutionSql,
                    expectedOutput: q.expectedOutput,
                    tablePreviews: q.tablePreviews || null
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
 * Get contest details (questions without solutionSql, participants, and user's submissions)
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
                    tablePreviews: true,
                    dataset: {
                        select: {
                            id: true,
                            name: true,
                            initSql: true
                        }
                    },
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
            },
            contestSubmissions: {
                select: {
                    userId: true,
                    contestQuestionId: true,
                    status: true,
                    createdAt: true
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
 * Get leaderboard for a contest — participants ordered by score desc.
 */
export const getLeaderboard = async (contestId) => {
    const participants = await prisma.contestParticipant.findMany({
        where: { contestId: parseInt(contestId) },
        include: {
            user: { select: { id: true, name: true } }
        },
        orderBy: { score: "desc" }
    });

    // Annotate with solved question count per participant
    const solvedCounts = await prisma.contestSubmission.groupBy({
        by: ["userId"],
        where: {
            contestId: parseInt(contestId),
            status: "SUCCESS"
        },
        _count: { id: true }
    });

    const solvedMap = solvedCounts.reduce((acc, s) => {
        acc[s.userId] = s._count.id;
        return acc;
    }, {});

    return participants.map((p, idx) => ({
        rank: idx + 1,
        userId: p.userId,
        name: p.user.name,
        score: p.score,
        solved: solvedMap[p.userId] || 0,
        isDisqualified: p.isDisqualified,
        finishedAt: p.finishedAt
    }));
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
 * Check if a user is in a contest; returns participant record or null
 */
export const getParticipant = async (userId, contestId) => {
    return prisma.contestParticipant.findUnique({
        where: {
            userId_contestId: {
                userId,
                contestId: parseInt(contestId)
            }
        }
    });
};

export const isUserInContest = async (userId, contestId) => {
    const p = await getParticipant(userId, parseInt(contestId));
    return !!p;
};

/**
 * Get a specific Contest Question by its ID
 */
export const getContestQuestionById = async (id) => {
    return prisma.contestQuestion.findUnique({
        where: { id: parseInt(id) },
        include: { dataset: true }
    });
};

/**
 * Count prior wrong/error attempts for this user+question in a contest (for scoring penalty)
 */
export const countPriorWrongAttempts = async (userId, contestId, contestQuestionId) => {
    return prisma.contestSubmission.count({
        where: {
            userId,
            contestId: parseInt(contestId),
            contestQuestionId: parseInt(contestQuestionId),
            status: { in: ["FAIL", "ERROR"] }
        }
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
    return prisma.contestSubmission.create({ data });
};

/**
 * Log a server-side anti-cheat infraction.
 * Returns the updated participant with new infraction count.
 * If infractions reach the threshold, marks the participant as disqualified.
 */
export const logInfraction = async (userId, contestId, threshold = 3) => {
    const updated = await prisma.contestParticipant.update({
        where: {
            userId_contestId: {
                userId,
                contestId: parseInt(contestId)
            }
        },
        data: {
            infractions: { increment: 1 }
        }
    });

    // Hard disqualify if threshold hit
    if (updated.infractions >= threshold) {
        await prisma.contestParticipant.update({
            where: {
                userId_contestId: {
                    userId,
                    contestId: parseInt(contestId)
                }
            },
            data: { isDisqualified: true }
        });
        return { ...updated, isDisqualified: true };
    }

    return updated;
};
