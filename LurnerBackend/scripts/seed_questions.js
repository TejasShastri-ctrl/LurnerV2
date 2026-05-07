import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding database with expanded SQL challenges...");

    // Clear existing data (order matters because of FK constraints)
    await prisma.activityLog.deleteMany();
    await prisma.userQuestionProgress.deleteMany();
    await prisma.friendInvite.deleteMany();
    await prisma.contestParticipant.deleteMany();
    await prisma.contestQuestion.deleteMany();
    await prisma.contest.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.follows.deleteMany();
    await prisma.question.deleteMany();
    await prisma.tag.deleteMany();

    // 1. Create tags
    const tagMap = {};
    const tags = ["SELECT", "AGGREGATION", "FILTERING", "JOINS", "SORTING"];

    for (const name of tags) {
        const tag = await prisma.tag.create({
            data: { name }
        });
        tagMap[name] = tag.id;
    }

    // Shared initSql for most employee-based questions
    const empInitSql = `
        CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER, hire_date TEXT);
        INSERT INTO employees (name, department, salary, hire_date) VALUES 
        ('Alice', 'Engineering', 90000, '2023-01-15'),
        ('Bob', 'Sales', 70000, '2022-11-20'),
        ('Charlie', 'Engineering', 95000, '2023-03-10'),
        ('David', 'Marketing', 65000, '2023-02-01'),
        ('Eve', 'Sales', 72000, '2023-01-20'),
        ('Frank', 'Engineering', 88000, '2022-10-05'),
        ('Grace', 'Marketing', 68000, '2023-04-12');
    `;

    const questions = [
        {
            title: "Employee Roster",
            description: "Retrieve all employee details to verify the current headcount.",
            difficulty: "EASY",
            tagId: tagMap["SELECT"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT * FROM employees",
            expectedOutput: [
                { id: 1, name: "Alice", department: "Engineering", salary: 90000, hire_date: '2023-01-15' },
                { id: 2, name: "Bob", department: "Sales", salary: 70000, hire_date: '2022-11-20' },
                { id: 3, name: "Charlie", department: "Engineering", salary: 95000, hire_date: '2023-03-10' },
                { id: 4, name: "David", department: "Marketing", salary: 65000, hire_date: '2023-02-01' },
                { id: 5, name: "Eve", department: "Sales", salary: 72000, hire_date: '2023-01-20' },
                { id: 6, name: "Frank", department: "Engineering", salary: 88000, hire_date: '2022-10-05' },
                { id: 7, name: "Grace", department: "Marketing", salary: 68000, hire_date: '2023-04-12' }
            ]
        },
        {
            title: "High Earners Only",
            description: "Find all employees who earn more than 80,000.",
            difficulty: "EASY",
            tagId: tagMap["FILTERING"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT * FROM employees WHERE salary > 80000",
            expectedOutput: [
                { id: 1, name: "Alice", department: "Engineering", salary: 90000, hire_date: '2023-01-15' },
                { id: 3, name: "Charlie", department: "Engineering", salary: 95000, hire_date: '2023-03-10' },
                { id: 6, name: "Frank", department: "Engineering", salary: 88000, hire_date: '2022-10-05' }
            ]
        },
        {
            title: "Engineering Budget",
            description: "Calculate the total salary budget for the 'Engineering' department.",
            difficulty: "MEDIUM",
            tagId: tagMap["AGGREGATION"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT SUM(salary) AS total_salary FROM employees WHERE department = 'Engineering'",
            expectedOutput: [{ total_salary: 273000 }]
        },
        {
            title: "Sales Team Alpha",
            description: "Sort all Sales employees by their salary in descending order.",
            difficulty: "MEDIUM",
            tagId: tagMap["SORTING"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT * FROM employees WHERE department = 'Sales' ORDER BY salary DESC",
            expectedOutput: [
                { id: 5, name: "Eve", department: "Sales", salary: 72000, hire_date: '2023-01-20' },
                { id: 2, name: "Bob", department: "Sales", salary: 70000, hire_date: '2022-11-20' }
            ]
        },
        {
            title: "Department Averages",
            description: "Find the average salary for every department.",
            difficulty: "MEDIUM",
            tagId: tagMap["AGGREGATION"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department",
            expectedOutput: [
                { department: "Engineering", avg_salary: 91000 },
                { department: "Sales", avg_salary: 71000 },
                { department: "Marketing", avg_salary: 66500 }
            ]
        },
        {
            title: "Recent Hires",
            description: "Retrieve employees hired after January 1st, 2023.",
            difficulty: "EASY",
            tagId: tagMap["FILTERING"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT * FROM employees WHERE hire_date > '2023-01-01'",
            expectedOutput: [
                { id: 1, name: "Alice", department: "Engineering", salary: 90000, hire_date: '2023-01-15' },
                { id: 3, name: "Charlie", department: "Engineering", salary: 95000, hire_date: '2023-03-10' },
                { id: 4, name: "David", department: "Marketing", salary: 65000, hire_date: '2023-02-01' },
                { id: 5, name: "Eve", department: "Sales", salary: 72000, hire_date: '2023-01-20' },
                { id: 7, name: "Grace", department: "Marketing", salary: 68000, hire_date: '2023-04-12' }
            ]
        },
        {
            title: "Minimum Compensation",
            description: "Identify the name and salary of the lowest-paid employee.",
            difficulty: "EASY",
            tagId: tagMap["AGGREGATION"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT name, salary FROM employees ORDER BY salary ASC LIMIT 1",
            expectedOutput: [{ name: "David", salary: 65000 }]
        },
        {
            title: "The 'A' Team",
            description: "Find all employees whose names start with the letter 'A'.",
            difficulty: "EASY",
            tagId: tagMap["FILTERING"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT * FROM employees WHERE name LIKE 'A%'",
            expectedOutput: [{ id: 1, name: "Alice", department: "Engineering", salary: 90000, hire_date: '2023-01-15' }]
        },
        {
            title: "Projects & People",
            description: "List each employee and the project they are assigned to using a JOIN.",
            difficulty: "HARD",
            tagId: tagMap["JOINS"],
            initSql: `
                CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER);
                CREATE TABLE projects (id INTEGER PRIMARY KEY, title TEXT, emp_id INTEGER);
                INSERT INTO employees (name, dept_id) VALUES ('Alice', 1), ('Bob', 2), ('Charlie', 1);
                INSERT INTO projects (title, emp_id) VALUES ('Lurner API', 1), ('Mobile App', 2), ('Data Sync', 3);
            `,
            dbTableName: "employees",
            solutionSql: "SELECT e.name, p.title FROM employees e JOIN projects p ON e.id = p.emp_id",
            expectedOutput: [
                { name: "Alice", title: "Lurner API" },
                { name: "Bob", title: "Mobile App" },
                { name: "Charlie", title: "Data Sync" }
            ]
        },
        {
            title: "Big Departments",
            description: "Find departments that have more than 2 employees.",
            difficulty: "HARD",
            tagId: tagMap["AGGREGATION"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT department, COUNT(*) as count FROM employees GROUP BY department HAVING COUNT(*) > 2",
            expectedOutput: [{ department: "Engineering", count: 3 }]
        },
        {
            title: "Salary Ranking",
            description: "List all names and salaries, sorted from highest to lowest salary.",
            difficulty: "EASY",
            tagId: tagMap["SORTING"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT name, salary FROM employees ORDER BY salary DESC",
            expectedOutput: [
                { name: "Charlie", salary: 95000 },
                { name: "Alice", salary: 90000 },
                { name: "Frank", salary: 88000 },
                { name: "Eve", salary: 72000 },
                { name: "Bob", salary: 70000 },
                { name: "Grace", salary: 68000 },
                { name: "David", salary: 65000 }
            ]
        },
        {
            title: "Unique Departments",
            description: "Get a unique list of all department names.",
            difficulty: "EASY",
            tagId: tagMap["SELECT"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT DISTINCT department FROM employees",
            expectedOutput: [
                { department: "Engineering" },
                { department: "Sales" },
                { department: "Marketing" }
            ]
        },
        {
            title: "Staff Count",
            description: "How many employees are there in total?",
            difficulty: "EASY",
            tagId: tagMap["AGGREGATION"],
            initSql: empInitSql,
            dbTableName: "employees",
            solutionSql: "SELECT COUNT(*) AS total FROM employees",
            expectedOutput: [{ total: 7 }]
        }
    ];

    for (const q of questions) {
        await prisma.question.create({ data: q });
    }

    console.log(`Seeding complete 🚀 Created ${questions.length} questions.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });