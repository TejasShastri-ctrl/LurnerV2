# SQL Sandbox Execution Architecture Notes

This document captures the architectural trade-offs, bottlenecks, and solutions evaluated for the Lurner SQL execution engine as we scale to support more users and multiple database engines (SQLite, PostgreSQL, MySQL).

---

## Dilemma 1: Setup Overhead (`initSql` Execution)
When a user runs a query, the sandbox historically opens a database in memory, executes the entire setup script (`initSql` DDL and insertions), runs the query, and terminates the database. As datasets grow (e.g., 1,000+ rows), repeating this process on every keystroke run creates a server CPU bottleneck.

### Option A: Binary State Caching (Serialization)
* **The Concept**: Spin up the database once for each dataset template, execute the setup SQL, and serialize the memory database state into a binary buffer. When a user runs a query, skip setup and deserialize this buffer directly.
* **Pros**: Extremely fast sandbox startup; cuts out SQL parsing and table insertion cycles entirely.
* **Cons**: Node's built-in `node:sqlite` module does not support serialization yet. Requires migrating to `better-sqlite3` or maintaining a custom connection warming pool.

### Option B: Client-Side WebAssembly (WASM) Execution
* **The Concept**: Run the sandbox directly in the student's browser tab using SQLite compiled to WebAssembly (SQLite WASM). The backend only serves the static database file or setup script once.
* **Pros**:
  - Offloads query execution CPU/RAM costs from the server entirely.
  - Zero server latency.
  - Infinite loops or heavy queries only freeze the individual user's browser tab.
* **Cons**: We cannot trust the client for final verification/submissions (users could fake a "SUCCESS" API payload). A server-side sandbox is still required for final submissions.

---

## Dilemma 2: Preemptive Aborts & CPU Thread Exhaustion
Thread workers in Node.js are non-preemptive. If a query blocks inside a native synchronous call (such as a heavy SQLite cross-join), the thread is locked. JavaScript's `AbortController` cannot force-kill the native worker until the operation finishes, leading to worker pool starvation.

### Option A: SQLite Progress Handlers
* **The Concept**: Register a progress handler (`sqlite3_progress_handler`) in SQLite that periodically halts compilation during query execution to check condition limits.
* **Pros**: Allows the SQLite engine itself to terminate queries that execute too many virtual machine instructions.
* **Cons**: Node's built-in `node:sqlite` does not expose these progress handlers out of the box.

### Option B: Process-Isolated Subprocesses (OS-level Sandboxing)
* **The Concept**: Run queries in spawned OS subprocesses or isolated container/microservice runners with strict system-level timeouts (`ulimit`, CPU limits, memory quotas).
* **Pros**: The OS can preemptively terminate processes that exceed resource limits, securing the server against CPU lockups and memory exhaustion.
* **Cons**: Spawning OS-level processes introduces process boot overhead, increasing response latency to ~50–100ms per run.

---

## Designing for Multi-Engine Support (PostgreSQL & MySQL)
If we expand Lurner to support Postgres and MySQL in addition to SQLite, client-side WASM sandboxing becomes challenging:
* **PostgreSQL** can run in the browser using **PGlite** (Postgres compiled to WASM), which is highly performant.
* **MySQL** does not have a mature WASM runner, meaning standard client-side execution is not viable.

### Recommended Unified Server-Side Architecture
To support all three engines seamlessly, we can implement a **Database-Level Sandbox Policy**:

1. **Role-Based Isolation**:
   - Establish dedicated read-only database connections with restricted privileges (e.g. `SELECT` only).
2. **Database-Level Timeouts**:
   - **PostgreSQL**: Set a session/connection-level statement timeout:
     ```sql
     SET statement_timeout = 500; -- 500 milliseconds
     ```
   - **MySQL**: Set the maximum execution time limit:
     ```sql
     SET SESSION max_execution_time = 500;
     ```
   - *This forces the database engine itself to abort long-running queries, preventing thread blocking on the Node.js API server.*
3. **Transaction Rollbacks**:
   - Wrap user queries inside standard transaction blocks:
     ```sql
     BEGIN;
     -- [User Query Runs Here]
     ROLLBACK;
     ```
   - This allows users to safely test write commands (like `INSERT`, `UPDATE`, `DELETE`) in their playground without modifying or corrupting the template database state.

### Client Drivers vs. In-Memory Database Engines
A common point of confusion is whether libraries like `pg` or `mysql2` can run local, in-memory databases like SQLite does.

1. **Client Drivers (e.g., `pg`, `mysql2`)**:
   - These are pure communications drivers. They do not contain a database engine; they are simply protocols to talk to a running external database server over TCP/IP.
2. **In-Memory PostgreSQL (`PGlite`)**:
   - For PostgreSQL, we can use **PGlite** (Postgres compiled to WebAssembly/WASM). It runs entirely in-memory inside the Node.js thread process, giving us total isolation per thread without any external server setup, matching the SQLite developer experience.
3. **MySQL Limitations**:
   - MySQL does not have a mature, production-ready WASM compilation or JS-native engine. To run MySQL query validation, we must connect to a running MySQL server (`mysqld`) and use schema-level isolation or transaction-rollback techniques to prevent collisions.

So, worrying about race conditions and during server side execution is not an issue for postgres and sqlite because of their WASM providers but not for MySQL

Better explanation of the clogging problem, why the abortController cannot kill the process and free the worker:
Here is the exact journey of a query in the codebase:

1. The Main Thread initiates the query
In 

LurnerBackend/src/services/execution/SqlEngine.js
:

javascript
// LINE 21: An AbortController is created on the Main Thread
const ac = new AbortController();
// LINE 23: A JavaScript timer is set on the Main Thread for 500ms
const timeout = setTimeout(() => {
    ac.abort(new Error("Query Timed Out..."));
}, 500);
// LINE 28: Piscina sends the query to a Worker Thread
const response = await pool.run(
    { initSql, userCode },
    { signal: ac.signal } // <-- The signal is passed to Piscina
);
2. The Worker Thread executes the query
The task lands in 

LurnerBackend/src/services/execution/SqlWorker.mjs
:

javascript
// LINE 33: SQLite prepares and executes the query
const stmt = cachedDb.prepare(userCode);
// LINE 37: The query starts running
if (isSelect) {
    result = stmt.all();  // <-- DANGER: The thread enters native C++ execution here
}
What happens when a query blocks (e.g., an infinite loop)
Step 1: The Event Loop is Frozen in the Worker
When stmt.all() runs, the worker thread leaves JavaScript execution and enters SQLite's compiled native C++ engine loop.

Because DatabaseSync is a synchronous call, the thread's execution is blocked.
While the query runs, the worker thread's CPU core is at 100% capacity. The JavaScript event loop inside this worker is completely frozen; it cannot check messages, process events, or run any JavaScript timers.
Step 2: The AbortController fails to stop it
After 500ms, the timer on the Main Thread fires:

The Main Thread calls ac.abort().
Piscina's main-thread manager catches the abort event and rejects the promise returned to the client (sending a "Query Timed Out" response).
But the Worker Thread is still running SQLite's C++ code.
Why doesn't the worker stop? JavaScript threads are non-preemptive. You cannot force a running JavaScript thread to stop executing a line of code from the outside. The AbortSignal is just a JavaScript object. SQLite's native C++ engine (stmt.all()) has no knowledge of it and doesn't check it. The worker thread will continue executing that blocked SQL query forever, keeping that CPU core locked at 100% utilization.

Eventually, if a few users submit heavy queries, every worker thread in Piscina gets locked at 100% CPU, and no more queries can be processed.


SQLite has a default maximum recursion limit of 1000 for recursive CTEs, causing them to exit early). This will properly test the 500ms force-kill timeout.


what is something that one does this huh?

---

## Final Decision: Custom Child-Process Pool (The Sandbox Overhaul)

### The Journey and Discovery
1. **Optimization with Savepoint Caching**:
   We initially optimized the `initSql` setup overhead by caching the `DatabaseSync` connection per worker and isolating query runs using SQLite transaction `SAVEPOINT`s (rolling back changes in the `finally` block). This successfully dropped consecutive query run times from 10-50ms+ down to under 1ms.
2. **The Thread-Clogging Vulnerability**:
   We discovered a critical Node.js limitation: `worker.terminate()` cannot preemptively interrupt native C++ code execution (like SQLite's synchronous `stmt.all()` loop). If a student runs an infinite loop or a massive cross-join, the worker thread locks up at 100% CPU forever, eventually starving the Piscina worker pool and clogging the execution queue for all users.
3. **The Solution Choice**:
   We chose to implement a custom **`SafeProcessPool`** using Node's native `child_process.fork()`:
   - **Why and How**: By isolating query execution in separate OS processes instead of threads, the parent process can enforce a strict 500ms execution timeout and call `child.kill('SIGKILL')`. The operating system instantly terminates the process and reclaims the CPU core, regardless of what the native SQLite C++ code is executing.
   - **Pre-warmed Process Management**: To eliminate process startup latency (~30-50ms) for normal runs, the pool maintains pre-warmed idle processes. When a query is terminated, a replacement process is spun up asynchronously in the background.
   - **Result**: Sub-millisecond execution times under normal conditions, combined with absolute protection against CPU starvation attacks.
