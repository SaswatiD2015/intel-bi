// ============================================================================
// RealOnes BI - SQL Executor (Safe, with timeouts and limits)
// ============================================================================

import prisma from '@/lib/db';
import { enforceLimits } from './validator';

export interface SQLExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  truncated?: boolean;
}

const MAX_ROWS = parseInt(process.env.SQL_MAX_ROWS || '10000');
const QUERY_TIMEOUT = parseInt(process.env.SQL_QUERY_TIMEOUT_MS || '30000');

export async function executeSQL(sql: string): Promise<SQLExecutionResult> {
  const startTime = Date.now();

  try {
    // Enforce limits
    const safeSql = enforceLimits(sql, MAX_ROWS);

    // Execute with timeout using Prisma raw query
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query execution timed out')), QUERY_TIMEOUT)
    );

    const queryPromise = prisma.$queryRawUnsafe(safeSql) as Promise<Record<string, unknown>[]>;

    const rawResult = await Promise.race([queryPromise, timeoutPromise]);

    const executionTimeMs = Date.now() - startTime;

    if (!Array.isArray(rawResult) || rawResult.length === 0) {
      return {
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs,
      };
    }

    const columns = Object.keys(rawResult[0]);
    const rows = rawResult.map(row => {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        // Convert BigInt to number and Decimal to number
        if (typeof value === 'bigint') {
          sanitized[key] = Number(value);
        } else if (value !== null && typeof value === 'object' && 'toNumber' in (value as object)) {
          sanitized[key] = (value as { toNumber: () => number }).toNumber();
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    });

    return {
      success: true,
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
      truncated: rows.length >= MAX_ROWS,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';

    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      error: errorMessage,
    };
  }
}

// Mask PII columns in results
export function maskPIIInResults(
  rows: Record<string, unknown>[],
  piiColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'address']
): Record<string, unknown>[] {
  return rows.map(row => {
    const masked = { ...row };
    for (const col of piiColumns) {
      if (col in masked && masked[col] !== null) {
        if (col === 'email') {
          const email = String(masked[col]);
          const [local, domain] = email.split('@');
          masked[col] = `${local[0]}***@${domain}`;
        } else if (col === 'first_name' || col === 'last_name') {
          masked[col] = `${String(masked[col])[0]}***`;
        } else {
          masked[col] = '[MASKED]';
        }
      }
    }
    return masked;
  });
}
