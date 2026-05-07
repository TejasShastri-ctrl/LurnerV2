import prisma from '../src/config/prisma.js';

async function check() {
    try {
        const questions = await prisma.question.findMany();
        console.log("Full Questions Data:");
        console.log(JSON.stringify(questions, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

check();
