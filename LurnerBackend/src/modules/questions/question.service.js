import prisma from "../../config/prisma.js";


export const getQuestionById = async (id) => {
    return prisma.question.findUnique({
        where: { id: parseInt(id) },
        include: { dataset: true }
    });
};

export const getAllQuestions = async (userId) => {
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

export const getAllTags = async () => {
    return prisma.tag.findMany();
};

export const createQuestion = async (data) => {
    const {title, description, difficulty, tagId, datasetId, dbTableName, solutionSql, expectedOutput} = data;
    const question = await prisma.question.create({
        data : {
            title,
            description,
            difficulty,
            tagId,
            datasetId: parseInt(datasetId),
            dbTableName,
            solutionSql,
            expectedOutput
        }
    });
    return question;
}

export const updateQuestion = async (id, data) => {
    const {title, description, difficulty, tagId, datasetId, dbTableName, solutionSql, expectedOutput} = data;
    const updatedQue = await prisma.question.update({
        where: {id: parseInt(id)},
        data: {
            title,
            description,
            difficulty,
            tagId,
            datasetId: parseInt(datasetId),
            dbTableName,
            solutionSql,
            expectedOutput
        }
    });

    return updatedQue;
}

export const deleteQuestion = async (id) => {
    try {
        await prisma.question.delete({
            where: {id: parseInt(id)}
        })
        return "Deleted";
    } catch(e) {
        throw e;
    }
}

export const getAllDatasets = async () => {
    return prisma.dataset.findMany({
        orderBy: { name: "asc" }
    });
};

export const createDataset = async (data) => {
    const { name, description, initSql } = data;
    return prisma.dataset.create({
        data: { name, description, initSql }
    });
};

export const updateDataset = async (id, data) => {
    const { name, description, initSql } = data;
    return prisma.dataset.update({
        where: { id: parseInt(id) },
        data: { name, description, initSql }
    });
};

export const deleteDataset = async (id) => {
    return prisma.dataset.delete({
        where: { id: parseInt(id) }
    });
};

export const createTag = async (name) => {
    return prisma.tag.create({
        data: { name }
    });
};

export const updateTag = async (id, name) => {
    return prisma.tag.update({
        where: { id: parseInt(id) },
        data: { name }
    });
};

export const deleteTag = async (id) => {
    return prisma.tag.delete({
        where: { id: parseInt(id) }
    });
};

