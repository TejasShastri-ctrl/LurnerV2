import { DatabaseSync } from "node:sqlite";


//! Not truly a 'worker' anymore. Ts a chilld process now mounted by parent using fork
/**
 * SQL Worker Thread (Piscina Version)
 * Uses Node.js 22+ built-in sqlite driver for maximum stability in ESM.
 */

let cachedDb = null;
let cachedInitSql = null;

export default function ({ initSql, userCode }) {
    try {
        if (!cachedDb || cachedInitSql !== initSql) {
            if (cachedDb) {
                try {
                    cachedDb.close();
                } catch (e) {
                    console.error("Error closing cached database:", e);
                }
            }
            cachedDb = new DatabaseSync(":memory:");
            if (initSql) {
                cachedDb.exec(initSql);
            }
            cachedInitSql = initSql;
        }

        // Use a savepoint to isolate this query's execution
        cachedDb.exec("SAVEPOINT lurner_sandbox;");

        const stmt = cachedDb.prepare(userCode);
        
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

        // send res to main thrd
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (cachedDb) {
            try {
                // Rollback and release the savepoint to restore database state
                cachedDb.exec("ROLLBACK TO lurner_sandbox;");
                cachedDb.exec("RELEASE lurner_sandbox;");
            } catch (err) {
                // If savepoint was not created or already rolled back, fail silently
            }
        }
    }
}
