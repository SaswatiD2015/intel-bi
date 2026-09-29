// ============================================================================
// RealOnes BI - AI Provider Abstraction & Mock Provider
// ============================================================================

import type { QueryPlan, RealInsight, SQLGenerationResult, SemanticContext, UserContext } from '@/lib/types';
import { normalizeQuestion } from '@/lib/utils';

// Provider interface
export interface AIProvider {
  name: string;
  generateQueryPlan(question: string, context: SemanticContext, userContext: UserContext): Promise<AIProviderResult<QueryPlan>>;
  generateSQL(plan: QueryPlan, context: SemanticContext, userContext: UserContext): Promise<AIProviderResult<SQLGenerationResult>>;
  generateInsight(resultData: Record<string, unknown>[], metricDef: string, plan: QueryPlan, dqChecks: string): Promise<AIProviderResult<RealInsight>>;
}

export interface AIProviderResult<T> {
  result: T;
  tokenUsage: number;
  latencyMs: number;
  modelName: string;
  promptVersion: string;
}

// System prompts
export const SYSTEM_PROMPTS = {
  queryPlanning: `You are RealOnes Copilot, a governed business-intelligence query planner.
Convert a business user's question into a structured query plan using only the
supplied business glossary, approved metric definitions, permitted schema
metadata, approved join paths, verified query examples, and user access scope.

Never invent metrics, tables, columns, filters, joins, business definitions,
time ranges, or data sources.

If a metric, period, geography, grouping, comparison, business definition, or
scope is ambiguous or unavailable, set clarification_needed to true. Ask one
concise clarification question and provide selectable options when possible.

Classify the request as descriptive, diagnostic, predictive, or causal.
A question containing 'why' must default to diagnostic association unless
formal causal evidence is explicitly supplied.

For causal questions, do not assume correlation proves causation. If causal
evidence is not supplied, set the plan to request or state the need for causal
evidence.

Return valid JSON only and exactly match the supplied Query Plan schema.`,

  sqlGeneration: `You are RealOnes Copilot, a secure PostgreSQL Text-to-SQL generator for a
governed business-intelligence platform.

Generate exactly one read-only SQL query from the approved structured query plan
and supplied schema context.

Use only:
- approved metrics
- supplied tables
- supplied columns
- approved join paths
- permitted filters
- user-authorized regional scope

Never invent schema elements.

Only SELECT queries and CTE queries with a final SELECT are allowed.

Respect row-level access restrictions.
Ensure aggregation grain matches the structured plan.
Use a LIMIT for detail-level results.
Return JSON only.`,

  insightNarrative: `You are RealOnes Copilot, a cautious business-insight writer.

Write insights only from supplied SQL query results, approved metric definition,
supplied comparison calculations, supplied data-quality checks, supplied
freshness metadata, and supplied validation metadata.

Never invent facts, figures, percentages, causes, trends, data sources,
customer details, or business context.

Every numeric claim must exactly match the supplied result data.

Use 'associated with' for diagnostic observations.
Use 'forecast suggests' for predictive findings.
Use 'causal evidence is unavailable' when a causal conclusion cannot be supported.

Return valid JSON only.`,
};

// ============================================================================
// MOCK AI PROVIDER - Deterministic, no external API needed
// ============================================================================

export class MockAIProvider implements AIProvider {
  name = 'mock-provider';

  async generateQueryPlan(
    question: string,
    context: SemanticContext,
    userContext: UserContext
  ): Promise<AIProviderResult<QueryPlan>> {
    const startTime = Date.now();
    const normalizedQ = normalizeQuestion(question);

    // Detect question type
    let questionType: QueryPlan['question_type'] = 'descriptive';
    if (/\bwhy\b/.test(normalizedQ)) questionType = 'diagnostic';
    if (/\bwill\b|\bpredict|\bforecast|\bexpect/.test(normalizedQ)) questionType = 'predictive';
    if (/\bcause[d]?\b|\bcausal\b/.test(normalizedQ)) questionType = 'causal';

    // Check for ambiguous terms
    const ambiguousTerms: Record<string, string[]> = {
      'sales': ['completed-order-revenue', 'gross-revenue', 'net-revenue'],
      'revenue': ['completed-order-revenue', 'gross-revenue', 'net-revenue'],
    };

    // Check if the question has only ambiguous terms without qualifiers
    for (const [term, slugs] of Object.entries(ambiguousTerms)) {
      if (normalizedQ.includes(term) &&
        !normalizedQ.includes('completed') &&
        !normalizedQ.includes('gross') &&
        !normalizedQ.includes('net')) {
        const matchedMetrics = context.metricDefinitions.filter(m => slugs.includes(m.slug));
        if (matchedMetrics.length > 1) {
          return {
            result: {
              intent: question,
              question_type: questionType,
              metric: '',
              metric_definition_id: '',
              dimensions: [],
              filters: [],
              time_range: '',
              comparison: '',
              tables: [],
              approved_join_paths: [],
              requested_visualization: '',
              assumptions: [],
              clarification_needed: true,
              clarification_question: `'${term}' can refer to different approved metrics. Which one would you like to use?`,
              clarification_options: matchedMetrics.map(m => `${m.name}: ${m.definition}`),
            },
            tokenUsage: 150,
            latencyMs: Date.now() - startTime,
            modelName: this.name,
            promptVersion: 'v1.0-mock',
          };
        }
      }
    }

    // Match metric
    const matchedMetric = findBestMetric(normalizedQ, context.metricDefinitions);

    // Extract time range
    const timeRange = extractTimeRange(normalizedQ);

    // Extract dimensions
    const dimensions: string[] = [];
    if (/\bby\s+month\b/.test(normalizedQ)) dimensions.push('month');
    if (/\bby\s+region\b/.test(normalizedQ)) dimensions.push('region');
    if (/\bby\s+category\b/.test(normalizedQ)) dimensions.push('product_category');
    if (/\bacross\s+regions?\b/.test(normalizedQ)) dimensions.push('region');
    if (/\bby\s+product\b/.test(normalizedQ)) dimensions.push('product');
    if (dimensions.length === 0 && /\bmonth\b/.test(normalizedQ)) dimensions.push('month');

    // Determine visualization
    let visualization = 'table';
    if (dimensions.includes('month')) visualization = 'line';
    if (dimensions.includes('region') || dimensions.includes('product_category')) visualization = 'bar';
    if (/\bcompare\b/.test(normalizedQ)) visualization = 'bar';

    // Build tables from metric
    const tables = matchedMetric ? matchedMetric.sourceTables : ['orders', 'order_items'];

    // Add churn-specific logic
    if (/\bchurn\b/.test(normalizedQ)) {
      const plan: QueryPlan = {
        intent: question,
        question_type: 'predictive',
        metric: 'Churn Risk',
        metric_definition_id: context.metricDefinitions.find(m => m.slug === 'churn-risk')?.id || '',
        dimensions: ['customer_id', 'churn_score', 'risk_level'],
        filters: [{ risk_level: 'high' }],
        time_range: timeRange,
        comparison: '',
        tables: ['customers', 'customer_churn_scores'],
        approved_join_paths: ['customers-churn-scores'],
        requested_visualization: 'table',
        assumptions: ['Churn risk is predictive, not confirmed churn.'],
        clarification_needed: false,
        clarification_question: '',
        clarification_options: [],
      };

      // Check region filter
      if (/\bsouth\b/i.test(question)) {
        plan.filters.push({ region: 'South' });
      }

      return {
        result: plan,
        tokenUsage: 200,
        latencyMs: Date.now() - startTime,
        modelName: this.name,
        promptVersion: 'v1.0-mock',
      };
    }

    const plan: QueryPlan = {
      intent: question,
      question_type: questionType,
      metric: matchedMetric?.name || 'Completed-Order Revenue',
      metric_definition_id: matchedMetric?.id || '',
      dimensions,
      filters: [],
      time_range: timeRange,
      comparison: questionType === 'diagnostic' ? 'prior_period' : '',
      tables,
      approved_join_paths: tables.length > 1 ? ['orders-order_items'] : [],
      requested_visualization: visualization,
      assumptions: questionType === 'diagnostic'
        ? ['This analysis identifies associations and possible contributors. It does not prove that one factor caused another.']
        : [],
      clarification_needed: false,
      clarification_question: '',
      clarification_options: [],
    };

    // Add causal warning
    if (questionType === 'causal') {
      plan.assumptions.push('Causal evidence is unavailable in the current data model.');
      plan.clarification_needed = false; // Still proceed with diagnostic alternative
    }

    return {
      result: plan,
      tokenUsage: 200,
      latencyMs: Date.now() - startTime,
      modelName: this.name,
      promptVersion: 'v1.0-mock',
    };
  }

  async generateSQL(
    plan: QueryPlan,
    context: SemanticContext,
    userContext: UserContext
  ): Promise<AIProviderResult<SQLGenerationResult>> {
    const startTime = Date.now();

    // Region filter
    const regionFilter = userContext.regionIds.length > 0 && userContext.roles.includes('business_user')
      ? `AND o.region_id IN (${userContext.regionIds.map(id => `'${id}'`).join(', ')})`
      : '';

    let sql = '';
    let explanation = '';
    const tablesUsed: string[] = [];
    const columnsUsed: string[] = [];
    const joinsUsed: string[] = [];
    const assumptions: string[] = [...plan.assumptions];

    // Generate SQL based on metric and dimensions
    const metricSlug = context.metricDefinitions.find(m => m.id === plan.metric_definition_id)?.slug || '';

    if (/churn/i.test(plan.metric)) {
      // Churn risk query
      const riskFilter = plan.filters.some(f => (f as Record<string, string>).risk_level === 'high')
        ? "AND ccs.risk_level = 'high'"
        : '';
      const regionJoin = plan.filters.some(f => (f as Record<string, string>).region)
        ? `JOIN regions r ON c.region_id = r.id AND r.name = '${(plan.filters.find(f => (f as Record<string, string>).region) as Record<string, string>)?.region}'`
        : `JOIN regions r ON c.region_id = r.id`;

      sql = `SELECT c.customer_id, ccs.churn_score, ccs.risk_level, r.name as region
FROM customers c
JOIN customer_churn_scores ccs ON c.id = ccs.customer_id
${regionJoin}
WHERE 1=1 ${riskFilter} ${regionFilter.replace('o.region_id', 'c.region_id')}
ORDER BY ccs.churn_score DESC
LIMIT 100`;

      explanation = 'Retrieves customers with churn risk scores, filtered by risk level and region.';
      tablesUsed.push('customers', 'customer_churn_scores', 'regions');
      columnsUsed.push('customer_id', 'churn_score', 'risk_level', 'region');
      joinsUsed.push('customers-churn_scores', 'customers-regions');
      assumptions.push('Churn risk is a predictive score, not confirmed churn.');
    } else if (metricSlug === 'return-rate' || /\breturn\s*rate\b/i.test(plan.metric)) {
      // Return rate by category
      sql = `SELECT pc.name as category,
  SUM(ret.quantity_returned) as returned_qty,
  SUM(oi.quantity) as sold_qty,
  ROUND(CAST(SUM(ret.quantity_returned) AS DECIMAL) / NULLIF(SUM(oi.quantity), 0) * 100, 2) as return_rate
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN returns ret ON o.id = ret.order_id
WHERE o.status = 'completed' ${regionFilter}
GROUP BY pc.name
ORDER BY return_rate DESC`;

      explanation = 'Calculates return rate by product category.';
      tablesUsed.push('orders', 'order_items', 'products', 'product_categories', 'returns');
      columnsUsed.push('category', 'returned_qty', 'sold_qty', 'return_rate');
    } else if (plan.question_type === 'diagnostic') {
      // Diagnostic query - compare periods
      sql = `WITH current_period AS (
  SELECT r.name as region, pc.name as category,
    COUNT(DISTINCT o.id) as order_count,
    SUM(oi.quantity * oi.unit_price) as revenue,
    AVG(oi.quantity * oi.unit_price) as avg_order_value
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN regions r ON o.region_id = r.id
  JOIN products p ON oi.product_id = p.id
  JOIN product_categories pc ON p.category_id = pc.id
  WHERE o.status = 'completed'
    AND o.order_date >= (strftime('%s', 'now', 'start of month', '-1 month') * 1000)
    AND o.order_date < (strftime('%s', 'now', 'start of month') * 1000)
    ${regionFilter}
  GROUP BY r.name, pc.name
),
prior_period AS (
  SELECT r.name as region, pc.name as category,
    COUNT(DISTINCT o.id) as order_count,
    SUM(oi.quantity * oi.unit_price) as revenue,
    AVG(oi.quantity * oi.unit_price) as avg_order_value
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  JOIN regions r ON o.region_id = r.id
  JOIN products p ON oi.product_id = p.id
  JOIN product_categories pc ON p.category_id = pc.id
  WHERE o.status = 'completed'
    AND o.order_date >= (strftime('%s', 'now', 'start of month', '-2 months') * 1000)
    AND o.order_date < (strftime('%s', 'now', 'start of month', '-1 month') * 1000)
    ${regionFilter}
  GROUP BY r.name, pc.name
)
SELECT cp.region, cp.category,
  cp.revenue as current_revenue, pp.revenue as prior_revenue,
  ROUND(((cp.revenue - pp.revenue) / NULLIF(pp.revenue, 0)) * 100, 2) as revenue_change_pct,
  cp.order_count as current_orders, pp.order_count as prior_orders
FROM current_period cp
LEFT JOIN prior_period pp ON cp.region = pp.region AND cp.category = pp.category
ORDER BY revenue_change_pct ASC`;

      explanation = 'Compares current month vs. prior month by region and category to identify possible contributors to changes.';
      tablesUsed.push('orders', 'order_items', 'regions', 'products', 'product_categories');
      columnsUsed.push('region', 'category', 'revenue', 'order_count', 'revenue_change_pct');
      assumptions.push('This analysis identifies associations and possible contributors. It does not prove that one factor caused another.');
    } else if (plan.dimensions.includes('month')) {
      // Monthly trend
      const timeFilter = plan.time_range
        ? getTimeFilter(plan.time_range)
        : "AND o.order_date >= (strftime('%s', 'now', 'start of year') * 1000)";

      sql = `SELECT strftime('%Y-%m', o.order_date / 1000, 'unixepoch') as month,
  SUM(oi.quantity * oi.unit_price) as revenue,
  COUNT(DISTINCT o.id) as order_count
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'completed' ${timeFilter} ${regionFilter}
GROUP BY strftime('%Y-%m', o.order_date / 1000, 'unixepoch')
ORDER BY month`;

      explanation = `Calculates ${plan.metric} by month for ${plan.time_range || 'current year'}.`;
      tablesUsed.push('orders', 'order_items');
      columnsUsed.push('month', 'revenue', 'order_count');
      joinsUsed.push('orders-order_items');
    } else if (plan.dimensions.includes('region')) {
      // Region comparison
      sql = `SELECT r.name as region,
  SUM(oi.quantity * oi.unit_price) as revenue,
  SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cost_price) as gross_profit,
  COUNT(DISTINCT o.id) as order_count
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN regions r ON o.region_id = r.id
JOIN products p ON oi.product_id = p.id
WHERE o.status = 'completed' ${regionFilter}
GROUP BY r.name
ORDER BY revenue DESC`;

      explanation = `Compares ${plan.metric} across regions.`;
      tablesUsed.push('orders', 'order_items', 'regions', 'products');
      columnsUsed.push('region', 'revenue', 'gross_profit', 'order_count');
    } else if (plan.dimensions.includes('product_category')) {
      sql = `SELECT pc.name as category,
  SUM(oi.quantity * oi.unit_price) as revenue,
  COUNT(DISTINCT o.id) as order_count,
  AVG(oi.quantity * oi.unit_price) as avg_order_value
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN product_categories pc ON p.category_id = pc.id
WHERE o.status = 'completed' ${regionFilter}
GROUP BY pc.name
ORDER BY revenue DESC`;

      explanation = `Analyzes ${plan.metric} by product category.`;
      tablesUsed.push('orders', 'order_items', 'products', 'product_categories');
      columnsUsed.push('category', 'revenue', 'order_count', 'avg_order_value');
    } else {
      // Default summary query
      const timeFilter = plan.time_range
        ? getTimeFilter(plan.time_range)
        : '';

      sql = `SELECT
  SUM(oi.quantity * oi.unit_price) as total_revenue,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.customer_id) as active_customers,
  AVG(oi.quantity * oi.unit_price) as avg_order_value
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'completed' ${timeFilter} ${regionFilter}`;

      explanation = `Calculates summary ${plan.metric} metrics.`;
      tablesUsed.push('orders', 'order_items');
      columnsUsed.push('total_revenue', 'total_orders', 'active_customers', 'avg_order_value');
    }

    return {
      result: {
        sql,
        parameter_values: [],
        explanation,
        tables_used: tablesUsed,
        columns_used: columnsUsed,
        joins_used: joinsUsed,
        assumptions,
      },
      tokenUsage: 300,
      latencyMs: Date.now() - startTime,
      modelName: this.name,
      promptVersion: 'v1.0-mock',
    };
  }

  async generateInsight(
    resultData: Record<string, unknown>[],
    metricDef: string,
    plan: QueryPlan,
    dqChecks: string
  ): Promise<AIProviderResult<RealInsight>> {
    const startTime = Date.now();

    if (!resultData || resultData.length === 0) {
      return {
        result: {
          headline: 'No data returned for this query.',
          summary: 'The query executed successfully but returned no results for the given filters and time range.',
          key_findings: ['No data matches the specified criteria.'],
          drivers_or_associations: [],
          recommended_next_questions: [
            'Try expanding the time range.',
            'Check if the selected filters are too restrictive.',
          ],
          confidence: 'low',
          confidence_reason: 'No result data available for analysis.',
          assumptions: plan.assumptions,
          limitations: ['No data to analyze.'],
          causality_notice: '',
        },
        tokenUsage: 100,
        latencyMs: Date.now() - startTime,
        modelName: this.name,
        promptVersion: 'v1.0-mock',
      };
    }

    // Build insight from actual data
    const keyFindings: string[] = [];
    const drivers: string[] = [];

    // Analyze data based on type
    if (resultData[0] && 'month' in resultData[0]) {
      // Time series data
      const sorted = [...resultData].sort((a, b) =>
        new Date(String(a.month)).getTime() - new Date(String(b.month)).getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstRev = Number(first?.revenue || 0);
      const lastRev = Number(last?.revenue || 0);
      const change = firstRev > 0 ? ((lastRev - firstRev) / firstRev * 100) : 0;

      keyFindings.push(
        `Revenue ranged from ${formatVal(firstRev)} to ${formatVal(lastRev)} over the period.`
      );
      if (change > 0) {
        keyFindings.push(`Overall trend shows a ${change.toFixed(1)}% increase from the first to last period.`);
      } else if (change < 0) {
        keyFindings.push(`Overall trend shows a ${Math.abs(change).toFixed(1)}% decrease from the first to last period.`);
      }
    } else if (resultData[0] && 'region' in resultData[0]) {
      // Regional comparison
      const sorted = [...resultData].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
      keyFindings.push(`${sorted[0]?.region} leads with ${formatVal(Number(sorted[0]?.revenue || 0))} in revenue.`);
      if (sorted.length > 1) {
        keyFindings.push(`${sorted[sorted.length - 1]?.region} has the lowest revenue at ${formatVal(Number(sorted[sorted.length - 1]?.revenue || 0))}.`);
      }
    } else if (resultData[0] && 'category' in resultData[0]) {
      // Category analysis
      const sorted = [...resultData].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
      keyFindings.push(`Top category: ${sorted[0]?.category} with ${formatVal(Number(sorted[0]?.revenue || 0))}.`);
    } else if (resultData[0] && 'total_revenue' in resultData[0]) {
      // Summary metrics
      const d = resultData[0];
      keyFindings.push(`Total Revenue: ${formatVal(Number(d.total_revenue || 0))}`);
      keyFindings.push(`Total Orders: ${Number(d.total_orders || 0).toLocaleString()}`);
      keyFindings.push(`Active Customers: ${Number(d.active_customers || 0).toLocaleString()}`);
    } else if (resultData[0] && 'churn_score' in resultData[0]) {
      keyFindings.push(`${resultData.length} customers identified with churn risk scores.`);
      const highRisk = resultData.filter(r => r.risk_level === 'high').length;
      keyFindings.push(`${highRisk} customers classified as high churn risk.`);
    }

    // Diagnostic drivers
    if (plan.question_type === 'diagnostic' && 'revenue_change_pct' in (resultData[0] || {})) {
      const decliners = resultData.filter(r => Number(r.revenue_change_pct || 0) < 0)
        .sort((a, b) => Number(a.revenue_change_pct || 0) - Number(b.revenue_change_pct || 0));
      for (const d of decliners.slice(0, 3)) {
        drivers.push(`${d.region}/${d.category} showed a ${Math.abs(Number(d.revenue_change_pct || 0)).toFixed(1)}% decline, which is associated with lower order counts.`);
      }
    }

    let causalityNotice = '';
    if (plan.question_type === 'causal') {
      causalityNotice = 'Causal evidence is unavailable in the current data model. The analysis shows associations, not proven causes.';
    } else if (plan.question_type === 'diagnostic') {
      causalityNotice = 'This analysis identifies associations and possible contributors. It does not prove that one factor caused another.';
    }

    return {
      result: {
        headline: `${plan.metric} Analysis — ${plan.question_type.charAt(0).toUpperCase() + plan.question_type.slice(1)}`,
        summary: `Analysis of ${plan.metric.toLowerCase()} based on ${resultData.length} data points. ${plan.time_range ? `Time range: ${plan.time_range}.` : ''}`,
        key_findings: keyFindings,
        drivers_or_associations: drivers,
        recommended_next_questions: [
          'How does this compare to the same period last year?',
          'Which product categories drove the most change?',
          'What is the trend over the last 6 months?',
        ],
        confidence: 'high',
        confidence_reason: 'Approved metric definition used, SQL validated, data quality checks passed.',
        assumptions: plan.assumptions,
        limitations: ['Based on available data only.', 'Excludes cancelled and returned orders unless specified.'],
        causality_notice: causalityNotice,
      },
      tokenUsage: 250,
      latencyMs: Date.now() - startTime,
      modelName: this.name,
      promptVersion: 'v1.0-mock',
    };
  }
}

// Helper functions
function findBestMetric(
  normalizedQ: string,
  metrics: SemanticContext['metricDefinitions']
): SemanticContext['metricDefinitions'][0] | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const metric of metrics) {
    let score = 0;
    const nameWords = metric.name.toLowerCase().split(/[\s-]+/);
    for (const word of nameWords) {
      if (normalizedQ.includes(word)) score += 3;
    }
    for (const syn of metric.synonyms) {
      if (normalizedQ.includes(syn.toLowerCase())) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

function extractTimeRange(normalizedQ: string): string {
  if (/\blast\s+quarter\b/.test(normalizedQ)) return 'last_quarter';
  if (/\bthis\s+quarter\b/.test(normalizedQ)) return 'this_quarter';
  if (/\blast\s+month\b/.test(normalizedQ)) return 'last_month';
  if (/\bthis\s+month\b/.test(normalizedQ)) return 'this_month';
  if (/\blast\s+year\b/.test(normalizedQ)) return 'last_year';
  if (/\bthis\s+year\b/.test(normalizedQ)) return 'this_year';
  if (/\b202[4-9]\b/.test(normalizedQ)) {
    const match = normalizedQ.match(/\b(202[4-9])\b/);
    return `year_${match?.[1]}`;
  }
  if (/\bin\s+2025\b/.test(normalizedQ)) return 'year_2025';
  return '';
}

function getTimeFilter(timeRange: string): string {
  switch (timeRange) {
    case 'last_quarter':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of month', '-3 months') * 1000) AND o.order_date < (strftime('%s', 'now', 'start of month') * 1000)";
    case 'this_quarter':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of month', '-2 months') * 1000)"; 
    case 'last_month':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of month', '-1 month') * 1000) AND o.order_date < (strftime('%s', 'now', 'start of month') * 1000)";
    case 'this_month':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of month') * 1000)";
    case 'last_year':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of year', '-1 year') * 1000) AND o.order_date < (strftime('%s', 'now', 'start of year') * 1000)";
    case 'this_year':
      return "AND o.order_date >= (strftime('%s', 'now', 'start of year') * 1000)";
    default:
      if (timeRange.startsWith('year_')) {
        const year = timeRange.replace('year_', '');
        return `AND o.order_date >= (strftime('%s', '${year}-01-01') * 1000) AND o.order_date < (strftime('%s', '${parseInt(year) + 1}-01-01') * 1000)`;
      }
      return '';
  }
}

function formatVal(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// Get the configured AI provider
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'mock';

  switch (provider) {
    case 'mock':
    default:
      return new MockAIProvider();
    // case 'openai':
    //   return new OpenAIProvider(); // Future implementation
  }
}
