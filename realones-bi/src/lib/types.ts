// ============================================================================
// RealOnes BI - Type Definitions
// ============================================================================

export type QuestionType = 'descriptive' | 'diagnostic' | 'predictive' | 'causal';
export type RealScoreLevel = 'high' | 'medium' | 'low';
export type DataVibeStatus = 'good' | 'needs_attention' | 'high_risk';
export type OrderStatus = 'completed' | 'pending' | 'cancelled' | 'returned';

// Query Plan
export interface QueryPlan {
  intent: string;
  question_type: QuestionType;
  metric: string;
  metric_definition_id: string;
  dimensions: string[];
  filters: Record<string, unknown>[];
  time_range: string;
  comparison: string;
  tables: string[];
  approved_join_paths: string[];
  requested_visualization: string;
  assumptions: string[];
  clarification_needed: boolean;
  clarification_question: string;
  clarification_options: string[];
}

// SQL Generation Result
export interface SQLGenerationResult {
  sql: string;
  parameter_values: unknown[];
  explanation: string;
  tables_used: string[];
  columns_used: string[];
  joins_used: string[];
  assumptions: string[];
}

// SQL Validation Result
export interface SQLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tablesUsed: string[];
  columnsUsed: string[];
  hasUnsafeOperations: boolean;
  hasUnauthorizedTables: boolean;
  hasUnauthorizedColumns: boolean;
  hasPIIAccess: boolean;
  queryComplexity: 'simple' | 'moderate' | 'complex';
}

// Real Insight
export interface RealInsight {
  headline: string;
  summary: string;
  key_findings: string[];
  drivers_or_associations: string[];
  recommended_next_questions: string[];
  confidence: RealScoreLevel;
  confidence_reason: string;
  assumptions: string[];
  limitations: string[];
  causality_notice: string;
}

// RealCheck Card
export interface RealCheckCard {
  userQuestion: string;
  interpretation: string;
  queryType: QuestionType;
  selectedMetric: string;
  metricDefinition: string;
  metricFormula: string;
  tablesUsed: string[];
  columnsUsed: string[];
  appliedFilters: Record<string, unknown>[];
  timeRange: string;
  groupingDimension: string;
  generatedSQL: string;
  sqlValidationStatus: string;
  sqlExecutionTimeMs: number;
  rowCount: number;
  dataFreshness: string;
  dataQualityChecks: DataQualityCheck[];
  realScore: RealScoreLevel;
  realScoreReason: string;
  assumptions: string[];
  limitations: string[];
  causalityNotice: string;
  auditId: string;
}

// Data Quality
export interface DataQualityCheck {
  checkName: string;
  checkType: string;
  tableName: string;
  status: DataVibeStatus;
  details: string;
  value?: number;
  threshold?: number;
}

export interface DataQualitySummary {
  overallStatus: DataVibeStatus;
  checks: DataQualityCheck[];
  message: string;
}

// Query Pipeline Result
export interface QueryPipelineResult {
  success: boolean;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  queryResult?: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
  chartData?: {
    type: 'bar' | 'line' | 'pie';
    data: Record<string, unknown>[];
    xKey: string;
    yKey: string;
    label: string;
  };
  kpiValues?: Record<string, unknown>;
  generatedSQL?: string;
  realCheckCard?: RealCheckCard;
  dataVibeStatus?: DataVibeStatus;
  dataVibeMessage?: string;
  realScore?: RealScoreLevel;
  realScoreReason?: string;
  insight?: RealInsight;
  assumptions?: string[];
  limitations?: string[];
  suggestedQuestions?: string[];
  auditId?: string;
  error?: string;
  errorType?: 'blocked' | 'validation_failed' | 'execution_failed' | 'narrative_failed' | 'auth_failed';
}

// User context
export interface UserContext {
  id: string;
  email: string;
  name: string;
  roles: string[];
  regions: string[];
  regionIds: string[];
}

// Semantic context
export interface SemanticContext {
  glossaryEntries: {
    term: string;
    definition: string;
  }[];
  metricDefinitions: {
    id: string;
    name: string;
    slug: string;
    definition: string;
    formula: string;
    sourceTables: string[];
    sourceColumns: string[];
    filters?: Record<string, unknown>;
    synonyms: string[];
    dimensions: { dimension: string; columnRef: string }[];
    grain?: string;
    version: number;
    status: string;
  }[];
  schemaTables: {
    tableName: string;
    description?: string;
    columns: {
      columnName: string;
      dataType: string;
      description?: string;
      isPII: boolean;
    }[];
  }[];
  approvedJoinPaths: {
    name: string;
    tables: string[];
    joinClause: string;
  }[];
  approvedExamples: {
    question: string;
    sql: string;
    metricUsed?: string;
  }[];
}

// Session
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  regions: { id: string; name: string; code: string }[];
}

// Feedback
export interface FeedbackInput {
  queryRunId: string;
  rating: number;
  feedbackType: 'accurate' | 'misleading' | 'wrong' | 'unclear';
  comment?: string;
}

// Decision Review
export interface DecisionReviewInput {
  queryRunId?: string;
  title: string;
  businessQuestion: string;
  businessContext?: string;
  decisionTaken: string;
  decisionOwner?: string;
  expectedOutcome?: string;
  expectedImpact?: string;
  reviewDate?: string;
  notes?: string;
}

export interface DecisionReviewUpdate {
  actualOutcome?: string;
  actualImpact?: string;
  aiUsefulnessRating?: number;
  qualityScore?: number;
  notes?: string;
  status?: 'pending' | 'reviewed' | 'closed';
}
