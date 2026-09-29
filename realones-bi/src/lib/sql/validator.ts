// ============================================================================
// RealOnes BI - SQL Validator (AST-based security)
// ============================================================================

import { Parser } from 'node-sql-parser';
import type { SQLValidationResult } from '@/lib/types';

const parser = new Parser();

// Blocked SQL operations
const BLOCKED_OPERATIONS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'COPY', 'CALL', 'EXECUTE',
];

const BLOCKED_PATTERNS = [
  /;\s*\w/i,                    // Multiple statements
  /--/,                         // SQL comments
  /\/\*/,                       // Block comments
  /\bEXEC\b/i,                 // EXEC
  /\bXP_/i,                    // Extended stored procedures
  /\bSP_/i,                    // System stored procedures
  /\bDBCC\b/i,                 // DBCC commands
  /\bOPENROWSET\b/i,           // OPENROWSET
  /\bOPENQUERY\b/i,            // OPENQUERY
  /\bBULK\s+INSERT\b/i,        // BULK INSERT
  /\bINTO\s+OUTFILE\b/i,       // INTO OUTFILE
  /\bLOAD_FILE\b/i,            // LOAD_FILE
  /\bUTL_/i,                   // Oracle UTL packages
  /\bDBMS_/i,                  // Oracle DBMS packages
  /\bpg_sleep\b/i,             // PostgreSQL sleep
  /\bpg_read_file\b/i,         // PostgreSQL file read
  /\bpg_write_file\b/i,        // PostgreSQL file write
  /\bcopy\s+to\b/i,            // COPY TO
  /\bcopy\s+from\b/i,          // COPY FROM
];

// Allowed tables (must match schema_tables where is_allowed = true)
const ALLOWED_TABLES = [
  'orders', 'order_items', 'customers', 'products', 'product_categories',
  'returns', 'sales_targets', 'customer_churn_scores', 'regions',
];

// PII columns that must never appear in SELECT
const PII_COLUMNS: Record<string, string[]> = {
  customers: ['first_name', 'last_name', 'email', 'phone', 'address'],
};

export function validateSQL(
  sql: string,
  allowedTables: string[] = ALLOWED_TABLES,
  userRegions?: string[]
): SQLValidationResult {
  const result: SQLValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    tablesUsed: [],
    columnsUsed: [],
    hasUnsafeOperations: false,
    hasUnauthorizedTables: false,
    hasUnauthorizedColumns: false,
    hasPIIAccess: false,
    queryComplexity: 'simple',
  };

  // Step 1: Check for blocked patterns (string-level pre-check)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sql)) {
      result.valid = false;
      result.hasUnsafeOperations = true;
      result.errors.push(`Blocked pattern detected: ${pattern.toString()}`);
    }
  }

  // Step 2: Check for blocked keywords
  const upperSQL = sql.toUpperCase().trim();
  for (const op of BLOCKED_OPERATIONS) {
    const regex = new RegExp(`\\b${op}\\b`, 'i');
    if (regex.test(upperSQL)) {
      // Allow WITH (CTE) but block CREATE
      if (op === 'CREATE' && /\bCREATE\b/i.test(sql)) {
        result.valid = false;
        result.hasUnsafeOperations = true;
        result.errors.push(`Blocked operation: ${op}`);
      } else if (op !== 'CREATE') {
        result.valid = false;
        result.hasUnsafeOperations = true;
        result.errors.push(`Blocked operation: ${op}`);
      }
    }
  }

  if (!result.valid) return result;

  // Step 3: AST-based validation
  try {
    const ast = parser.astify(sql, { database: 'PostgreSQL' });
    const statements = Array.isArray(ast) ? ast : [ast];

    // Must be exactly one statement
    if (statements.length > 1) {
      result.valid = false;
      result.errors.push('Multiple SQL statements are not allowed.');
      return result;
    }

    const stmt = statements[0];

    // Must be a SELECT statement
    if (!stmt || (stmt as unknown as Record<string, unknown>).type !== 'select') {
      result.valid = false;
      result.errors.push('Only SELECT queries are allowed.');
      return result;
    }

    // Extract tables
    const tables = extractTables(stmt);
    result.tablesUsed = tables;

    // Check table authorization
    for (const table of tables) {
      const tableName = table.toLowerCase().replace(/^"?|"?$/g, '');
      if (!allowedTables.includes(tableName)) {
        result.valid = false;
        result.hasUnauthorizedTables = true;
        result.errors.push(`Table "${tableName}" is not in the allowed list.`);
      }
    }

    // Extract columns
    const columns = extractColumns(stmt);
    result.columnsUsed = columns;

    // Check PII access
    for (const col of columns) {
      const colLower = col.toLowerCase();
      for (const [table, piiCols] of Object.entries(PII_COLUMNS)) {
        if (tables.some(t => t.toLowerCase() === table) && piiCols.includes(colLower)) {
          result.hasPIIAccess = true;
          result.warnings.push(`PII column "${col}" in table "${table}" detected. Data will be masked.`);
        }
      }
    }

    // Check complexity
    const joinCount = countJoins(stmt);
    const subqueryCount = countSubqueries(stmt);
    if (joinCount > 5 || subqueryCount > 3) {
      result.queryComplexity = 'complex';
      result.warnings.push('Complex query detected. Execution may be slow.');
    } else if (joinCount > 2 || subqueryCount > 1) {
      result.queryComplexity = 'moderate';
    }

    // Check for LIMIT on detail queries
    if (!hasLimit(sql) && !hasAggregation(sql)) {
      result.warnings.push('No LIMIT clause on a non-aggregated query. A default limit will be applied.');
    }

  } catch (parseError) {
    // If AST parsing fails, try basic validation
    if (!upperSQL.startsWith('SELECT') && !upperSQL.startsWith('WITH')) {
      result.valid = false;
      result.errors.push('Only SELECT queries and CTEs are allowed.');
    } else {
      // It's a SELECT but parser failed - allow with warnings
      result.warnings.push('SQL parser could not fully validate this query. Basic checks passed.');
      // Still extract tables from SQL text
      const tableMatches = sql.match(/\bFROM\s+(\w+)/gi);
      if (tableMatches) {
        for (const match of tableMatches) {
          const tableName = match.replace(/^FROM\s+/i, '').toLowerCase();
          result.tablesUsed.push(tableName);
          if (!allowedTables.includes(tableName)) {
            result.valid = false;
            result.hasUnauthorizedTables = true;
            result.errors.push(`Table "${tableName}" is not in the allowed list.`);
          }
        }
      }
      const joinMatches = sql.match(/\bJOIN\s+(\w+)/gi);
      if (joinMatches) {
        for (const match of joinMatches) {
          const tableName = match.replace(/^JOIN\s+/i, '').toLowerCase();
          result.tablesUsed.push(tableName);
          if (!allowedTables.includes(tableName)) {
            result.valid = false;
            result.hasUnauthorizedTables = true;
            result.errors.push(`Table "${tableName}" is not in the allowed list.`);
          }
        }
      }
    }
  }

  return result;
}

// Helper: extract table names from AST
function extractTables(ast: unknown): string[] {
  const tables: string[] = [];
  try {
    const node = ast as Record<string, unknown>;
    if (node.from && Array.isArray(node.from)) {
      for (const f of node.from) {
        if (f.table) tables.push(f.table as string);
      }
    }
    // Also check joins inside from
    if (node.from && Array.isArray(node.from)) {
      for (const f of node.from) {
        if (f.join) {
          // Nested joins
          extractJoinTables(f, tables);
        }
      }
    }
  } catch {
    // Ignore
  }
  return [...new Set(tables)];
}

function extractJoinTables(node: Record<string, unknown>, tables: string[]): void {
  if (node.table) tables.push(node.table as string);
  if (node.join && typeof node.join === 'object') {
    extractJoinTables(node.join as Record<string, unknown>, tables);
  }
}

// Helper: extract column names from AST
function extractColumns(ast: unknown): string[] {
  const columns: string[] = [];
  try {
    const node = ast as Record<string, unknown>;
    if (node.columns && Array.isArray(node.columns)) {
      for (const col of node.columns) {
        if (col.expr && col.expr.column) {
          columns.push(col.expr.column as string);
        }
      }
    }
  } catch {
    // Ignore
  }
  return [...new Set(columns)];
}

function countJoins(ast: unknown): number {
  try {
    const sqlStr = parser.sqlify(ast as any, { database: 'PostgreSQL' });
    return (sqlStr.match(/\bJOIN\b/gi) || []).length;
  } catch {
    return 0;
  }
}

function countSubqueries(ast: unknown): number {
  const str = JSON.stringify(ast);
  return (str.match(/"type":"select"/g) || []).length - 1;
}

function hasLimit(sql: string): boolean {
  return /\bLIMIT\b/i.test(sql);
}

function hasAggregation(sql: string): boolean {
  return /\b(SUM|COUNT|AVG|MIN|MAX|GROUP\s+BY)\b/i.test(sql);
}

// Ensure LIMIT is applied to queries
export function enforceLimits(sql: string, maxRows: number = 10000): string {
  if (!hasLimit(sql)) {
    const defaultLimit = hasAggregation(sql) ? maxRows : Math.min(1000, maxRows);
    return `${sql.replace(/;\s*$/, '')} LIMIT ${defaultLimit}`;
  }
  return sql;
}

// Apply region filter to SQL
export function applyRegionFilter(sql: string, regionIds: string[]): string {
  if (regionIds.length === 0) return sql;

  // Check if the query references tables with region_id
  const tablesWithRegion = ['orders', 'customers', 'sales_targets'];
  const hasRegionTable = tablesWithRegion.some(t =>
    new RegExp(`\\b${t}\\b`, 'i').test(sql)
  );

  if (!hasRegionTable) return sql;

  const regionList = regionIds.map(id => `'${id}'`).join(', ');

  // Try to add region filter to WHERE clause
  if (/\bWHERE\b/i.test(sql)) {
    // Insert before GROUP BY, ORDER BY, LIMIT, or end
    const insertPoint = sql.search(/\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)\b/i);
    if (insertPoint > 0) {
      return sql.slice(0, insertPoint) + ` AND orders.region_id IN (${regionList}) ` + sql.slice(insertPoint);
    }
    return sql.replace(/;\s*$/, '') + ` AND orders.region_id IN (${regionList})`;
  }

  // No WHERE clause, add one before GROUP BY, ORDER BY, LIMIT, or end
  const insertPoint = sql.search(/\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)\b/i);
  if (insertPoint > 0) {
    return sql.slice(0, insertPoint) + ` WHERE orders.region_id IN (${regionList}) ` + sql.slice(insertPoint);
  }
  return sql.replace(/;\s*$/, '') + ` WHERE orders.region_id IN (${regionList})`;
}
