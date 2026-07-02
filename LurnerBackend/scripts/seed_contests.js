import prisma from '../src/config/prisma.js';

async function main() {
    console.log("Seeding contest data...");

    // Clear existing data (optional, but good for fresh seed)
    await prisma.contestSubmission.deleteMany();
    await prisma.contestParticipant.deleteMany();
    await prisma.contestQuestion.deleteMany();
    await prisma.contest.deleteMany();

    const now = new Date();

    // 1. Create Datasets for contests
    const topEarnersDataset = await prisma.dataset.create({
        data: {
            name: "Top Earners Contest DB",
            description: "Database representing employees and salaries for the weekend sprint.",
            initSql: "CREATE TABLE employees (id INT, name TEXT, salary INT, dept_id INT); INSERT INTO employees VALUES (1, 'Alice', 100, 1), (2, 'Bob', 200, 1), (3, 'Charlie', 300, 1);"
        }
    });

    const hierarchyDataset = await prisma.dataset.create({
        data: {
            name: "Hierarchy Contest DB",
            description: "Database representing organization hierarchy for the Mahakumbh championship.",
            initSql: "CREATE TABLE hierarchy (emp_id INT, manager_id INT);"
        }
    });

    const usersDataset = await prisma.dataset.create({
        data: {
            name: "Basic Users Contest DB",
            description: "Database containing users table for warmup practice.",
            initSql: "CREATE TABLE users (id INT, name TEXT); INSERT INTO users VALUES (1, 'Admin');"
        }
    });

    // 2. ACTIVE CONTEST
    await prisma.contest.create({
        data: {
            title: "Weekend SQL Sprint",
            description: "A fast-paced competition to test your aggregate functions and window function knowledge.",
            startTime: new Date(now.getTime() - 1000 * 60 * 30), // Started 30 mins ago
            endTime: new Date(now.getTime() + 1000 * 60 * 90),   // Ends in 90 mins
            questions: {
                create: [
                    {
                        order: 0,
                        title: "Find Top Earners",
                        description: "Find the top 3 earners in each department using window functions.",
                        difficulty: "MEDIUM",
                        datasetId: topEarnersDataset.id,
                        dbTableName: "employees",
                        solutionSql: "SELECT name FROM employees ORDER BY salary DESC LIMIT 3;",
                        expectedOutput: [{ name: "Charlie" }, { name: "Bob" }, { name: "Alice" }]
                    }
                ]
            }
        }
    });

    // 3. UPCOMING CONTEST
    await prisma.contest.create({
        data: {
            title: "Global Mahakumbh Championship",
            description: "The ultimate test. Survive complex JOINs, CTEs, and recursive queries.",
            startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24), // Starts tomorrow
            endTime: new Date(now.getTime() + 1000 * 60 * 60 * 48),   // Ends in 2 days
            questions: {
                create: [
                    {
                        order: 0,
                        title: "Recursive Employee Hierarchy",
                        description: "Use a recursive CTE to find the management chain for a specific employee.",
                        difficulty: "HARD",
                        datasetId: hierarchyDataset.id,
                        dbTableName: "hierarchy",
                        solutionSql: "SELECT * FROM hierarchy;",
                        expectedOutput: []
                    }
                ]
            }
        }
    });

    // 4. PAST CONTEST
    await prisma.contest.create({
        data: {
            title: "Beginner SQL Warmup",
            description: "An archived contest designed for absolute beginners to practice basic SELECT and WHERE clauses.",
            startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7), // Started a week ago
            endTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6),   // Ended 6 days ago
            questions: {
                create: [
                    {
                        order: 0,
                        title: "Select All Users",
                        description: "Return all records from the users table.",
                        difficulty: "EASY",
                        datasetId: usersDataset.id,
                        dbTableName: "users",
                        solutionSql: "SELECT * FROM users;",
                        expectedOutput: [{ id: 1, name: "Admin" }]
                    }
                ]
            }
        }
    });

    console.log("Contest seeding complete! You can now check the Arena UI.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
