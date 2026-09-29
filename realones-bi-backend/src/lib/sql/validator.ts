import { Parser, AST, Select } from 'node-sql-parser';

export interface SqlValidationResult {
  valid: boolean;
  errors: string[];
  tablesAccessed: string[];
  columnsAccessed: string[];
  isReadOnly: boolean;
  hasPIIAccess: boolean;
}

export class SqlValidatorService {
  private parser: Parser;

  // These should ideally be dynamically fetched from the semantic layer
  private allowedTables = [
    'orders', 'order_items', 'products', 'product_categories',
    'customers', 'regions', 'returns', 'sales_targets', 'customer_churn_scores'
  ];
  
  private piiColumns = ['email', 'phone'];

  constructor() {
    this.parser = new Parser();
  }

  public validateSql(sql: string): SqlValidationResult {
    const result: SqlValidationResult = {
      valid: true,
      errors: [],
      tablesAccessed: [],
      columnsAccessed: [],
      isReadOnly: true,
      hasPIIAccess: false
    };

    try {
      const astResult = this.parser.astify(sql, { database: 'postgresql' });
      
      const astArray = Array.isArray(astResult) ? astResult : [astResult];

      if (astArray.length > 1) {
        result.valid = false;
        result.errors.push("Multiple statements are not allowed.");
      }

      const ast = astArray[0];

      if (ast.type !== 'select') {
        result.valid = false;
        result.isReadOnly = false;
        result.errors.push(`Query type '${ast.type}' is not allowed. Only SELECT queries are permitted.`);
      }

      // Check tables and columns using tableList
      const tableList = this.parser.tableList(sql, { database: 'postgresql' });
      
      for (const tableEntry of tableList) {
        const parts = typeof tableEntry === 'string' ? tableEntry.split('::') : tableEntry;
        const tableName = parts.length === 3 ? parts[2] : parts[1];
        
        if (!tableName) continue;
        
        result.tablesAccessed.push(tableName.toLowerCase());
        
        // System catalog check
        if (tableName.startsWith('pg_') || tableName.startsWith('information_schema')) {
          result.valid = false;
          result.errors.push(`Access to system catalog table '${tableName}' is forbidden.`);
        }
        
        // Allowed tables check
        if (!this.allowedTables.includes(tableName.toLowerCase()) && !tableName.includes('current_period') && !tableName.includes('prior_period')) {
           result.valid = false;
           result.errors.push(`Access to table '${tableName}' is not allowed.`);
        }
      }

      // Basic PII text check (since node-sql-parser doesn't easily expose all accessed columns reliably across complex ASTs)
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('*')) {
         // Check if querying customers
         if (sqlLower.includes('customers')) {
             result.hasPIIAccess = true;
         }
      }
      
      for (const pii of this.piiColumns) {
         if (sqlLower.includes(pii)) {
             result.hasPIIAccess = true;
             // In a real prod environment we might block this outright, but here we just flag it
         }
      }

    } catch (e: any) {
      result.valid = false;
      result.errors.push(`SQL Parsing Error: ${e.message}`);
    }

    if (result.errors.length > 0) {
      result.valid = false;
    }

    return result;
  }
}
