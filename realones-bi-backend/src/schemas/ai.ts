import { z } from 'zod';

// ----------------------------------------------------------------------------
// QUERY PLAN SCHEMA
// ----------------------------------------------------------------------------

export const QueryPlanSchema = z.object({
  intent: z.string(),
  questionType: z.enum(['DESCRIPTIVE', 'DIAGNOSTIC', 'PREDICTIVE', 'CAUSAL']),
  metricKey: z.string().nullable(),
  metricDefinitionId: z.string().nullable(),
  dimensions: z.array(z.string()),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
  })),
  timeRange: z.object({
    type: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    label: z.string().nullable()
  }).nullable(),
  comparison: z.object({
    type: z.string(),
    baseline: z.string().nullable(),
    target: z.string().nullable()
  }).nullable(),
  requestedVisualization: z.enum(['LINE', 'BAR', 'TABLE', 'PIE', 'KPI']).nullable(),
  tables: z.array(z.string()),
  approvedJoinPathIds: z.array(z.string()),
  assumptions: z.array(z.string()),
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  clarificationOptions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string()
  }))
});

export type QueryPlanOutput = z.infer<typeof QueryPlanSchema>;

// ----------------------------------------------------------------------------
// SQL GENERATION SCHEMA
// ----------------------------------------------------------------------------

export const SqlGenerationSchema = z.object({
  sql: z.string(),
  parameterValues: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  explanation: z.string(),
  tablesUsed: z.array(z.string()),
  columnsUsed: z.array(z.string()),
  joinsUsed: z.array(z.string()),
  assumptions: z.array(z.string())
});

export type SqlGenerationOutput = z.infer<typeof SqlGenerationSchema>;

// ----------------------------------------------------------------------------
// INSIGHT GENERATION SCHEMA
// ----------------------------------------------------------------------------

export const InsightGenerationSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  driversOrAssociations: z.array(z.string()),
  recommendedNextQuestions: z.array(z.string()),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  confidenceReason: z.string(),
  assumptions: z.array(z.string()),
  limitations: z.array(z.string()),
  causalityNotice: z.string()
});

export type InsightGenerationOutput = z.infer<typeof InsightGenerationSchema>;
