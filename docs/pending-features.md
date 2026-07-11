These features should be implemented next. Will focus on securing it, UI and other strengthening later down the line.

Social features:
-> Adding users as friends, seeing their status and stats.
-> Inviting friends for 'contests' with AI generated questions on certain topics, or perhaps choosing from a wide array of pre-organized problems.

Global Contest features:
-> Global contests where users can participate, track their history, a leaderboard.
-> Cheating proof and efficient communication between client and server for latency reduction.

AI features(later):
-> Progress tracking and reports
-> SQL lessons, doubt solving and the AI should also provide question to solve, or refer material to read at the right moments or if the user asks




Persistent sandbox(chat history for later):


Architecture Options
Option A — Server-held SQLite file per session
Each sandbox session gets a UUID. The backend creates an actual SQLite file at ./sandboxes/<sessionId>.db. The session is executed in a worker that keeps this file open, or opens/closes it per request (SQLite files are fast to open).

POST /api/sandbox        → create session → { sessionId }
POST /api/sandbox/:id/exec → run SQL on that session's DB file → { results }
DELETE /api/sandbox/:id  → destroy file
Pros: Simple. SQLite files are cheap. Persistence is trivial — it's just a file. No in-memory state to manage across worker processes.
Cons: File cleanup (TTL eviction needed), disk space, and if you go multi-server later, sessions are node-local.

Option B — Session-pinned worker in the pool
The pool assigns a worker to a sessionId and keeps it pinned. That worker's in-memory SQLite is the user's DB. Queries for that session always route to the same worker.

Pros: Zero disk I/O, fast.
Cons: Each pinned session eats a worker indefinitely. With N concurrent users you need N workers. Pool can starve. Memory management is tricky. Worker crashes = session lost silently.

Option C — Better-fit approach: SQLite file + a new dedicated execution path
Keep the current pool completely unchanged for the Q&A engine. Create a separate, simpler execution path for sandbox sessions — no pool, no SIGKILL-on-timeout strategy. Instead:

POST /api/sandbox — create a session record in DB (SandboxSession model), create a SQLite file at a known path
POST /api/sandbox/:id/exec — open the file, run the SQL, close it, return results. No rollback. No savepoint. Mutations persist.
Session TTL — a cron or lazy-cleanup strategy: delete files older than N hours
Hard cap — a user can only have 1 active sandbox at a time



My Recommendation: Option C
It's the right split because:

Zero coupling to the Q&A engine — different route, different service file, different execution semantics
SQLite files are durable — if the server restarts, sessions survive (unlike in-memory workers)
No pool starvation — sandbox queries aren't racing against Q&A submissions
Simple to reason about — the sandboxed query just opens a file, runs, closes. Timeout can be a simple Promise.race — no SIGKILL complexity needed since there's no shared pool to protect


How This Fits the AI Learning Vision
With a persistent sandbox, the AI feature opens up meaningfully:

AI creates a schema for the user — it generates a CREATE TABLE + INSERT init script based on what topic you're learning, executes it in the user's sandbox session
User experiments freely — they can INSERT, UPDATE, make mistakes, see the real effects
AI observes the session's query history — you pass the last N queries + their results to Gemini, it gives contextual feedback ("you're selecting before you've grouped — try this")
The sandbox is truly decoupled — it never touches Submission, ActivityLog, or the Q&A dataset infrastructure
This also avoids the premature AI-report concern you raised — the sandbox is a separate interaction surface with its own context. The report-quality work can happen later once you know what data the sandbox actually generates.

Questions Before We Design Further
A few things worth aligning on before touching any code:

Scope of SQL allowed in sandbox? The Q&A engine only allows SELECT (DML is rolled back). Sandbox presumably needs CREATE, INSERT, UPDATE, DELETE, DROP. Should DROP TABLE be allowed (user can nuke their own DB)?

Session lifecycle? Should sessions be explicitly named and persistent ("my orders practice DB"), or ephemeral (auto-expire after 2h of inactivity)?

How does the AI interact with it? Is it a chat panel alongside the sandbox editor, where the AI can suggest and auto-run SQL? Or advisory only (user types, AI comments)?

One sandbox per user or multiple? Multiple named sessions ("JOINs practice", "Aggregations playground") would be nice UX, but adds management complexity.

Those answers will shape the data model and the frontend surface significantly. What's your thinking?