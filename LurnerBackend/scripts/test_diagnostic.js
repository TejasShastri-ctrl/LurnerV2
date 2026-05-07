

const BASE_URL = 'http://localhost:3000/api';

/**
 * This script tests the new SQL Diagnostic Engine by sending 
 * intentionally incorrect queries and observing the structural feedback.
 */
async function testDiagnostics() {
    console.log("🚀 Starting SQL Diagnostic Test...\n");

    // 1. Login to get a token
    console.log("🔑 Logging in...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'tejas@mail.com', password: 'password123' })
    });
    const { token } = await loginRes.json();

    if (!token) {
        console.error("❌ Login failed. Make sure you've run 'npm run seed' and the server is running.");
        return;
    }

    // 2. Fetch questions
    const questionsRes = await fetch(`${BASE_URL}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const questions = await questionsRes.json();

    // 3. Test Scenarios
    const scenarios = [
        {
            qTitle: "Engineering Budget",
            name: "Scenario A: Missing WHERE clause (Structural Mismatch)",
            sql: "SELECT SUM(salary) AS total_salary FROM employees"
        },
        {
            qTitle: "Engineering Budget",
            name: "Scenario B: Missing Aggregation (GROUP BY/SUM mismatch)",
            sql: "SELECT salary FROM employees WHERE department = 'Engineering'"
        },
        {
            qTitle: "Engineering Budget",
            name: "Scenario C: Wrong Table name",
            sql: "SELECT * FROM users"
        },
        {
            qTitle: "The 'A' Team",
            name: "Scenario D: Explicit columns vs Wildcard (Should NOT mismatch columns)",
            sql: "SELECT id, name, salary, hire_date, department FROM employees WHERE department = 'Engineering'"
        }
    ];

    for (const scenario of scenarios) {
        const q = questions.find(x => x.title === scenario.qTitle);
        if (!q) {
            console.error(`❌ Could not find question: ${scenario.qTitle}`);
            continue;
        }

        console.log(`--- ${scenario.name} ---`);
        console.log(`Question: ${q.title}`);
        console.log(`SQL: ${scenario.sql}`);

        const res = await fetch(`${BASE_URL}/submissions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                sql: scenario.sql, 
                questionId: q.id 
            })
        });

        const data = await res.json();
        console.log("RAW DATA:", JSON.stringify(data, null, 2));
        
        console.log("Status:", data.status);
        console.log("Is Correct:", data.isCorrect);
        
        if (data.diagnostic) {
            console.log("Diagnostic Feedback:");
            if (data.diagnostic.mismatches && data.diagnostic.mismatches.length > 0) {
                data.diagnostic.mismatches.forEach(m => {
                    console.log(`  [${m.severity}] ${m.type}: ${m.message}`);
                });
            } else if (data.diagnostic.error) {
                console.log(`  ❌ Error: ${data.diagnostic.error}`);
            } else {
                console.log("  ✅ No structural mismatches found (Logic error in result set only).");
            }
        } else {
            console.log("  ⚠️ No diagnostic data returned.");
        }
        console.log("\n");
    }
}

testDiagnostics();
