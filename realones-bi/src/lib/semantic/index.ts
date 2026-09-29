// ============================================================================
// RealOnes BI - Semantic Layer
// ============================================================================

import prisma from '@/lib/db';
import type { SemanticContext } from '@/lib/types';
import { normalizeQuestion } from '@/lib/utils';

// Retrieve relevant semantic context for a question
export async function getSemanticContext(question: string): Promise<SemanticContext> {
  const normalizedQ = normalizeQuestion(question);
  const keywords = normalizedQ.split(' ').filter(w => w.length > 2);

  // 1. Get all glossary entries (small table, get all)
  const glossaryEntries = await prisma.businessGlossary.findMany({
    where: { status: 'approved' },
    select: { term: true, definition: true },
  });

  // 2. Get metric definitions - filter by keyword matching
  const allMetrics = await prisma.metricDefinition.findMany({
    where: { status: 'approved' },
    include: {
      synonyms: { select: { synonym: true } },
      dimensions: { select: { dimension: true, columnRef: true } },
    },
  });

  // Score and rank metrics by relevance
  const scoredMetrics = allMetrics.map(m => {
    let score = 0;
    const nameNorm = m.name.toLowerCase();
    const defNorm = m.definition.toLowerCase();
    const allSyns = m.synonyms.map(s => s.synonym.toLowerCase());

    for (const kw of keywords) {
      if (nameNorm.includes(kw)) score += 3;
      if (defNorm.includes(kw)) score += 1;
      for (const syn of allSyns) {
        if (syn.includes(kw)) score += 2;
      }
    }

    return { metric: m, score };
  });

  const relevantMetrics = scoredMetrics
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => ({
      id: s.metric.id,
      name: s.metric.name,
      slug: s.metric.slug,
      definition: s.metric.definition,
      formula: s.metric.formula,
      sourceTables: JSON.parse(s.metric.sourceTables) as string[],
      sourceColumns: JSON.parse(s.metric.sourceColumns) as string[],
      filters: s.metric.filters ? JSON.parse(s.metric.filters) : undefined,
      synonyms: s.metric.synonyms.map(syn => syn.synonym),
      dimensions: s.metric.dimensions.map(d => ({
        dimension: d.dimension,
        columnRef: d.columnRef,
      })),
      grain: s.metric.grain || undefined,
      version: s.metric.version,
      status: s.metric.status,
    }));

  // If no metrics matched, return all for LLM to pick
  if (relevantMetrics.length === 0) {
    const topMetrics = allMetrics.slice(0, 10).map(m => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      definition: m.definition,
      formula: m.formula,
      sourceTables: JSON.parse(m.sourceTables) as string[],
      sourceColumns: JSON.parse(m.sourceColumns) as string[],
      filters: m.filters ? JSON.parse(m.filters) : undefined,
      synonyms: m.synonyms.map(s => s.synonym),
      dimensions: m.dimensions.map(d => ({
        dimension: d.dimension,
        columnRef: d.columnRef,
      })),
      grain: m.grain || undefined,
      version: m.version,
      status: m.status,
    }));
    relevantMetrics.push(...topMetrics);
  }

  // 3. Get relevant schema tables
  const tableNames = new Set<string>();
  for (const m of relevantMetrics) {
    for (const t of m.sourceTables) {
      tableNames.add(t);
    }
  }
  // Always include common tables
  ['orders', 'order_items', 'customers', 'products', 'product_categories', 'regions', 'returns', 'sales_targets', 'customer_churn_scores'].forEach(t => tableNames.add(t));

  const schemaTables = await prisma.schemaTable.findMany({
    where: {
      tableName: { in: Array.from(tableNames) },
      isAllowed: true,
    },
    include: {
      columns: {
        where: { isAllowed: true },
        select: {
          columnName: true,
          dataType: true,
          description: true,
          isPII: true,
        },
      },
    },
  });

  // 4. Get approved join paths
  const approvedJoinPaths = await prisma.approvedJoinPath.findMany({
    where: { isActive: true },
    select: {
      name: true,
      tables: true,
      joinClause: true,
    },
  });

  // 5. Get approved query examples
  const approvedExamples = await prisma.approvedQueryExample.findMany({
    take: 10,
    select: {
      question: true,
      sql: true,
      metricUsed: true,
    },
  });

  return {
    glossaryEntries: glossaryEntries.map(g => ({
      term: g.term,
      definition: g.definition,
    })),
    metricDefinitions: relevantMetrics,
    schemaTables: schemaTables.map(t => ({
      tableName: t.tableName,
      description: t.description || undefined,
      columns: t.columns.map(c => ({
        columnName: c.columnName,
        dataType: c.dataType,
        description: c.description || undefined,
        isPII: c.isPII,
      })),
    })),
    approvedJoinPaths: approvedJoinPaths.map(j => ({
      name: j.name,
      tables: JSON.parse(j.tables) as string[],
      joinClause: j.joinClause,
    })),
    approvedExamples: approvedExamples.map(e => ({
      question: e.question,
      sql: e.sql,
      metricUsed: e.metricUsed || undefined,
    })),
  };
}

// Check if a question is ambiguous (has multiple metric matches)
export function detectAmbiguity(
  question: string,
  metrics: SemanticContext['metricDefinitions']
): {
  isAmbiguous: boolean;
  ambiguousTerms: string[];
  matchedMetrics: typeof metrics;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
} {
  const normalizedQ = normalizeQuestion(question);

  // Ambiguous terms
  const ambiguousTermMap: Record<string, string[]> = {
    'sales': ['completed-order-revenue', 'gross-revenue', 'net-revenue'],
    'revenue': ['completed-order-revenue', 'gross-revenue', 'net-revenue'],
    'profit': ['gross-profit', 'profit-margin'],
    'customers': ['active-customer', 'order-count'],
  };

  const ambiguousTerms: string[] = [];
  const matchedSlugs = new Set<string>();

  for (const [term, slugs] of Object.entries(ambiguousTermMap)) {
    if (normalizedQ.includes(term)) {
      ambiguousTerms.push(term);
      slugs.forEach(s => matchedSlugs.add(s));
    }
  }

  if (ambiguousTerms.length > 0 && matchedSlugs.size > 1) {
    const matchedMetrics = metrics.filter(m => matchedSlugs.has(m.slug));
    if (matchedMetrics.length > 1) {
      const termList = ambiguousTerms.map(t => `'${t}'`).join(', ');
      return {
        isAmbiguous: true,
        ambiguousTerms,
        matchedMetrics,
        clarificationQuestion: `${termList} can refer to different approved metrics. Which one would you like to use?`,
        clarificationOptions: matchedMetrics.map(m => `${m.name}: ${m.definition}`),
      };
    }
  }

  // Check for missing time range
  const hasTimeRange = /\b(month|quarter|year|week|day|today|yesterday|last|this|20\d\d)\b/i.test(question);
  if (!hasTimeRange && normalizedQ.length > 10) {
    // Not strictly ambiguous but might need clarification
  }

  return {
    isAmbiguous: false,
    ambiguousTerms: [],
    matchedMetrics: metrics,
  };
}

// Match question to a specific metric
export function matchMetric(
  question: string,
  metrics: SemanticContext['metricDefinitions']
): SemanticContext['metricDefinitions'][0] | null {
  const normalizedQ = normalizeQuestion(question);

  // Score each metric
  let bestMatch = null;
  let bestScore = 0;

  for (const metric of metrics) {
    let score = 0;
    const nameWords = metric.name.toLowerCase().split(/[\s-]+/);
    const synWords = metric.synonyms.map(s => s.toLowerCase());

    for (const word of nameWords) {
      if (normalizedQ.includes(word)) score += 3;
    }
    for (const syn of synWords) {
      if (normalizedQ.includes(syn)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}
