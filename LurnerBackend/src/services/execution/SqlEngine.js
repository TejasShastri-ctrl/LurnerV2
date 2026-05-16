import Piscina from 'piscina';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// singleton worker pool
const pool = new Piscina({
    filename: path.join(__dirname, 'SqlWorker.mjs'),
    minThreads: 2,
    maxThreads: Math.max(4, os.cpus().length * 1.5),
    maxQueue: 100,
    idleTimeout: 30000
});

export async function executeSql(initSql, userCode) {
    const startTime = Date.now();
    
    // piscina supports AbortController
    const ac = new AbortController();

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
            // safe reject format the controller expects
            throw {
                error: response.error,
                executionTimeMs
            };
        }
    } catch (err) {
        clearTimeout(timeout);
        const executionTimeMs = Date.now() - startTime;
        
        // custom error throwing karr
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
        // generic
        throw {
            error: err.message || "Unknown execution error",
            executionTimeMs
        };
    }
}
