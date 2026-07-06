Let's look at the SQL Execution Sandbox from the perspective of systems engineering, security, and scalability.

The current sandbox uses Node's built-in DatabaseSync inside a piscina worker pool with a standard JS-based timeout. While this works for basic queries, it has two critical design bottlenecks that will fail under production load or malicious use.

Let's break down the evaluation and trade-offs of the solutions.

Dilemma 1: The Setup Overhead (initSql Execution)
Right now, if a user runs a query, the worker opens a SQLite memory database, runs the full initSql DDL and insert scripts, executes the query, and closes it. As the platform grows, we will introduce larger datasets (e.g., 1,000+ rows to prevent users from hardcoding expected outputs). Running DDLs and insertions on every keystroke run will cause a CPU bottleneck on the server.

Option A: Binary State Caching (Serialization)
The Concept: We spin up a database once for each datasetId, run the initSql, and serialize the memory database state into a binary Buffer. When a user runs a query, we skip the initSql parsing and execution, and deserialize the pre-built buffer directly.
Evaluation:
Pros: Extremely fast sandbox setup. Cuts out SQL parsing and table insertion CPU cycles entirely.
Cons: Node's experimental node:sqlite module does not yet expose SQLite's raw serialization/backup APIs. To achieve this, we would have to migrate the sandbox engine to better-sqlite3 (which supports buffer serialization/deserialization) or implement a custom worker-warming pooling strategy.
Option B: Client-Side WebAssembly (WASM) Execution
The Concept: Run the sandbox directly in the student's browser tab using SQLite compiled to WebAssembly (SQLite WASM). The backend only serves the static database file (or the SQL script) once.
Evaluation:
Pros: Completely offloads query execution CPU/RAM costs from the server. Zero server latency. If the user writes an infinite loop or heavy query, only their browser tab freezes, protecting our hosting costs.
Cons: We cannot trust the client to verify final submissions (users could modify JS to fake a "SUCCESS" payload). We would still need a server-side sandbox for final submissions, but 95% of playground "Runs" are offloaded to the client.
Dilemma 2: Preemptive Aborts & CPU Thread Exhaustion
The current JS-based timeout uses AbortController:

javascript
const timeout = setTimeout(() => {
    ac.abort(new Error("Query Timed Out..."));
}, 500);
In Node.js, thread workers are non-preemptive. If a query blocks inside a native synchronous call (such as SQLite's C++ engine executing a heavy cross-join SELECT * FROM table1, table2, table3), the CPU thread is locked. The JavaScript AbortController will reject the promise wrapper on the main thread, but it cannot force-kill the blocked thread worker until the C-level operation finishes. If a botnet or standard users send multiple heavy queries, all Piscina threads will get locked up, stalling the execution queue for all other users.

Option A: SQLite Progress Handlers
The Concept: SQLite allows registering a progress handler (sqlite3_progress_handler) in C/C++ that periodically halts compilation during query execution to check condition limits.
Evaluation:
Pros: Allows the SQLite engine itself to terminate queries that execute too many virtual machine operations.
Cons: Neither Node's built-in DatabaseSync nor better-sqlite3 provide high-level bindings to easily set up progress handlers or enforce VM instruction limits out of the box.
Option B: Process-Isolated Subprocesses (OS-level Sandboxing)
The Concept: Instead of running queries in thread pools within the same Node process, run each query in a spawned OS subprocess (or a lightweight Docker container/Serverless runner) with strict OS-level resources configured (e.g., ulimit, CPU limits, memory quotas).
Evaluation:
Pros: The OS can preemptively kill a process that exceeds its time or memory limits. Absolutely secure against CPU lockups and memory exhaustion.
Cons: Spawning OS-level processes introduces process boot overhead, increasing response latency to ~50–100ms per run compared to the sub-millisecond latency of thread workers.
What are your thoughts on these paths?
Specifically:

Should we adopt a Hybrid WASM model (client-side WASM for editor playground runs, and server-side worker for submissions)?
Do we stick to server-side execution but swap the sandbox to better-sqlite3 to implement serialized database state caching?