// ============================================================================
// RealOnes BI - Real Score Engine (Deterministic)
// ============================================================================

import type { RealScoreLevel, DataVibeStatus, SQLValidationResult, QueryPlan } from '@/lib/types';

export interface RealScoreInput {
  clarificationResolved: boolean;
  metricDefinitionUsed: boolean;
  approvedTablesUsed: boolean;
  approvedJoinsUsed: boolean;
  sqlValidationPassed: boolean;
  userAccessValidated: boolean;
  queryExecutedSuccessfully: boolean;
  dataVibeStatus: DataVibeStatus;
  hasUnresolvedAssumptions: boolean;
  semanticMatchQuality: 'exact' | 'good' | 'acceptable' | 'weak';
  hasQueryAnomalies: boolean;
  usedFallbackBehavior: boolean;
}

export interface RealScoreResult {
  score: RealScoreLevel;
  reason: string;
  factors: { factor: string; status: 'pass' | 'warn' | 'fail'; detail: string }[];
}

export function calculateRealScore(input: RealScoreInput): RealScoreResult {
  const factors: RealScoreResult['factors'] = [];

  // 1. Clarification
  factors.push({
    factor: 'Clarification',
    status: input.clarificationResolved ? 'pass' : 'fail',
    detail: input.clarificationResolved
      ? 'Question was unambiguous or clarification was resolved.'
      : 'Clarification is still needed.',
  });

  // 2. Metric definition
  factors.push({
    factor: 'Metric Definition',
    status: input.metricDefinitionUsed ? 'pass' : 'warn',
    detail: input.metricDefinitionUsed
      ? 'Approved metric definition used.'
      : 'No exact metric definition match found.',
  });

  // 3. Approved tables
  factors.push({
    factor: 'Approved Tables',
    status: input.approvedTablesUsed ? 'pass' : 'fail',
    detail: input.approvedTablesUsed
      ? 'All tables are approved in the schema.'
      : 'Some tables are not in the approved list.',
  });

  // 4. Approved joins
  factors.push({
    factor: 'Approved Joins',
    status: input.approvedJoinsUsed ? 'pass' : 'warn',
    detail: input.approvedJoinsUsed
      ? 'Approved join paths used.'
      : 'Join paths not fully verified.',
  });

  // 5. SQL validation
  factors.push({
    factor: 'SQL Validation',
    status: input.sqlValidationPassed ? 'pass' : 'fail',
    detail: input.sqlValidationPassed
      ? 'SQL AST validation passed. Query is read-only and safe.'
      : 'SQL validation did not pass.',
  });

  // 6. User access
  factors.push({
    factor: 'Access Control',
    status: input.userAccessValidated ? 'pass' : 'fail',
    detail: input.userAccessValidated
      ? 'User access scope validated. Region restrictions applied.'
      : 'User access could not be validated.',
  });

  // 7. Query execution
  factors.push({
    factor: 'Query Execution',
    status: input.queryExecutedSuccessfully ? 'pass' : 'fail',
    detail: input.queryExecutedSuccessfully
      ? 'Query executed successfully.'
      : 'Query execution failed.',
  });

  // 8. Data quality
  factors.push({
    factor: 'Data Quality',
    status: input.dataVibeStatus === 'good' ? 'pass'
      : input.dataVibeStatus === 'needs_attention' ? 'warn' : 'fail',
    detail: `Data Vibe Status: ${input.dataVibeStatus.replace('_', ' ')}`,
  });

  // 9. Assumptions
  factors.push({
    factor: 'Assumptions',
    status: input.hasUnresolvedAssumptions ? 'warn' : 'pass',
    detail: input.hasUnresolvedAssumptions
      ? 'Some assumptions remain unresolved.'
      : 'No unresolved assumptions.',
  });

  // 10. Semantic match
  factors.push({
    factor: 'Semantic Match',
    status: input.semanticMatchQuality === 'exact' || input.semanticMatchQuality === 'good' ? 'pass'
      : input.semanticMatchQuality === 'acceptable' ? 'warn' : 'fail',
    detail: `Semantic match quality: ${input.semanticMatchQuality}`,
  });

  // Determine score
  const failCount = factors.filter(f => f.status === 'fail').length;
  const warnCount = factors.filter(f => f.status === 'warn').length;

  let score: RealScoreLevel;
  let reason: string;

  if (failCount > 0 || input.dataVibeStatus === 'high_risk' || input.usedFallbackBehavior || input.semanticMatchQuality === 'weak') {
    score = 'low';
    const failedFactors = factors.filter(f => f.status === 'fail').map(f => f.factor).join(', ');
    reason = `Real Score: Low — ${failedFactors ? `issues found in: ${failedFactors}.` : ''} ${input.dataVibeStatus === 'high_risk' ? 'Significant data-quality risks detected.' : ''} ${input.semanticMatchQuality === 'weak' ? 'Semantic matching is weak.' : ''} The question needs clarification, or the available data has significant quality risks.`;
  } else if (warnCount > 0 || input.dataVibeStatus === 'needs_attention') {
    score = 'medium';
    reason = 'Real Score: Medium — the analysis is valid, but assumptions or moderate data-quality issues may affect interpretation.';
  } else {
    score = 'high';
    reason = 'Real Score: High — approved metric, validated SQL, safe join path, good data quality, and no unresolved assumptions.';
  }

  return { score, reason, factors };
}

// Shorthand for common scenarios
export function calculateScoreFromPipelineResults(
  plan: QueryPlan,
  sqlValidation: SQLValidationResult,
  executionSuccess: boolean,
  dataVibeStatus: DataVibeStatus,
  metricFound: boolean,
  userAccessOk: boolean
): RealScoreResult {
  return calculateRealScore({
    clarificationResolved: !plan.clarification_needed,
    metricDefinitionUsed: metricFound && plan.metric_definition_id !== '',
    approvedTablesUsed: !sqlValidation.hasUnauthorizedTables,
    approvedJoinsUsed: sqlValidation.warnings.length === 0 || !sqlValidation.warnings.some(w => w.includes('join')),
    sqlValidationPassed: sqlValidation.valid,
    userAccessValidated: userAccessOk,
    queryExecutedSuccessfully: executionSuccess,
    dataVibeStatus,
    hasUnresolvedAssumptions: plan.assumptions.length > 0,
    semanticMatchQuality: metricFound ? 'good' : 'acceptable',
    hasQueryAnomalies: false,
    usedFallbackBehavior: false,
  });
}
