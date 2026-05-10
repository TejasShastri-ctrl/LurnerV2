import Piscina from 'piscina';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a single Piscina pool instance.
const pool = new Piscina({
    filename: path.join(__dirname, 'SqlWorker.mjs'),
    minThreads: 2,
    maxThreads: Math.max(4, os.cpus().length * 1.5),
    maxQueue: 100, // Maximum number of tasks waiting in the queue
    idleTimeout: 30000 // 30 seconds idle timeout for threads
});

/**
 * Executes SQL in an isolated Worker Thread using SQLite via Piscina.
 */
export async function executeSql(initSql, userCode) {
    const startTime = Date.now();
    
    // Piscina supports AbortController for terminating tasks
    const ac = new AbortController();
    
    // Set a security timeout (500ms)
    // Aborting the task will also try to terminate the thread executing it, which is useful for infinite loops.
    const timeout = setTimeout(() => {
        ac.abort(new Error("Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!"));
    }, 500);

    try {
        const response = await pool.run(
            { initSql, userCode },
            { signal: ac.signal }
        );
        clearTimeout(timeout);

        const executionTimeMs = Date.now() - startTime;

        if (response.success) {
            return {
                data: response.data,
                executionTimeMs
            };
        } else {
            // Safe reject format expected by controller
            throw {
                error: response.error,
                executionTimeMs
            };
        }
    } catch (err) {
        clearTimeout(timeout);
        const executionTimeMs = Date.now() - startTime;
        
        // Handle Piscina AbortError or our custom abort message
        if (err.name === 'AbortError' || (err.message && err.message.includes('Timed Out'))) {
             throw {
                 error: "Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!",
                 executionTimeMs
             };
        }
        
        // Re-throw our structured error from inside the try block
        if (err.error !== undefined) {
            throw err;
        }

        // Generic fallback error
        throw {
            error: err.message || "Unknown execution error",
            executionTimeMs
        };
    }
}
