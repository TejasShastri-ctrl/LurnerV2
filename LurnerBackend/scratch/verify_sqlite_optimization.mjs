import runSqlWorker from "../src/services/execution/SqlWorker.mjs";

async function runTests() {
    console.log("Starting SQLite Sandbox Caching & Rollback Tests...");

    const initSql = `
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO users (name) VALUES ('Alice'), ('Bob');
    `;

    // Test 1: First run (should initialize the database)
    console.time("First Run (Cold)");
    const res1 = runSqlWorker({ initSql, userCode: "SELECT * FROM users;" });
    console.timeEnd("First Run (Cold)");
    console.log("Res 1:", res1);

    // Test 2: Second run with same initSql (should be extremely fast due to caching)
    console.time("Second Run (Warm/Cached)");
    const res2 = runSqlWorker({ initSql, userCode: "SELECT * FROM users;" });
    console.timeEnd("Second Run (Warm/Cached)");
    console.log("Res 2:", res2);

    // Test 3: Run a write query (should execute and then be rolled back)
    console.time("Third Run (Write Query)");
    const res3 = runSqlWorker({ initSql, userCode: "INSERT INTO users (name) VALUES ('Charlie');" });
    console.timeEnd("Third Run (Write Query)");
    console.log("Res 3:", res3);

    // Test 4: Run SELECT again and verify Charlie does not exist in the results
    const res4 = runSqlWorker({ initSql, userCode: "SELECT * FROM users;" });
    console.log("Res 4 (Verify rollback):", res4);

    const hasCharlie = res4.data.some(u => u.name === 'Charlie');
    if (!hasCharlie && res4.data.length === 2) {
        console.log("SUCCESS: Charlie was successfully rolled back!");
    } else {
        console.error("FAILURE: Charlie persisted in the database!");
    }

    console.log("Tests completed!");
}

runTests().catch(console.error);
