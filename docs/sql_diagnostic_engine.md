# SQL Diagnostic Engine: Deterministic Feedback Specification

This document outlines the architecture for a non-LLM based SQL diagnostic engine. By shifting from probabilistic text generation (LLMs) to deterministic structural analysis, we can provide consistent, pedagogical, and highly scalable feedback for the Lurner platform.

## 1. Core Philosophy
Unlike LLMs, which "guess" errors based on word patterns, a deterministic engine **calculates** errors based on the code's structure.
*   **Deterministic**: Same input always equals the same feedback.
*   **Zero Latency**: Local execution (milliseconds vs. seconds).
*   **Pedagogical Rigor**: Feedback is based on formal SQL rules, preventing "hallucinations."

---

## 2. Layer 1: Structural Decomposition (The AST)
The foundation is converting SQL strings into an **Abstract Syntax Tree (AST)**.

### Tooling
*   **Node.js**: `node-sql-parser` or `libpg-query`.
*   **Process**: Parse user query ($U$) and solution query ($E$) into recursive JSON objects.

### AST Normalization
To prevent false negatives (e.g., `SELECT a, b` vs `SELECT b, a`), the engine must:
1.  **Sort Identifiers**: Alphabetize column names in the `SELECT` and `GROUP BY` nodes.
2.  **Flatten Predicates**: Standardize `WHERE` clauses (e.g., always put the column on the left: `id = 1` instead of `1 = id`).
3.  **Alias Resolution**: Resolve table aliases to their full names.

---

## 3. Layer 2: Comparative Heuristics (Structural Diffing)
Once normalized, the engine performs a "Structural Diff" between the user query and the reference solution.

### A. Heuristic Rules
*   **Join Mismatch**: If $E$ has an `INNER JOIN` but $U$ has a `LEFT JOIN` or `CROSS JOIN`.
*   **Column Omission**: $E$ expects 4 columns, $U$ provides 3.
*   **Predicate Error**: $E$ uses `>` but $U$ uses `>=`.
*   **Missing Aggregation**: $E$ uses `SUM()` but $U$ has no `GROUP BY`.

### B. Execution Plan Analysis (EXPLAIN)
Run both queries against the DB using `EXPLAIN (FORMAT JSON)`:
*   **Performance Delta**: If User Cost > 2x Solution Cost, flag "Inefficient Logic."
*   **Scanning Strategy**: If the solution uses an `Index Scan` but the user forces a `Seq Scan`, provide feedback on indexing and optimization.

---

## 4. Layer 3: Pattern Classification (Classical ML)
To provide long-term "AI-based insights" on the dashboard, we use supervised learning on behavior vectors.

### Feature Engineering
Convert user history into a feature vector:
*   **Syntactic Fragility**: Frequency of `SQLState` errors per session.
*   **Clause Mastery**: Success rate specifically on `JOIN` vs `HAVING` vs `WINDOW` functions.
*   **Complexity Delta**: Average depth of the user's AST vs. the shortest path solution.

### Classifier (Random Forest / SVM)
Categorize users into **SQL Personas**:
*   **The Syntactician**: Correct logic, but struggles with commas/quotes.
*   **The Brute-Forcer**: High execution cost, correct result set.
*   **The Optimizer**: Efficient code, uses indices well.

---

## 5. Summary of Benefits
1.  **Scale**: Costs $0 in API tokens.
2.  **Reliability**: Never suggests a syntax that doesn't exist.
3.  **Insights**: Provides data-driven "Skills Radar" charts for the user dashboard.
4.  **Hybrid Potential**: Can serve as a "Validator" for an LLM if one is added later.

---

## 6. Recommended Implementation Path
1.  **MVP**: Implement `node-sql-parser` to compare selected columns and table names.
2.  **V2**: Implement `EXPLAIN` cost comparison.
3.  **V3**: Implement the Classical ML persona classifier for the Insights page.
