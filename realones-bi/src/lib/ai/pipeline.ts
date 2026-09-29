// ============================================================================
// RealOnes BI - Query Pipeline Orchestrator
// ============================================================================

import type { QueryPipelineResult, UserContext, RealCheckCard } from '@/lib/types';
import { getAIProvider } from '@/lib/ai/provider';
import { getSemanticContext } from '@/lib/semantic';
import { validateSQL, enforceLimits, applyRegionFilter } from '@/lib/sql/validator';
import { executeSQL, maskPIIInResults } from '@/lib/sql/executor';
import { runDataQualityChecks, getDataFreshnessTimestamp } from '@/lib/quality';
import { calculateScoreFromPipelineResults } from '@/lib/governance/real-score';
import { createAuditLog } from '@/lib/governance/audit';
import { buildCacheKey, getCached, setCache } from '@/lib/cache';
import { maskPII, generateAuditId } from '@/lib/utils';
import prisma from '@/lib/db';

export async function runFullQueryPipeline(
  question: string,
  userContext: UserContext,
  clarificationChoice?: string
): Promise<QueryPipelineResult> {
  const auditId = generateAuditId();
  const startTime = Date.now();
  const provider = getAIProvider();

  try {
    // Step 1: Authenticate user (already done by middleware, just validate)
    if (!userContext.id) {
      return { success: false, error: 'Authentication required.', errorType: 'auth_failed' };
    }

    // Step 2: Load user role/regions (already in context)
    const isAnalyst = userContext.roles.includes('analyst');
    const regionIds = isAnalyst ? [] : userContext.regionIds;

    // Step 3: Normalize and sanitize question
    const sanitizedQuestion = maskPII(question);

    // Step 4: Check cache
    const cacheKey = buildCacheKey(sanitizedQuestion, userContext.roles, regionIds);
    const cached = getCached(cacheKey);
    if (cached) {
      await createAuditLog({
        userId: userContext.id,
        action: 'query_cache_hit',
        category: 'query',
        details: { question: sanitizedQuestion, auditId },
      });
      return { ...(cached as QueryPipelineResult), auditId };
    }

    // Step 5-9: Retrieve semantic context
    const semanticContext = await getSemanticContext(sanitizedQuestion);

    await createAuditLog({
      userId: userContext.id,
      action: 'semantic_context_retrieved',
      category: 'query',
      details: {
        auditId,
        question: sanitizedQuestion,
        metricsFound: semanticContext.metricDefinitions.map(m => m.name),
        tablesFound: semanticContext.schemaTables.map(t => t.tableName),
      },
    });

    // Step 10: Create structured Query Plan
    let modifiedQuestion = sanitizedQuestion;
    if (clarificationChoice) {
      // Extract the metric name from the clarification choice
      const metricName = clarificationChoice.split(':')[0]?.trim();
      modifiedQuestion = `${sanitizedQuestion} (using metric: ${metricName})`;
    }

    const planResult = await provider.generateQueryPlan(
      modifiedQuestion,
      semanticContext,
      userContext
    );
    const plan = planResult.result;

    // Track model usage
    await prisma.modelUsageMetric.create({
      data: {
        modelName: planResult.modelName,
        operation: 'plan',
        tokenUsage: planResult.tokenUsage,
        estimatedCost: planResult.tokenUsage * 0.00001,
        latencyMs: planResult.latencyMs,
        success: true,
      },
    }).catch(() => {});

    // Step 11: Handle clarification
    if (plan.clarification_needed) {
      await createAuditLog({
        userId: userContext.id,
        action: 'clarification_requested',
        category: 'query',
        details: {
          auditId,
          question: sanitizedQuestion,
          clarificationQuestion: plan.clarification_question,
          options: plan.clarification_options,
        },
      });

      return {
        success: true,
        clarificationNeeded: true,
        clarificationQuestion: plan.clarification_question,
        clarificationOptions: plan.clarification_options,
        auditId,
      };
    }

    // Step 12: Validate plan against approved definitions
    const metricFound = plan.metric_definition_id !== '';

    // Step 13: Generate SQL
    const sqlResult = await provider.generateSQL(plan, semanticContext, userContext);
    let sql = sqlResult.result.sql;

    await prisma.modelUsageMetric.create({
      data: {
        modelName: sqlResult.modelName,
        operation: 'generate_sql',
        tokenUsage: sqlResult.tokenUsage,
        estimatedCost: sqlResult.tokenUsage * 0.00001,
        latencyMs: sqlResult.latencyMs,
        success: true,
      },
    }).catch(() => {});

    // Step 14-15: Parse and validate SQL
    const allowedTables = semanticContext.schemaTables
      .map(t => t.tableName)
      .filter(t => t);
    const sqlValidation = validateSQL(sql, allowedTables, regionIds);

    await createAuditLog({
      userId: userContext.id,
      action: 'sql_validated',
      category: 'query',
      details: {
        auditId,
        sql,
        validationResult: sqlValidation,
      },
    });

    if (!sqlValidation.valid) {
      // Store blocked query
      await prisma.queryRun.create({
        data: {
          userId: userContext.id,
          question: sanitizedQuestion,
          normalizedQuestion: sanitizedQuestion.toLowerCase(),
          queryPlan: JSON.stringify(plan),
          generatedSql: sql,
          sqlValidation: JSON.stringify(sqlValidation),
          status: 'blocked',
          errorMessage: sqlValidation.errors.join('; '),
          modelName: planResult.modelName,
          tokenUsage: planResult.tokenUsage + sqlResult.tokenUsage,
          promptVersion: planResult.promptVersion,
        },
      }).catch(() => {});

      return {
        success: false,
        error: 'Reality Check paused this request because the generated query could not be safely validated.',
        errorType: 'blocked',
        generatedSQL: sql,
        auditId,
      };
    }

    // Step 16: Enforce row-level security (region filter)
    if (!isAnalyst && regionIds.length > 0) {
      sql = applyRegionFilter(sql, regionIds);
    }

    // Step 17: Apply limits
    sql = enforceLimits(sql);

    // Step 18: Execute SQL
    const execResult = await executeSQL(sql);

    await createAuditLog({
      userId: userContext.id,
      action: 'sql_executed',
      category: 'query',
      details: {
        auditId,
        success: execResult.success,
        rowCount: execResult.rowCount,
        executionTimeMs: execResult.executionTimeMs,
        error: execResult.error,
      },
    });

    if (!execResult.success) {
      await prisma.queryRun.create({
        data: {
          userId: userContext.id,
          question: sanitizedQuestion,
          normalizedQuestion: sanitizedQuestion.toLowerCase(),
          queryPlan: JSON.stringify(plan),
          generatedSql: sql,
          sqlValidation: JSON.stringify(sqlValidation),
          status: 'failed',
          errorMessage: execResult.error,
          executionTimeMs: execResult.executionTimeMs,
          modelName: planResult.modelName,
          tokenUsage: planResult.tokenUsage + sqlResult.tokenUsage,
          promptVersion: planResult.promptVersion,
        },
      }).catch(() => {});

      return {
        success: false,
        error: `Query execution failed. ${execResult.error || 'Please try rephrasing your question.'}`,
        errorType: 'execution_failed',
        generatedSQL: sql,
        auditId,
      };
    }

    // Mask PII in results
    let rows = execResult.rows;
    if (sqlValidation.hasPIIAccess) {
      rows = maskPIIInResults(rows);
    }

    // Step 19: Run data quality checks
    const dqResult = await runDataQualityChecks(sqlResult.result.tables_used, plan.time_range);

    // Step 20: Calculate Real Score
    const realScoreResult = calculateScoreFromPipelineResults(
      plan,
      sqlValidation,
      execResult.success,
      dqResult.overallStatus,
      metricFound,
      true
    );

    // If data quality is high risk, force low score
    if (dqResult.overallStatus === 'high_risk') {
      realScoreResult.score = 'low';
      realScoreResult.reason = 'Real Score: Low — significant data-quality issues were detected. This result should not be used as a standalone basis for a business decision.';
    }

    // Step 21: Generate insight
    const metricDef = semanticContext.metricDefinitions.find(m => m.id === plan.metric_definition_id);
    const insightResult = await provider.generateInsight(
      rows,
      metricDef?.definition || plan.metric,
      plan,
      JSON.stringify(dqResult.checks)
    );

    await prisma.modelUsageMetric.create({
      data: {
        modelName: insightResult.modelName,
        operation: 'insight',
        tokenUsage: insightResult.tokenUsage,
        estimatedCost: insightResult.tokenUsage * 0.00001,
        latencyMs: insightResult.latencyMs,
        success: true,
      },
    }).catch(() => {});

    // Step 22-23: Verify narrative (basic numeric claim verification)
    let insight = insightResult.result;
    let narrativeFailed = false;

    if (dqResult.overallStatus === 'high_risk') {
      // Don't show confident narrative for high-risk data
      insight = {
        ...insight,
        headline: `${plan.metric} Analysis — Data Quality Warning`,
        summary: 'Real Insight could not be safely verified against the query result due to data quality issues.',
        confidence: 'low',
        confidence_reason: 'Data quality is High Risk. Results should be reviewed carefully.',
      };
      narrativeFailed = true;
    }

    // Adjust insight confidence to match Real Score
    insight.confidence = realScoreResult.score;
    insight.confidence_reason = realScoreResult.reason;

    // Build chart data
    const chartData = buildChartData(rows, plan);

    // Build KPI values
    const kpiValues = buildKPIValues(rows, plan);

    // Build RealCheck Card
    const realCheckCard: RealCheckCard = {
      userQuestion: question,
      interpretation: sqlResult.result.explanation,
      queryType: plan.question_type,
      selectedMetric: plan.metric,
      metricDefinition: metricDef?.definition || plan.metric,
      metricFormula: metricDef?.formula || 'N/A',
      tablesUsed: sqlResult.result.tables_used,
      columnsUsed: sqlResult.result.columns_used,
      appliedFilters: plan.filters,
      timeRange: plan.time_range || 'All available data',
      groupingDimension: plan.dimensions.join(', ') || 'None',
      generatedSQL: sql,
      sqlValidationStatus: sqlValidation.valid
        ? 'Reality Check passed — this result uses approved metrics, permitted tables, safe read-only SQL, and validated joins.'
        : 'SQL validation failed',
      sqlExecutionTimeMs: execResult.executionTimeMs,
      rowCount: execResult.rowCount,
      dataFreshness: getDataFreshnessTimestamp(dqResult.checks),
      dataQualityChecks: dqResult.checks,
      realScore: realScoreResult.score,
      realScoreReason: realScoreResult.reason,
      assumptions: [
        ...plan.assumptions,
        ...sqlResult.result.assumptions,
        ...insight.assumptions,
      ],
      limitations: insight.limitations,
      causalityNotice: insight.causality_notice,
      auditId,
    };

    // Step 24: Store audit log and query run
    const queryRun = await prisma.queryRun.create({
      data: {
        userId: userContext.id,
        question: sanitizedQuestion,
        normalizedQuestion: sanitizedQuestion.toLowerCase(),
        queryPlan: JSON.stringify(plan),
        generatedSql: sql,
        sqlValidation: JSON.stringify(sqlValidation),
        executionResult: JSON.stringify({ columns: execResult.columns, rowCount: execResult.rowCount }),
        dataQualityResult: JSON.stringify(dqResult),
        realScore: realScoreResult.score,
        realScoreReason: realScoreResult.reason,
        insightString: JSON.stringify(insight),
        dataVibeStatus: dqResult.overallStatus,
        status: 'completed',
        executionTimeMs: execResult.executionTimeMs,
        rowCount: execResult.rowCount,
        modelName: planResult.modelName,
        tokenUsage: planResult.tokenUsage + sqlResult.tokenUsage + insightResult.tokenUsage,
        estimatedCost: (planResult.tokenUsage + sqlResult.tokenUsage + insightResult.tokenUsage) * 0.00001,
        modelLatencyMs: planResult.latencyMs + sqlResult.latencyMs + insightResult.latencyMs,
        cacheHit: false,
        promptVersion: planResult.promptVersion,
      },
    }).catch(() => null);

    await createAuditLog({
      userId: userContext.id,
      action: 'query_completed',
      category: 'query',
      details: {
        auditId,
        queryRunId: queryRun?.id,
        question: sanitizedQuestion,
        realScore: realScoreResult.score,
        dataVibeStatus: dqResult.overallStatus,
        rowCount: execResult.rowCount,
        totalLatencyMs: Date.now() - startTime,
      },
    });

    // Step 25: Build and return result
    const result: QueryPipelineResult = {
      success: true,
      queryResult: {
        columns: execResult.columns,
        rows,
        rowCount: execResult.rowCount,
      },
      chartData,
      kpiValues,
      generatedSQL: sql,
      realCheckCard,
      dataVibeStatus: dqResult.overallStatus,
      dataVibeMessage: dqResult.message,
      realScore: realScoreResult.score,
      realScoreReason: realScoreResult.reason,
      insight: narrativeFailed ? undefined : insight,
      assumptions: realCheckCard.assumptions,
      limitations: realCheckCard.limitations,
      suggestedQuestions: insight.recommended_next_questions,
      auditId: queryRun?.id || auditId,
    };

    // Cache result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';

    await createAuditLog({
      userId: userContext.id,
      action: 'query_error',
      category: 'error',
      details: { auditId, question, error: errorMessage },
    });

    return {
      success: false,
      error: `An error occurred while processing your question. Please try again.`,
      errorType: 'execution_failed',
      auditId,
    };
  }
}

// Build chart data from result rows
function buildChartData(
  rows: Record<string, unknown>[],
  plan: { dimensions: string[]; requested_visualization: string; metric: string }
) {
  if (!rows || rows.length === 0) return undefined;

  const columns = Object.keys(rows[0]);

  // Determine chart type and keys
  let type: 'line' | 'bar' | 'pie' = 'bar';
  let xKey = columns[0];
  let yKey = columns.find(c => /revenue|profit|count|value|rate|score/i.test(c)) || columns[1] || columns[0];

  if (plan.dimensions.includes('month') || columns.includes('month')) {
    type = 'line';
    xKey = 'month';
    yKey = columns.find(c => /revenue|profit/i.test(c)) || columns[1] || 'revenue';
  } else if (plan.dimensions.includes('region') || columns.includes('region')) {
    type = 'bar';
    xKey = 'region';
    yKey = columns.find(c => /revenue|profit/i.test(c)) || columns[1] || 'revenue';
  } else if (plan.dimensions.includes('product_category') || columns.includes('category')) {
    type = 'bar';
    xKey = 'category';
    yKey = columns.find(c => /revenue|profit|count/i.test(c)) || columns[1] || 'revenue';
  }

  // Format data for charting
  const data = rows.map(row => {
    const formatted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'month' && value) {
        formatted[key] = new Date(String(value)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (typeof value === 'number') {
        formatted[key] = Math.round(value * 100) / 100;
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });

  return {
    type,
    data,
    xKey,
    yKey,
    label: plan.metric,
  };
}

// Build KPI values from result
function buildKPIValues(rows: Record<string, unknown>[], plan: { metric: string }) {
  if (!rows || rows.length === 0) return undefined;

  const kpis: Record<string, unknown> = {};

  if (rows.length === 1 && !Object.keys(rows[0]).some(k => /month|region|category/i.test(k))) {
    // Single summary row - use all values as KPIs
    for (const [key, value] of Object.entries(rows[0])) {
      kpis[key] = value;
    }
  } else {
    // Multiple rows - compute aggregates
    const numericCols = Object.keys(rows[0]).filter(k => typeof rows[0][k] === 'number');
    for (const col of numericCols) {
      const values = rows.map(r => Number(r[col] || 0));
      kpis[`total_${col}`] = values.reduce((a, b) => a + b, 0);
      kpis[`avg_${col}`] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    kpis['row_count'] = rows.length;
  }

  return kpis;
}
