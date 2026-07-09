import { executeSql } from "../src/services/execution/SqlEngine.js";

async function testPool() {
    console.log("Starting SafeWorkerPool Clogging & Recovery Verification Tests...");

    const initSql = `
        CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO test (name) VALUES 
        ('Alice'), ('Bob'), ('Charlie'), ('David'), ('Eva'),
        ('Frank'), ('Grace'), ('Hannah'), ('Ivan'), ('Jack');
    `;

    // 1. Run a normal quick query
    try {
        console.time("Normal Query Time");
        const res = await executeSql(initSql, "SELECT * FROM test;");
        console.timeEnd("Normal Query Time");
        console.log("Normal Query Result count:", res.data.length);
    } catch (err) {
        console.error("Normal Query Failed:", err);
    }

    // 2. Run a blocking query: cross-joining the 10-row table 10 times (10^10 = 10 billion rows)
    const heavyQuery = `
        SELECT * FROM 
        test a, test b, test c, test d, test e, 
        test f, test g, test h, test i, test j;
    `;

    try {
        console.log("\nExecuting heavy cross-join query (timeout expected in 500ms)...");
        console.time("Heavy Query Time");
        const res = await executeSql(initSql, heavyQuery);
        console.timeEnd("Heavy Query Time");
        console.error("FAILURE: Heavy query completed instead of timing out! Result count:", res.data.length);
    } catch (err) {
        console.timeEnd("Heavy Query Time");
        console.log("Expected Timeout Error Received:", err);
    }

    // 3. Immediately run another normal quick query to verify pool recovery and that threads are not clogged
    try {
        console.log("\nExecuting quick query to verify pool recovery...");
        console.time("Recovery Query Time");
        const res = await executeSql(initSql, "SELECT * FROM test;");
        console.timeEnd("Recovery Query Time");
        console.log("Recovery Query Result (Success):", res.data.length, "rows");
        console.log("\nSUCCESS: Worker pool successfully recovered and processed query!");
    } catch (err) {
        console.error("FAILURE: Recovery Query Failed:", err);
    }

    console.log("\nTests finished!");
    process.exit(0);
}

testPool().catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
});
