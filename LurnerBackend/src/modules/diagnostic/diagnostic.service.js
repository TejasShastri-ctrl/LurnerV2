// Abstract Syntax Tree (AST) diagnostics service

import pkg from 'node-sql-parser';
const { Parser } = pkg;

const parser = new Parser();

export const getQuerySkeleton = (sql) => {
    try {
        // node-sql-parser handles multiple dialects, defaulting to postgres
        const ast = parser.astify(sql);
        
        // Handle cases where ast might be an array (multiple queries)
        const root = Array.isArray(ast) ? ast[0] : ast;

        if (!root || root.type !== 'select') {
            return { error: 'Only SELECT queries are supported for diagnostic analysis.' };
        }

        const skeleton = {
            tables: [],
            columns: [],
            joins: [],
            hasGroupBy: !!root.groupby,
            hasOrderBy: !!root.orderby,
            hasWhere: !!root.where
        };

        // Extract Tables and Joins
        if (root.from) {
            root.from.forEach(f => {
                if (f.table) skeleton.tables.push(f.table);
                if (f.join) skeleton.joins.push(f.join);
            });
        }

        // Extract Columns (Simplified names)
        if (root.columns) {
            if (root.columns === '*') {
                skeleton.columns.push('*');
            } else {
                root.columns.forEach(c => {
                    if (c.expr && c.expr.column) {
                        skeleton.columns.push(c.expr.column);
                    } else if (c.expr && c.expr.type === 'aggr_func') {
                        skeleton.columns.push(`${c.expr.name}()`);
                    }
                });
            }
        }

        // Sort for deterministic comparison
        skeleton.tables.sort();
        skeleton.columns.sort();
        skeleton.joins.sort();

        return skeleton;
    } catch (e) {
        return { error: `Parsing failed: ${e.message}` };
    }
};

/**
 * Compares User Query vs Solution Query and returns structural mismatches.
 */
export const compareQueries = (userSql, solutionSql) => {
    const userSkeleton = getQuerySkeleton(userSql);
    const solutionSkeleton = getQuerySkeleton(solutionSql);

    if (userSkeleton.error || solutionSkeleton.error) {
        return { error: userSkeleton.error || solutionSkeleton.error };
    }

    const mismatches = [];

    // Check Tables
    const missingTables = solutionSkeleton.tables.filter(t => !userSkeleton.tables.includes(t));
    if (missingTables.length > 0) {
        mismatches.push({
            type: 'MISSING_TABLE',
            message: `Your query is missing data from these tables: ${missingTables.join(', ')}`,
            severity: 'HIGH'
        });
    }

    // Check Joins
    if (solutionSkeleton.joins.length > userSkeleton.joins.length) {
        mismatches.push({
            type: 'MISSING_JOIN',
            message: 'You might need to use a JOIN to combine data from multiple tables.',
            severity: 'MEDIUM'
        });
    }

    // Check Columns
    // Rule: If either side uses '*', we consider the columns 'potentially matching' 
    // because we don't have schema-level expansion here.
    const userHasWildcard = userSkeleton.columns.includes('*');
    const solutionHasWildcard = solutionSkeleton.columns.includes('*');

    if (!userHasWildcard && !solutionHasWildcard) {
        const missingCols = solutionSkeleton.columns.filter(c => !userSkeleton.columns.includes(c));
        if (missingCols.length > 0) {
            mismatches.push({
                type: 'MISSING_COLUMN',
                message: `You missed some required columns: ${missingCols.join(', ')}`,
                severity: 'LOW'
            });
        }
    } else if (solutionHasWildcard && userSkeleton.columns.length === 0) {
        // If solution wants everything and user gave nothing
        mismatches.push({
            type: 'EMPTY_SELECT',
            message: 'Your query doesn\'t seem to select any columns.',
            severity: 'HIGH'
        });
    }

    // Check Logic Clauses
    if (solutionSkeleton.hasGroupBy && !userSkeleton.hasGroupBy) {
        mismatches.push({
            type: 'MISSING_GROUP_BY',
            message: 'Your results need to be aggregated using a GROUP BY clause.',
            severity: 'HIGH'
        });
    }

    if (solutionSkeleton.hasWhere && !userSkeleton.hasWhere) {
        mismatches.push({
            type: 'MISSING_WHERE',
            message: 'You missed a filter (WHERE clause) to narrow down the results.',
            severity: 'MEDIUM'
        });
    }

    if (solutionSkeleton.hasOrderBy && !userSkeleton.hasOrderBy) {
        mismatches.push({
            type: 'MISSING_ORDER_BY',
            message: 'The results need to be sorted using an ORDER BY clause.',
            severity: 'LOW'
        });
    }

    return {
        isMatch: mismatches.length === 0,
        mismatches,
        userSkeleton,
        solutionSkeleton
    };
};
