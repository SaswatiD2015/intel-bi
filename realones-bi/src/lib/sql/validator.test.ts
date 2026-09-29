import { describe, it, expect } from 'vitest';
import { validateSQL, enforceLimits, applyRegionFilter } from './validator';

describe('SQL Validator', () => {
  const allowedTables = ['orders', 'customers', 'products', 'regions'];
  const regionIds = ['region-1', 'region-2'];

  it('allows safe read-only queries on allowed tables', () => {
    const sql = 'SELECT * FROM orders WHERE status = "completed"';
    const result = validateSQL(sql, allowedTables, regionIds);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('blocks unsafe operations like DELETE', () => {
    const sql = 'DELETE FROM orders WHERE id = 1';
    const result = validateSQL(sql, allowedTables, regionIds);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Query contains blocked keywords (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, EXEC, etc.)');
  });

  it('blocks queries accessing unauthorized tables', () => {
    const sql = 'SELECT * FROM users';
    const result = validateSQL(sql, allowedTables, regionIds);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unauthorized table access');
  });

  it('flags PII access', () => {
    const sql = 'SELECT first_name, email FROM customers';
    const result = validateSQL(sql, allowedTables, regionIds);
    expect(result.valid).toBe(true);
    expect(result.hasPIIAccess).toBe(true);
  });
});

describe('Enforce Limits', () => {
  it('appends LIMIT 500 to unbounded queries', () => {
    const sql = 'SELECT * FROM orders';
    const limited = enforceLimits(sql);
    expect(limited).toContain('LIMIT 500');
  });

  it('does not append LIMIT if already present', () => {
    const sql = 'SELECT * FROM orders LIMIT 10';
    const limited = enforceLimits(sql);
    expect(limited).toBe(sql);
  });
});

describe('Row Level Security (Region Filter)', () => {
  it('injects region filter correctly', () => {
    const sql = 'SELECT * FROM orders';
    const filtered = applyRegionFilter(sql, ['uuid-1']);
    expect(filtered).toContain('region_id IN');
  });
});
