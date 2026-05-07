import { parentPort } from "worker_threads";
import { DatabaseSync } from "node:sqlite";

/**
 * SQL Worker Thread (Native Version)
 * Uses Node.js 22+ built-in sqlite driver for maximum stability in ESM.
 */

process.on("uncaughtException", (err) => {
    console.error("WORKER CRASH:", err);
    process.exit(1);
});

parentPort.on("message", ({ initSql, userCode }) => {
    // Open a fresh in-memory database using the built-in node:sqlite module
    const db = new DatabaseSync(":memory:");
    
    try {
        // 1. Initialize schema and mock data
        if (initSql) {
            db.exec(initSql);
        }

        // 2. Prepare user query
        const stmt = db.prepare(userCode);

        console.log("USER TYPED THE CODE : ", userCode);

        // 3. Execute
        // DatabaseSync.prepare doesn't have .reader, but stmt.all() works for SELECT
        // and stmt.run() works for INSERT/UPDATE/DELETE.
        // We'll try to detect if it's a SELECT query.
        const isSelect = userCode.trim().toLowerCase().startsWith("select");
        
        let result;
        if (isSelect) {
            result = stmt.all();
        } else {
            const info = stmt.run();
            result = { affectedRows: info.changes };
        }

        // 4. Send result back to main thread
        parentPort.postMessage({ success: true, data: result });
    } catch (error) {
        parentPort.postMessage({ success: false, error: error.message });
    } finally {
        db.close();
    }
});
