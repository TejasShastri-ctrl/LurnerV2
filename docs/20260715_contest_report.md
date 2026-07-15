# Contest System — Full Audit & Bug Report
**Date:** 2026-07-15  
**Author:** Antigravity (Audit pass)  
**Status:** 🔴 Broken — Multiple critical issues identified

---

## 1. Overview

This document is a complete audit of the **Lurner Arena** contest system — from admin creation all the way through the participant's live solving session, anti-cheat enforcement, scoring, and real-time leaderboard delivery.

The system spans the following files:

| Layer | Files |
|---|---|
| Schema | `LurnerBackend/prisma/schema.prisma` |
| Backend | `contest.controller.js`, `contest.service.js`, `contest.routes.js` |
| Middleware | `auth.js`, `rateLimiter.js` |
| Socket | `socket.js` |
| Frontend Pages | `Admin.jsx`, `Contests.jsx`, `ContestWorkspace.jsx` |
| Frontend Hooks | `useAntiCheat.js`, `useLocalDraft.js` |
| API Layer | `api/api.js` |

---

## 2. Database Table Relations

The contest system uses 4 primary models that form a clear relational chain:

```
Contest
  ├── ContestQuestion[]   (owned questions, standalone copies NOT linked to Question table)
  ├── ContestParticipant[] (users who have joined)
  └── ContestSubmission[] (all submissions across all questions)

ContestQuestion
  ├── Dataset (FK → Dataset.id, for initSql + schema)
  └── ContestSubmission[] (answers to this specific question)

ContestParticipant (composite PK: userId + contestId)
  ├── score         — accumulated points
  ├── infractions   — anti-cheat strike count
  ├── isDisqualified — permanent ban flag
  └── finishedAt    — NEVER WRITTEN (see Bug #24)

ContestSubmission
  ├── userId FK
  ├── contestId FK       (redundant but useful for direct queries)
  ├── contestQuestionId FK
  ├── status: SUCCESS | FAIL | ERROR
  ├── executionTimeMs
  └── output (JSON)
```

### Key Relation Notes

- `ContestQuestion` is a **standalone copy** of question data — NOT a FK to the `Question` table. Contest questions are authored inline and fully owned by the contest.
- `ContestParticipant` uses a **composite PK** `(userId, contestId)` — join is idempotent.
- `ContestSubmission` has a redundant `contestId` alongside `contestQuestionId`. Useful for fast queries without joining back through ContestQuestion.
- `solutionSql` is stored on `ContestQuestion` but **explicitly omitted** from `getContestById` — a deliberate security measure.
- `tablePreviews` is a `Json?` field cached at contest creation time (snapshots of all DB tables, max 5 rows each) to avoid re-running `initSql` on every participant fetch.
- `onDelete: Cascade` on `ContestQuestion → ContestSubmission` means submissions are cleaned up if a question is removed.

---

## 3. End-to-End Workflow

### 3.1 Contest Creation (Admin)

**Route:** `POST /api/contests`  
**Files:** `Admin.jsx` → `api.js:createContest` → `contest.controller.js:createContestHandler`

**Flow:**

1. Admin opens **Contests Panel** tab in `Admin.jsx` → clicks **"Create Contest"**
2. Modal opens with form: title, description, `startTime`, `endTime`, and a dynamic question list
3. For each question, admin provides: title, difficulty, description, `datasetId`, `dbTableName`, `solutionSql`, and `expectedOutput` (JSON, or auto-generated via `POST /api/questions/generateOutput`)
4. On submit (`handleSaveContest`):
   - Validates: title/startTime/endTime required, ≥1 question, each question has title + dataset + expectedOutput
   - Parses `expectedOutput` strings to JSON
   - Calls `createContest(payload, token)` → `POST /api/contests`
5. **Backend** (`createContestHandler`):
   - For each question, fetches dataset's `initSql`
   - Calls `buildTablePreviews(initSql)` — runs SQLite sandbox to snapshot all table data
   - Stores `tablePreviews` as cached JSON in `ContestQuestion`
   - Creates `Contest` + all `ContestQuestion` records in a single Prisma nested `create`

> **❌ BUG #1 — No Admin Authorization Guard**  
> `POST /api/contests` only requires `authMiddleware` (any logged-in user). There is zero role check. Any user can create a contest via the API. The Admin page UI is gate-kept by route navigation only.

> **❌ BUG #2 — No Contest Edit or Delete**  
> The Admin panel has no edit or delete actions for contests. Once created, a contest is permanent unless manually deleted via DB.

> **❌ BUG #3 — `datetime-local` Timezone Bug**  
> `<input type="datetime-local">` emits a local datetime string (e.g., `"2026-07-20T14:00"`) with no timezone. When the backend does `new Date(startTime)`, Node.js treats the string as UTC. If admin is in IST (+5:30) and the server is UTC, every contest starts/ends 5.5 hours earlier than intended.

---

### 3.2 Contest Listing

**Route:** `GET /api/contests` (public, no auth required)  
**File:** `Contests.jsx`

Returns all contests ordered by `startTime desc`, with participant count (`_count.participants`).  
Frontend classifies each as `active`, `upcoming`, or `past` and renders accordingly.

> **❌ BUG #4 — Past Contests Navigate to Empty Workspace**  
> Clicking a past contest navigates to the workspace, which shows a "Contest has ended" badge — but no leaderboard, no summary, and no results view. There is no dedicated post-contest results page.

> **⚠️ WARNING #5 — Contest List is Fully Public**  
> `GET /` has no `authMiddleware`. Anyone unauthenticated can enumerate all contests including timings and participant counts.

---

### 3.3 Joining a Contest

**Route:** `POST /api/contests/:id/join`  
**File:** `ContestWorkspace.jsx:handleStartContest`

1. User lands on `/editor/contest/:contestId`, sees pre-join screen if not in `participants`
2. Clicks "Start Contest Session"
3. Frontend calls `joinContest` → backend creates `ContestParticipant` row
4. Duplicate join (P2002) returns 200 `{ message: "Already joined" }` — idempotent
5. Frontend sets `isStarted = true`, reloads data, calls `enterFullscreen()` after 500ms

> **❌ BUG #6 — No Active Contest Gate on Join**  
> `joinContestHandler` does NOT validate `startTime`/`endTime`. A user can join a contest that has already ended or hasn't started.

> **⚠️ WARNING #7 — Fullscreen Delay Is Fragile**  
> `setTimeout(() => enterFullscreen(), 500)` — browsers require fullscreen to be triggered directly in a user gesture call stack. If `loadContest()` takes more than 500ms, the fullscreen call happens outside the gesture context and is silently rejected.

---

### 3.4 The Contest Workspace (Live Session)

**File:** `ContestWorkspace.jsx`

Components rendered after `isStarted = true`:

- **Left sidebar:** Question tabs + question detail + schema inspector (reads `tablePreviews` from DB cache)
- **Optional leaderboard panel** (18% width column, toggle via header)
- **Monaco Editor:** Full SQL code editor (`@monaco-editor/react`)
- **Output panel:** Three tabs — Console Output, Expected Results, Submission Result
- **Header:** Title, timer countdown, anti-cheat strike badge, leaderboard toggle

#### Timer

```js
const remaining = +new Date(contest.endTime) - +new Date();
// Updates every 1000ms via setInterval
```

When timer hits 0, `handleTimeExpired()` fires → auto-submits active question → clears drafts → alerts → navigates to `/contests`.

> **❌ BUG #8 — Auto-Submit Only Covers the Active Question**  
> When time expires, only the currently visible question is submitted. Work on all other questions is lost. Additionally, `alert()` is blocking — users must dismiss it manually before navigation happens.

> **❌ BUG #9 — Timer Is Purely Client-Side**  
> A user can manipulate `contest.endTime` in memory or change their system clock. The server correctly validates time on submission, but the client UI timer is not a security boundary.

---

### 3.5 SQL Execution (Dry Run — No Submission)

**Route:** `POST /api/contests/:id/execute`  
**File:** `ContestWorkspace.jsx:handleRunQuery`

1. POSTs `{ sql, contestQuestionId }` with auth
2. Backend checks disqualification status
3. Fetches `ContestQuestion` (with dataset)
4. Runs `executeSql(initSql, sql)` in SQLite sandbox
5. Returns `{ results, executionTimeMs, errorMessage }` — **no DB record written**

> **⚠️ WARNING #10 — Execute Has No Active Contest Time Check**  
> Execute works after a contest has ended. Users can probe the dataset structure post-contest.

> **⚠️ WARNING #11 — Execute Has No Rate Limiting**  
> `POST /:id/execute` skips `submissionLimiter`. Unlimited query execution rate against the worker pool.

---

### 3.6 Submitting a Solution

**Route:** `POST /api/contests/:id/submit` (rate-limited: 1 req / 2s per user)  
**File:** `contest.controller.js:contestSubmitHandler`

**9-step backend pipeline:**

```
1.  Verify contest is ACTIVE (startTime <= now <= endTime)
2.  Verify user is a PARTICIPANT
3.  Verify user is NOT DISQUALIFIED
4.  Fetch ContestQuestion (with dataset.initSql)
5.  Check user has NOT already solved this question (→ 400 if duplicate)
6.  Execute SQL via executeSql(initSql, sql)
7.  Normalize & compare output with expectedOutput (key-order-insensitive JSON compare)
8.  Record ContestSubmission (status: SUCCESS | FAIL | ERROR)
9.  If CORRECT:
    a. Compute: points = basePts − (wrongAttempts × 15) − (floor(elapsedMin/5) × 5)
    b. Update ContestParticipant.score += points
    c. Fetch fresh leaderboard
    d. Broadcast score_update via Socket.IO to contest_${contestId} room
```

**Scoring constants:**

| Difficulty | Base Points |
|---|---|
| EASY | 100 |
| MEDIUM | 200 |
| HARD | 350 |

| Penalty | Rate |
|---|---|
| Wrong attempt | −15 pts each |
| Time (per 5-min bracket from contest start) | −5 pts per bracket |

Minimum score is capped at 0 (`Math.max(0, ...)`).

> **❌ BUG #12 — No Database Transaction on Submit + Score Update**  
> Steps 8 (record submission) and 9b (update score) are separate Prisma calls with no `$transaction`. If the score update fails, the DB has a SUCCESS submission but no points awarded — data corruption.

> **❌ BUG #13 — Wrong Attempt Count Timing Is Fragile**  
> `countPriorWrongAttempts` is called BEFORE the current submission is recorded. This is actually correct for the scoring logic, but the two operations happen sequentially without a transaction — a crash between them leaves an inconsistent state.

> **❌ BUG #14 — `normalizeResult` Is Duplicated**  
> Defined separately in both `contest.controller.js` and `submission.controller.js` with slightly different internal implementations. Must be extracted to a shared utility (`src/utils/normalizeResult.js`).

> **⚠️ WARNING #15 — `solutionSql` in Internal Fetch Object**  
> `getContestQuestionById` returns the full `ContestQuestion` including `solutionSql`. Currently safe (never sent to client), but uses no explicit `select` guard. A future code change that serializes this object to a response would accidentally expose the solution.

---

### 3.7 Session Tracking & Local Drafts

**File:** `useLocalDraft.js`

- **Storage key:** `lurner_draft_contest_{contestId}_user_{userId}` in `localStorage`
- **Debounce:** 1500ms after last keystroke before writing to localStorage
- **Load:** Draft is loaded when switching between questions
- **Clear:** Cleared on timer expiry, disqualification. NOT cleared on correct submission.

> **❌ BUG #16 — Draft Key Uses `undefined` userId On First Render**  
> `useLocalDraft(contestId, user?.id)` initializes before the auth context resolves. `user` is `null` initially → storage key becomes `lurner_draft_contest_1_user_undefined`. When the real userId is later known, a different key is used, so drafts written during auth load are permanently orphaned.

> **⚠️ WARNING #17 — No Draft Expiry or Size Limit**  
> LocalStorage has ~5MB per origin. No expiry or cleanup mechanism exists for old contest drafts. They accumulate indefinitely across all past contests.

---

### 3.8 Anti-Cheat System

**File:** `useAntiCheat.js` + `contest.controller.js:infractionHandler`

**Detection events:**

| Event | Trigger | API Type |
|---|---|---|
| `EXIT_FULLSCREEN` | `document.fullscreenchange` fires when user exits fullscreen | `POST /:id/infraction` |
| `TAB_SWITCH` | `document.visibilitychange` → `visibilityState === 'hidden'` | `POST /:id/infraction` |

**Anti-cheat activation condition:**
```js
isActive: isStarted && timeLeftMs > 0 && !activeViolation && !isServerDisqualified
```

**Per-infraction flow:**
1. Client detects event → `onServerReport(type)` fires immediately (before UI update)
2. `reportInfraction(contestId, type, token)` → `POST /:id/infraction`
3. Server: `infractions += 1`. If `infractions >= 3` → `isDisqualified = true`
4. Server returns `{ infractions, isDisqualified }`
5. Client: if `isDisqualified` → navigate to `/contests`
6. Client UI: `InfractionOverlay` displayed with `count/max` strikes + "Resume Contest" button
7. Resume → dismiss overlay → `enterFullscreen()`

> **❌ BUG #18 — Client Infraction Count Not Synced From Server**  
> Client tracks infractions in local `useState(0)`. On page reload, signing out and back in, or logging in from another device, the local state resets to 0. If the server already has 2 infractions recorded, the client will allow 2 more UI-level warnings before enforcement, giving the user 5 effective warnings/strikes. The server will disqualify correctly, but the UX will be misleading and allow the user to continue working locally with an incorrect state.

> **❌ BUG #19 — Anti-Cheat Has Race Condition on First Render**  
> `timeLeftMs` defaults to `0`. On mount, `isActive` is `false` until the timer initializes. The hook is inactive for at least one tick even during a live contest, creating a brief enforcement gap.

> **❌ BUG #20 — No Fullscreen State Verification on Join**  
> After joining, `enterFullscreen()` is called once. If it fails silently (browser refused), the hook starts with `isFullscreen: false` but no `fullscreenchange` event fires, so no infraction is logged. The user is in an unenforced state.

> **⚠️ WARNING #21 — Client-Side Anti-Cheat Is Bypassable by Design**  
> Technically-adept users can send API requests directly without triggering any browser events. All anti-cheat enforcement is UX-level, not security-level. Server-side submission blocking of disqualified users is the only real enforcement.

---

### 3.9 Real-Time Leaderboard (Socket.IO)

**File:** `socket.js` + `ContestWorkspace.jsx`

**Client joins room on start:**
```js
socket.emit('join_contest_room', parseInt(contestId));
socket.on('score_update', ({ leaderboard }) => setLeaderboard(leaderboard));
```

**Server broadcasts on correct submission:**
```js
getIO().to(`contest_${contestId}`).emit('score_update', { leaderboard });
```

**Polling fallback:** `setInterval(loadLeaderboard, 15000)` — runs continuously while `isStarted` is true.

**Socket auth:** JWT verified in `io.use()` middleware from `handshake.auth.token` or cookie.

> **❌ BUG #22 — No Authorization on Socket Room Join**  
> `socket.on('join_contest_room', contestId)` blindly accepts any contestId. Any authenticated user can join any contest's broadcast room and receive live score updates, even if they are not a participant.

> **⚠️ WARNING #23 — Leaderboard Polling Runs Regardless of Panel Visibility**  
> `setInterval(loadLeaderboard, 15000)` runs whenever `isStarted` is true — even when the leaderboard panel is toggled off. This fires unnecessary API requests throughout the entire contest duration.

---

### 3.10 Leaderboard Data

**File:** `contest.service.js:getLeaderboard()`

1. Fetches all `ContestParticipant` rows ordered by `score DESC`
2. Groups `ContestSubmission` by `userId` where `status = "SUCCESS"` → solved count per user
3. Returns: `{ rank, userId, name, score, solved, isDisqualified, finishedAt }`

> **⚠️ WARNING #24 — `finishedAt` Is Never Written**  
> `ContestParticipant.finishedAt` is a nullable `DateTime` field. Nothing in the codebase ever sets it. It always returns `null`.

> **⚠️ WARNING #25 — No Tiebreaker Logic in Rankings**  
> Two participants with the same score get arbitrary ordering (DB insertion order). No tiebreaker exists (standard: timestamp of last correct submission).

> **❌ BUG #26 — Submitting Final Solution Does Not Transition User Out of Workspace**  
> When the user successfully solves all questions in the contest, the UI updates the state but does not prompt them to complete the contest or automatically transition them out of the workspace (fullscreen lock). They must manually click "Back" (which prompts with a warning) or wait for the timer to expire, which is a confusing and disjointed user experience.

---

## 4. Security Summary

| Check | Status |
|---|---|
| JWT required for all write operations | ✅ Yes |
| Contest active window enforced on submit | ✅ Yes |
| Participant check on submit | ✅ Yes |
| Disqualification gate on submit | ✅ Yes |
| `solutionSql` hidden from client on `getContestById` | ✅ Yes |
| Rate limiting on submissions (1/2s per user) | ✅ Yes |
| `onDelete: Cascade` on ContestQuestion → Submissions | ✅ Yes |
| Admin role required to create contests | ❌ NO |
| Socket room access authorized to participants only | ❌ NO |
| Active contest gate on join | ❌ NO |
| Active contest gate on execute | ❌ NO |
| Transaction safety on score update | ❌ NO |
| Client infraction count synced from server | ❌ NO |

---

## 5. Bugs Ranked by Priority

### 🔴 Critical

| # | Bug |
|---|---|
| 1 | No admin auth on `POST /api/contests` — any user can create contests |
| 12 | No DB transaction on submit + score — data corruption risk |
| 22 | No Socket.IO room authorization — score leaks to non-participants |
| 18 | Client infraction count resets on reload — anti-cheat bypass |
| 3 | `datetime-local` timezone bug — contests start/end at wrong times |

### 🟠 High

| # | Bug |
|---|---|
| 6 | No active gate on join — users can join ended contests |
| 8 | Auto-submit covers only active question — work lost on expiry |
| 16 | Draft key uses `undefined` userId — drafts lost on first load |
| 19 | Anti-cheat inactive on first render tick |
| 20 | No fullscreen verification on join start |

### 🟡 Medium

| # | Bug |
|---|---|
| 2 | No contest edit/delete in admin |
| 4 | Past contests navigate to empty workspace with no results view |
| 10 | Execute works after contest ends — dataset leakage |
| 11 | Execute has no rate limiting |
| 14 | `normalizeResult` duplicated in two controllers |
| 23 | Leaderboard polls even when panel is hidden |
| 24 | `finishedAt` never written |
| 25 | No tiebreaker in leaderboard rankings |
| 26 | Submitting final solution does not transition user out of workspace |

### 🟢 Low / Design Debt

| # | Note |
|---|---|
| 7 | Fullscreen called via setTimeout — fragile gesture context |
| 9 | Client timer is cosmetic only for security purposes |
| 13 | Submission/score step ordering fragile on server crash |
| 15 | `solutionSql` unguarded in internal fetch (not exposed, but risky) |
| 17 | No draft expiry or localStorage size limit |
| 21 | Anti-cheat inherently bypassable via direct API calls |

---

## 6. Suggested Fix Order

1. **Admin role guard** on `POST /api/contests`
2. **`$transaction`** around submission record + score increment (Bug #12)
3. **Sync infraction count** from server on workspace load (Bug #18)
4. **Active contest gate on join** — reject if outside `startTime`/`endTime` (Bug #6)
5. **Fix `datetime-local` timezone** — normalize to ISO 8601 with tz offset (Bug #3)
6. **Socket.IO room authorization** — check participant before allowing room join (Bug #22)
7. **Fix auto-submit** — submit all questions on timer expiry, not just active (Bug #8)
8. **Fix draft key** — guard `useLocalDraft` until `user.id` is defined (Bug #16)
9. **Add execute rate limiting** (Bug #11)
10. **Add execute active-contest gate** (Bug #10)
11. **Write `finishedAt`** when user solves all questions (Bug #24)
12. **Add tiebreaker** to leaderboard sort (Bug #25)
13. **Exit workspace when all questions solved / Contest finished** (Bug #26)
14. **Extract `normalizeResult`** to shared utility (Bug #14)
15. **Add contest edit/delete** to admin panel (Bug #2)
16. **Build post-contest results view** for past contests (Bug #4)

---

## 7. What Is Working Well

- `solutionSql` correctly withheld from the public API response
- `tablePreviews` cached at creation prevents repeated SQLite runs per participant
- Duplicate-solve prevention is server-enforced (not just client-side)
- `ContestSubmission.status` covers all three states (SUCCESS, FAIL, ERROR)
- Socket.IO leaderboard push on correct answer is well-structured
- Disqualification is server-side and blocks further submissions at API level
- Rate limiter correctly keys by user ID, not IP
- `useLocalDraft` uses proper debouncing and cleanup on unmount
- `useAntiCheat` uses `useRef` to keep callbacks stable without re-binding event listeners
- Scoring formula accounts for both wrong-attempt penalty and time penalty with a floor of 0

---

*Next report: After fixes are applied. Reference bug numbers when closing issues.*
