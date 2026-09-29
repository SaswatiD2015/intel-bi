import {
  QueryPlanOutput,
  SqlGenerationOutput,
  InsightGenerationOutput
} from '../../schemas/ai';

export interface QueryPlanPromptInput {
  question: string;
  role: string;
  regionScope: string[];
  glossary: any[];
  metrics: any[];
  examples: any[];
  clarificationAnswers?: any[];
}

export interface SQLGenerationPromptInput {
  plan: QueryPlanOutput;
  metricDefinition: any;
  schemaContext: any;
  approvedJoinPaths: any;
}

export interface InsightPromptInput {
  queryResults: any[];
  plan: QueryPlanOutput;
  dataQualityStatus: string;
  realScore: string;
  causalEvidence: boolean;
}

export interface AIProvider {
  createQueryPlan(input: QueryPlanPromptInput): Promise<QueryPlanOutput>;
  generateSQL(input: SQLGenerationPromptInput): Promise<SqlGenerationOutput>;
  generateInsight(input: InsightPromptInput): Promise<InsightGenerationOutput>;
}

// ----------------------------------------------------------------------------
// MOCK AI PROVIDER
// ----------------------------------------------------------------------------

export class MockAIProvider implements AIProvider {
  async createQueryPlan(input: QueryPlanPromptInput): Promise<QueryPlanOutput> {
    const q = input.question.toLowerCase();
    const isSales = q.includes('sales') || q.includes('revenue');
    
    // Demonstrate clarification needed
    if (q === 'show sales last quarter') {
       return {
         intent: 'Clarify sales metric',
         questionType: 'DESCRIPTIVE',
         metricKey: null,
         metricDefinitionId: null,
         dimensions: [],
         filters: [],
         timeRange: null,
         comparison: null,
         requestedVisualization: null,
         tables: [],
         approvedJoinPathIds: [],
         assumptions: [],
         clarificationNeeded: true,
         clarificationQuestion: "‘Sales’ can refer to different approved metrics. Which definition would you like to use?",
         clarificationOptions: [
           { id: "completed_order_revenue", label: "Completed-order revenue", description: "Revenue from completed orders only." },
           { id: "gross_revenue", label: "Gross revenue", description: "Revenue before discounts and returns." },
           { id: "net_revenue", label: "Net revenue", description: "Revenue after discounts, returns, and refunds." }
         ]
       };
    }
    
    return {
      intent: 'Mock analytical intent',
      questionType: 'DESCRIPTIVE',
      metricKey: isSales ? 'completed_order_revenue' : 'active_customer_count',
      metricDefinitionId: 'mock-id-123',
      dimensions: ['region'],
      filters: [],
      timeRange: { type: 'last_quarter', startDate: null, endDate: null, label: null },
      comparison: null,
      requestedVisualization: 'BAR',
      tables: ['orders', 'order_items', 'regions'],
      approvedJoinPathIds: ['orders-regions', 'orders-order_items'],
      assumptions: ['Assuming standard business calendar'],
      clarificationNeeded: false,
      clarificationQuestion: null,
      clarificationOptions: []
    };
  }

  async generateSQL(input: SQLGenerationPromptInput): Promise<SqlGenerationOutput> {
    // Generate Postgres specific SQL
    let sql = `
      SELECT r.name as region, SUM(oi.quantity * oi."unitPrice") as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      JOIN regions r ON o."regionId" = r.id
      WHERE o.status = 'COMPLETED'
      GROUP BY r.name
      ORDER BY revenue DESC
    `;
    
    return {
      sql,
      parameterValues: [],
      explanation: 'Calculates revenue grouped by region.',
      tablesUsed: ['orders', 'order_items', 'regions'],
      columnsUsed: ['name', 'quantity', 'unit_price', 'status'],
      joinsUsed: ['orders-order_items', 'orders-regions'],
      assumptions: ['Using COMPLETED orders only as per definition.']
    };
  }

  async generateInsight(input: InsightPromptInput): Promise<InsightGenerationOutput> {
    return {
      headline: 'Strong revenue in South Region',
      summary: 'The query results indicate that the South region contributed the highest completed-order revenue.',
      keyFindings: ['South region is #1', 'North region follows closely'],
      driversOrAssociations: ['Possible association with recent marketing campaign'],
      recommendedNextQuestions: ['What is the average order value by region?', 'What is the churn risk in South?'],
      confidence: input.realScore === 'HIGH' ? 'HIGH' : 'MEDIUM',
      confidenceReason: 'Results align with standard business definitions.',
      assumptions: ['Assuming all completed orders are paid.'],
      limitations: ['Does not account for future returns.'],
      causalityNotice: input.causalEvidence ? '' : 'This analysis can show trends and associations but cannot prove that one factor caused another.'
    };
  }
}
