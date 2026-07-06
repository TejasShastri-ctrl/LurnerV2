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