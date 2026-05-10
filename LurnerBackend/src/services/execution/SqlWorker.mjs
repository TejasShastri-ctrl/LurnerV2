import { DatabaseSync } from "node:sqlite";

/**
 * SQL Worker Thread (Piscina Version)
 * Uses Node.js 22+ built-in sqlite driver for maximum stability in ESM.
 */

export default function ({ initSql, userCode }) {
    // Open a fresh in-memory database using the built-in node:sqlite module
    const db = new DatabaseSync(":memory:");
    
    try {
        if (initSql) {
            db.exec(initSql);
        }
        const stmt = db.prepare(userCode);

        // 3. Execute
        // DatabaseSync.prepare doesn't have .reader, but stmt.all() works for SELECT
        // and stmt.run() works for INSERT/UPDATE/DELETE.
        const isSelect = userCode.trim().toLowerCase().startsWith("select");
        
        let result;
        if (isSelect) {
            result = stmt.all();
        } else {
            const info = stmt.run();
            result = { affectedRows: info.changes };
        }

        // 4. Send result back to main thread
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
}
