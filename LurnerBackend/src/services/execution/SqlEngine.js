import { Worker } from 'node:worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, 'SqlWorker.mjs');

class SafeWorkerPool {
    constructor(workerPath, size) {
        this.workerPath = workerPath;
        this.size = size;
        this.pool = [];
        this.queue = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createWorker());
        }
    }

    createWorker() {
        const worker = new Worker(this.workerPath);
        worker.isBusy = false;
        worker.activeReject = null;

        worker.on('exit', (code) => {
            // If the worker had a pending task reject function, reject it (crashed or terminated)
            if (worker.activeReject) {
                worker.activeReject(new Error("Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!"));
            }
            
            // Remove the terminated worker and replace it with a new one
            this.pool = this.pool.filter(w => w !== worker);
            this.pool.push(this.createWorker());
            this.processQueue();
        });

        worker.on('error', (err) => {
            console.error("Worker error encountered:", err);
        });

        return worker;
    }

    processQueue() {
        if (this.queue.length === 0) return;
        const availableWorker = this.pool.find(w => !w.isBusy);
        if (!availableWorker) return;

        const { task, resolve, reject, timeoutMs } = this.queue.shift();
        availableWorker.isBusy = true;
        availableWorker.activeReject = reject;

        let timeout = setTimeout(() => {
            availableWorker.terminate();
        }, timeoutMs);

        const onMessage = (result) => {
            clearTimeout(timeout);
            availableWorker.off('message', onMessage);
            availableWorker.off('error', onError);
            availableWorker.isBusy = false;
            availableWorker.activeReject = null;
            
            resolve(result);
            this.processQueue();
        };

        const onError = (err) => {
            clearTimeout(timeout);
            availableWorker.off('message', onMessage);
            availableWorker.off('error', onError);
            availableWorker.isBusy = false;
            availableWorker.activeReject = null;
            
            reject(err);
            this.processQueue();
        };

        availableWorker.on('message', onMessage);
        availableWorker.on('error', onError);
        availableWorker.postMessage(task);
    }

    run(task, timeoutMs = 500) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject, timeoutMs });
            this.processQueue();
        });
    }
}

// Instantiate pool with size matching CPU core count (minimum 2)
const poolSize = Math.max(2, os.cpus().length);
const pool = new SafeWorkerPool(workerPath, poolSize);

export async function executeSql(initSql, userCode) {
    const startTime = Date.now();
    try {
        const response = await pool.run({ initSql, userCode }, 500);
        const executionTimeMs = Date.now() - startTime;

        if (response.success) {
            return {
                data: response.data,
                executionTimeMs
            };
        } else {
            throw {
                error: response.error,
                executionTimeMs
            };
        }
    } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        
        // Re-throw our structured error from inside the try block
        if (err && err.error !== undefined) {
            throw err;
        }
        
        throw {
            error: err.message || "Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!",
            executionTimeMs
        };
    }
}
