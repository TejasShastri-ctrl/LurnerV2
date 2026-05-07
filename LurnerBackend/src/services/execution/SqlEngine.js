import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Executes SQL in an isolated Worker Thread using SQLite.
 */
export function executeSql(initSql, userCode) {
    return new Promise((resolve, reject) => {
        let settled = false;

        const safeReject = (err) => {
            if (settled) return;
            settled = true;
            reject(err);
        };

        const safeResolve = (data) => {
            if (settled) return;
            settled = true;
            resolve(data);
        };

        // 1. Create a worker pointing to our SqlWorker.mjs in the same directory
        const worker = new Worker(path.join(__dirname, "SqlWorker.mjs"));

        // 2. Set a security timeout (200ms)
        const timeout = setTimeout(() => {
            worker.terminate();
            safeReject(new Error("Query Timed Out (Max 200ms). Your query is too heavy for the sandbox!"));
        }, 200);

        // 3. Send data to the worker
        const startTime = Date.now();
        worker.postMessage({ initSql, userCode });

        // 4. Listen for results
        worker.on("message", (response) => {
            const executionTimeMs = Date.now() - startTime;
            clearTimeout(timeout);
            worker.terminate();
            if (response.success) {
                safeResolve({
                    data: response.data,
                    executionTimeMs
                });
            } else {
                safeReject({
                    error: response.error,
                    executionTimeMs
                });
            }
        });

        worker.on("error", (error) => {
            clearTimeout(timeout);
            worker.terminate();
            safeReject(error);
        });

        worker.on("exit", (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                safeReject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}
