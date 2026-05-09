# SQL Execution Engine: Scalability & Security Architecture

## The Problem: The Danger of Unrestricted Worker Threads

Currently, the SQL execution engine spins up a new `worker_thread` for every incoming query. While each query is short-lived (capped at 200ms), **the act of creating a worker thread is memory and CPU intensive**. 

Each worker thread boots up an isolated V8 JavaScript engine, consuming ~10MB to 30MB of RAM. If an attacker bypasses the frontend and sends 1,000 requests simultaneously:
1. Node.js attempts to spawn 1,000 threads.
2. The server instantly requests ~20GB of RAM.
3. The server crashes (Out of Memory) before the 200ms timeouts can even trigger.

## The Solution: A Two-Phase Defense Strategy

To make the architecture robust against both accidental spam and malicious botnets, we implement a two-layered defense: User Rate Limiting and a Global Worker Pool.

---

### Phase 1: User Rate Limiting (The First Line of Defense)

We restrict how often a single IP address can hit the execution endpoints. This prevents a single user from accidentally or intentionally spamming the server.

**Implementation Details:**
- **Library:** `express-rate-limit`
- **Setup:**
  ```javascript
  import rateLimit from 'express-rate-limit';

  const submissionLimiter = rateLimit({
    windowMs: 2000, // 2 seconds
    max: 1, // Limit each IP to 1 request per 2 seconds
    message: { error: "You are submitting too fast. Please wait a moment." },
  });

  router.post('/submit', submissionLimiter, submitHandler);
  router.post('/execute', submissionLimiter, executeHandler);
  ```

---

### Phase 2: Global Worker Pool (The Server Protector)

Instead of manually instantiating workers, we use a worker pool. A worker pool keeps a fixed maximum number of threads alive. If more requests come in than there are available threads, the pool automatically queues them.

**Implementation Details:**
- **Library:** `piscina` (The standard Node.js worker pool library)
- **Configuration Strategy:**
  - `minThreads`: Keep a baseline number of threads (e.g., 5) warm and ready at all times for zero-latency execution.
  - `maxThreads`: Set a hard ceiling (e.g., 20) to ensure the server never runs out of RAM.
  - `idleTimeout`: If traffic spikes cause the pool to scale up to 20 threads, it will automatically kill the extra threads after they sit idle for a defined period (e.g., 30s), scaling back down to the baseline.

**Example Code (`SqlEngine.js` Refactor):**
```javascript
import Piscina from 'piscina';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize the global pool
const sqlPool = new Piscina({
  filename: path.join(__dirname, 'SqlWorker.mjs'),
  minThreads: 5,         // Keep 5 workers warm
  maxThreads: 20,        // Cap at 20 concurrent threads to prevent OOM
  idleTimeout: 30000     // Scale down after 30 seconds of inactivity
});

export async function executeSql(initSql, userCode) {
    const startTime = Date.now();
    
    try {
        // Run the task on the pool with a strict timeout
        // If 20 threads are busy, Piscina automatically queues this task!
        const response = await sqlPool.run(
            { initSql, userCode }, 
            { signal: AbortSignal.timeout(200) } // 200ms safety timeout
        );
        
        const executionTimeMs = Date.now() - startTime;
        
        if (response.success) {
            return { data: response.data, executionTimeMs };
        } else {
            return Promise.reject({ error: response.error, executionTimeMs });
        }
    } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        if (err.name === 'AbortError') {
             return Promise.reject({ error: "Query Timed Out (Max 200ms).", executionTimeMs });
        }
        return Promise.reject({ error: err.message, executionTimeMs });
    }
}
```

## Summary
By combining `express-rate-limit` with `piscina`, the system achieves:
1. **Low Latency:** Warm threads execute queries instantly.
2. **Auto-Scaling:** Threads scale up to meet demand.
3. **Ironclad Stability:** The hard limit of `maxThreads` guarantees the server will never crash due to thread-induced RAM exhaustion, gracefully queuing excess requests instead.
