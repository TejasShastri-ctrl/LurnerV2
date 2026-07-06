# Architectural Audit & System Improvement Plan

This document provides a comprehensive audit of the **Lurner** platform. It identifies the "make-do" shortcuts in the current codebase (both frontend and backend) and establishes a clear roadmap to transition them into highly optimized, secure, and premium features.

---

## 1. Frontend Architecture & Client State Management

### Current State
*   **Routing & Structure**: Client is a React SPA powered by Vite and React Router (`App.jsx`).
*   **Monolithic Pages**: Major page views like [ContestWorkspace.jsx](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBegin/src/pages/ContestWorkspace.jsx) (720+ lines) and `Admin.jsx` mix UI structure, state declarations, API logic, Monaco editor setup, timer logic, and infraction tracking in a single file.
*   **API Layer**: REST calls are grouped in [api.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBegin/src/api/api.js) using native `fetch` wrappers that inject tokens manually.

### The "Make-Do" / Incomplete Aspects
1.  **No Server-State Caching**: Every navigation to the Questions dashboard, Contests page, or Leaderboards fires blocking, synchronous REST requests. This causes UI flickering, empty state transitions, and heavy redundant database reads on the backend.
2.  **Weak API Resiliency**: Native `fetch` is used without automatic request retries, global request cancellation (causing potential memory leaks on component unmount), or token refresh interceptors.
3.  **Brittle Error Handling**: Response checking is done manually. Non-JSON responses (such as a 502 Bad Gateway HTML page from nginx) will crash the JSON parser inside the client-side API wrappers.
4.  **UI Layout Inconsistencies**: Loading states use basic text strings ("Loading...") instead of professional animated skeletons, and visual feedback lacks micro-interactions.

### The Ideal / Polished Implementation
*   **TanStack Query (React Query)**: Replace standard local state fetches with React Query hooks. This provides automatic client-side caching, background synchronization, and optimistic UI updates for instant interaction response times.
*   **Axios HTTP Client with Interceptors**: Refactor the API layer with an Axios client configured with:
    - An request interceptor to automatically inject authorization headers.
    - A response interceptor to handle token refreshes on `401 Unauthorized` errors.
    - Unified error parsing to present user-friendly error toast alerts.
*   **Component Modularization**: Break down monolithic workspace layouts into reusable, scoped presentation components (e.g., `EditorPane`, `ResultTabs`, `WorkspaceHeader`).
*   **Enhanced UI/UX Tokens**: Implement modern visual patterns:
    - CSS-based glassmorphic containers.
    - Tailored skeleton loaders matching the exact shape of incoming lists.
    - Smooth framer-motion transitions for route changes.

---

## 2. Authentication & Session Management

### Current State
*   **Endpoints**: User login and registration use standard hashing via `bcryptjs` and generate JWT tokens.
*   **Auth Middleware**: The backend [auth.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/middleware/auth.js) middleware decodes the JWT on every request, but then performs a PostgreSQL check (`prisma.user.findUnique`) to verify the user exists before passing execution to the controller.

### The "Make-Do" / Incomplete Aspects
1.  **Database Query Bottleneck**: Querying PostgreSQL on every single API request defeats the benefit of stateless JWTs. Under active editor usage (e.g. running queries every 2 seconds during a sprint), the database will spend significant resources performing redundant user checks.
2.  **XSS Vulnerability (LocalStorage)**: Storing the JWT access token in `localStorage` leaves it vulnerable to script-injection (XSS) attacks. Any malicious third-party dependency could steal the session token.
3.  **No Session Refresh Mechanisms**: The token expires abruptly, locking the user out mid-session without automatically re-authenticating.

### The Ideal / Polished Implementation
*   **True Stateless Authentication**: Verify and trust the token payload cryptographically without performing DB calls on standard endpoints. For queries requiring user status, cache active session profiles in memory (e.g. Redis) or add roles/metadata directly to the JWT payload.
*   **HttpOnly Cookies**: Store access tokens and refresh tokens in secure, `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. Client-side JavaScript will have zero access to session tokens, protecting them from XSS.
*   **Refresh Token Rotation**: Implement short-lived access tokens (e.g., 15 minutes) and longer-lived refresh tokens (e.g., 7 days). Store the refresh token in a database table or Redis cache and rotate it on every refresh call to detect and prevent reuse attacks.

---

## 3. Database Architecture & Migrations

### Current State
*   **ORM**: Prisma ORM with a PostgreSQL target.
*   **Schemas**: Contains models for `Question`, `Dataset`, `Submission`, `Contest`, and `UserQuestionProgress`.
*   **State**: The database migrations folder was recently brought back in sync with the schema after developers bypassed it using `npx prisma db push`.

### The "Make-Do" / Incomplete Aspects
1.  **Missing Indexes**: Important foreign keys (e.g., `datasetId` in `Question` and `ContestQuestion`, or `userId`/`questionId` in `Submission`, `ActivityLog`, and `UserQuestionProgress`) do not have custom indices defined. Under high submissions volume, dashboard telemetry queries will trigger full-table scans.
2.  **No Soft Deletes**: Deleting a question, dataset, or tag directly executes a raw SQL `DELETE`. This either breaks foreign key integrity or recursively deletes historic submissions and metrics, skewing telemetry.
3.  **Dev/Prod Drift Risk**: There are no verification steps in the codebase to prevent developers from making changes directly via `db push` on main branches, risking database corruption during production deployments.

### The Ideal / Polished Implementation
*   **Optimized Composite Indexes**: Define indexing strategies in `schema.prisma` targeting lookup-heavy filters:
    - Indexes on `userId` and `questionId` for submission logs.
    - Composite indexes on `userId` + `contestId` for quick leaderboard updates.
*   **Soft Delete Lifecycle**: Introduce a `deletedAt` field and implement a Prisma middleware that automatically filters out deleted items from queries, preserving historic logs for analytics.
*   **Strict Migration CI Checks**: Setup a validation hook in the repository's git commit or CI pipeline to run `prisma migrate diff` to block any commit where the Prisma schema is out of sync with migration SQL scripts.

---

## 4. SQL Execution Sandbox

### Current State
*   **Execution Engine**: Configured in [SqlEngine.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/services/execution/SqlEngine.js) and [SqlWorker.mjs](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/services/execution/SqlWorker.mjs).
*   **Worker Mechanics**: For each user SQL execution, Piscina calls a thread worker which opens a fresh in-memory SQLite database, runs the entire `initSql` schema creation + seed script, executes the user's query, and closes the connection.
*   **Safeguards**: Employs an `AbortController` set to a hard 500ms timeout threshold.

### The "Make-Do" / Incomplete Aspects
1.  **Repeated Setup Overhead**: Running the full `initSql` setup on every single keystroke-run or submission query is computationally wasteful. If a dataset contains complex schemas or large datasets, the worker spends most of its time executing DDL/DML setup scripts rather than evaluating the user's solution.
2.  **CPU Blocking and Thread Safety**: While Piscina runs in separate threads, a malicious or highly complex query (like generating recursive CTE rows or triggering massive cross-joins) can hang Node's synchronous SQLite parser. The `AbortController` in JS only rejects the promise wrapper, but it cannot force-kill a blocked thread loop instantly, potentially locking up the Piscina thread pool.

### The Ideal / Polished Implementation
*   **Serialized Database State Caching**: Cache the initialized SQLite database memory buffers. When a query is run, load the pre-compiled SQLite buffer directly (e.g., using SQLite's backup API or cloning the in-memory state) rather than calling `db.exec(initSql)` from scratch.
*   **Process-Isolated Sandboxing**: Move the execution environment out of the main thread pool into process-isolated micro-sandboxes (e.g. Docker containers or AWS Lambda functions) with strict memory limits.
*   **WASM-Based Client-Side Execution**: Alternatively, compile the SQLite engine to WebAssembly (WASM) and run the execution sandbox directly in the user's browser. The backend only needs to provide the dataset initialization file, offloading execution server costs, removing OOM security risks, and enabling offline playground features.

---

## 5. Execution Verification & Output Validation

### Current State
*   **Logic**: Uses a JSON conversion comparison helper:
    `JSON.stringify(normalizeResult(results)) === JSON.stringify(normalizeResult(expectedOutput))`
*   **Normalization**: Re-sorts column keys to prevent column-order discrepancies.

### The "Make-Do" / Incomplete Aspects
1.  **Row-Order Sensitivity**: If a question doesn't require sorting but the user's query returns records in a different row order than expected, the verification fails.
2.  **Type Discrepancies**: Decimal values (e.g. `95000.00` vs `95000`) and date formats vary depending on JS conversion rules, causing valid solutions to fail string equality tests.
3.  **No Column Name Validation**: Users can alias columns incorrectly or use default expressions, which can lead to false positives/negatives because column headers are matched rigidly.

### The Ideal / Polished Implementation
*   **Bag / Multiset Evaluator**: Compare results as multisets. If no `ORDER BY` is required by the solution schema, sort the rows of both datasets deterministically by value before checking equality.
*   **Type-Agnostic Value Matching**: Parse and compare values based on their database type (e.g., validating float equalities within an epsilon range of $10^{-6}$, and parsing timestamps into unified UTC ISO strings before comparison).
*   **Schema & Meta Assertion**: Assert that the output not only matches in values, but contains the exact column counts, names, and data types expected.

---

## 6. Real-time Live Engine (WebSockets)

### Current State
*   **Setup**: Real-time events are configured in [socket.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/socket.js) using Socket.io.
*   **Presence**: Online states are kept in-memory in a JavaScript `Map` inside the active Node process. On connect/disconnect, the backend queries PostgreSQL to find followers/following to dispatch status updates.

### The "Make-Do" / Incomplete Aspects
1.  **Horizontal Scale Wall**: Because online status Maps are kept in local process memory, running multiple backend instances behind a load balancer will break real-time features; users connected to Server A will not receive notifications from users on Server B.
2.  **Database Connection Spikes**: Performing synchronous PostgreSQL queries for social networks on every WebSocket connection or disconnection will overwhelm the database pool during server restarts or transient network drops.

### The Ideal / Polished Implementation
*   **Redis Socket.io Adapter**: Implement Redis as the event pub/sub broker. This enables seamless, low-latency communication across multiple clustered server instances.
*   **Redis Presence Storage**: Cache active user states directly in Redis with a short TTL (Time to Live) checked by a heartbeat event, removing PostgreSQL lookups from the connection lifecycle entirely.

---

## 7. Rate Limiting

### Current State
*   **Limiter**: Implemented in [rateLimiter.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/middleware/rateLimiter.js) via `express-rate-limit`. Capped at 1 request per 2 seconds per user/IP.

### The "Make-Do" / Incomplete Aspects
1.  **Local Memory Store**: Rate limit hits are tracked in-memory. Clustered server instances do not share rates, making bypass attempts easy.
2.  **Coarse Limits**: A single static rule applies to all code executions. There is no token-bucket configuration to allow bursts (e.g. running two queries in quick succession but rate-limiting subsequent spam).

### The Ideal / Polished Implementation
*   **Redis-Backed Sliding-Window Limiter**: Use `rate-limiter-flexible` backed by Redis to manage rate limits globally.
*   **Tiered Security Policies**:
    - **Code Execution**: Token bucket algorithm allowing 5 bursts, refilling 1 token every 2 seconds.
    - **Authentication Routes**: Strict IP-based lockout limits for login/register to stop automated brute-force attacks.
    - **Metadata APIs**: High thresholds to allow smooth dashboard navigation.

---

## 8. Diagnostics & AI Insights

### Current State
*   **AST Service**: [diagnostic.service.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/modules/diagnostic/diagnostic.service.js) uses `node-sql-parser` to parse queries into an AST to check for missing joins, tables, or clauses. (Marked as "useless" in code comments due to limited capabilities).
*   **AI Service**: [ai.service.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/modules/analytics/ai.service.js) pulls historical telemetry data, prunes it in a JavaScript loop, and calls Gemini synchronously to produce performance reports.

### The "Make-Do" / Incomplete Aspects
1.  **Fragile AST Checking**: Simple AST comparison cannot resolve semantic differences. If a student uses subqueries instead of joins or a different database CTE, the parser flags it as incorrect, providing confusing feedback.
2.  **Blocking AI Requests**: AI report generation runs synchronously during standard HTTP requests. If the Gemini API experiences network delays, the Express thread is held open, consuming HTTP connection capacity.

### The Ideal / Polished Implementation
*   **Explain Plan Analysis**: Run SQLite's native `EXPLAIN QUERY PLAN <query>` in the database sandbox to analyze the actual query path. This provides factual performance diagnostics (e.g., identifying full table scans, index scans, or unoptimized subqueries) without parsing complex ASTs.
*   **Asynchronous Job Queues**: Integrate a background job processing library like BullMQ (powered by Redis) to offload AI tasks.
    - The client initiates an AI analysis request and receives a `jobId`.
    - A background worker generates the report off the main thread.
    - Once completed, the worker saves the report and pushes a WebSocket event to the user's dashboard.

---

## 9. Contest Engine & Scoring

### Current State
*   **Leaderboard**: Sorted using basic queries in [contest.service.js](file:///c:/Users/LENOVO/Desktop/LurnerV2/LurnerBackend/src/modules/contests/contest.service.js) based on a static `+10` points increment upon success.

### The "Make-Do" / Incomplete Aspects
1.  **No Penalty Calculations**: Ties are resolved randomly. Real-world coding platforms calculate penalties based on submission time offsets and incorrect attempts to resolve placement details.
2.  **Lack of Plagiarism Checks**: There is no check to ensure queries aren't copied directly from other competitors.

### The Ideal / Polished Implementation
*   **ACM-ICPC Style Scoring**:
    - **Score**: Points based on the questions solved.
    - **Penalty**: Computed as: $Penalty = \sum(Time\_Taken) + 5\text{ mins} \times (Incorrect\_Attempts\_Before\_Success)$.
    - Ties are resolved by the lowest penalty time.
*   **Redis Sorted Sets (Leaderboard Caching)**: Keep live leaderboard data inside Redis Sorted Sets (`ZSET`). Updates and queries are executed in $\mathcal{O}(\log N)$ time complexity, bypassing heavy PostgreSQL table scans.
*   **AST Plagiarism Detection**: Compare the AST structures of concurrent user submissions to flag suspicious query alignments.

---

## 10. Monetization, Subscriptions & Deployment Readiness

### Current State
*   **Subscriptions**: No payment gateways or authorization limits.
*   **Deployment Configs**: No automated containerization configurations.

### The "Make-Do" / Incomplete Aspects
1.  **Lack of Commercial Structure**: All features, database playgrounds, and AI features are free, posing high server costs.
2.  **Manual Deployments**: The app must be started using local commands, making cloud scaling difficult.

### The Ideal / Polished Implementation
*   **Stripe Integration**: Connect Stripe Checkout for subscription tiers (e.g., Free vs. Premium). Use webhooks to handle subscription events and check access limits inside the `authMiddleware` layer.
*   **Docker Containerization**: Define standard container configurations:
    - `Dockerfile`: Multi-stage builds for the Express and React projects.
    - `docker-compose.yml`: For deploying the Express server, Postgres database, and Redis cache locally and in staging environments.
