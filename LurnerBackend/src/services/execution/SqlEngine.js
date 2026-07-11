import { fork } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, 'SqlWorker.mjs');

class SafeProcessPool {
    constructor(workerPath, size) {
        this.workerPath = workerPath;
        this.size = size;
        this.pool = [];
        this.queue = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createProcess());
        }
    }

    createProcess() {
        // Spawn the child process with IPC enabled and standard IO inherited
        const child = fork(workerPath, [], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
        child.isBusy = false;
        child.activeReject = null;

        child.on('exit', (code, signal) => {
            // If the child was busy and had an active reject function, it timed out or crashed
            if (child.activeReject) {
                child.activeReject(new Error("Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!"));
            }

            // Remove the terminated process from the pool
            this.pool = this.pool.filter(p => p !== child);
            // Replace with a new pre-warmed process
            this.pool.push(this.createProcess());
            this.processQueue();
        });

        child.on('error', (err) => {
            console.error("Child Process error:", err);
        });

        return child;
    }

    processQueue() {
        if (this.queue.length === 0) return;
        const availableProcess = this.pool.find(p => !p.isBusy);
        if (!availableProcess) return;

        const { task, resolve, reject, timeoutMs } = this.queue.shift();
        availableProcess.isBusy = true;
        availableProcess.activeReject = reject;

        let timeout = setTimeout(() => {
            // Kill the process immediately with SIGKILL
            availableProcess.kill('SIGKILL');
        }, timeoutMs);

        const onMessage = (result) => {
            clearTimeout(timeout);
            availableProcess.off('message', onMessage);
            availableProcess.isBusy = false;
            availableProcess.activeReject = null;

            resolve(result);
            this.processQueue();
        };

        availableProcess.on('message', onMessage);
        availableProcess.send(task);
    }

    run(task, timeoutMs = 500) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject, timeoutMs });
            this.processQueue();
        });
    }
}

// Instantiate pool size matching CPU core count (minimum 2)
const poolSize = Math.max(2, os.cpus().length);
const pool = new SafeProcessPool(workerPath, poolSize);

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

        // Re-throw structured errors from inside the try block
        if (err && err.error !== undefined) {
            throw err;
        }

        throw {
            error: err.message || "Query Timed Out (Max 500ms). Your query is too heavy for the sandbox!",
            executionTimeMs
        };
    }
}
