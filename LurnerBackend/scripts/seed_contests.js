import prisma from '../src/config/prisma.js';

async function main() {
    console.log("Seeding contest data...");

    // Clear existing data (optional, but good for fresh seed)
    await prisma.contestSubmission.deleteMany();
    await prisma.contestParticipant.deleteMany();
    await prisma.contestQuestion.deleteMany();
    await prisma.contest.deleteMany();

    const now = new Date();

    // 1. ACTIVE CONTEST
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
                        initSql: "CREATE TABLE employees (id INT, name TEXT, salary INT, dept_id INT); INSERT INTO employees VALUES (1, 'Alice', 100, 1), (2, 'Bob', 200, 1), (3, 'Charlie', 300, 1);",
                        dbTableName: "employees",
                        solutionSql: "SELECT name FROM employees ORDER BY salary DESC LIMIT 3;",
                        expectedOutput: [{ name: "Charlie" }, { name: "Bob" }, { name: "Alice" }]
                    }
                ]
            }
        }
    });

    // 2. UPCOMING CONTEST
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
                        initSql: "CREATE TABLE hierarchy (emp_id INT, manager_id INT);",
                        dbTableName: "hierarchy",
                        solutionSql: "SELECT * FROM hierarchy;",
                        expectedOutput: []
                    }
                ]
            }
        }
    });

    // 3. PAST CONTEST
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
                        initSql: "CREATE TABLE users (id INT, name TEXT); INSERT INTO users VALUES (1, 'Admin');",
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
