import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, logger } from '../index';
import { MockAIProvider } from '../lib/ai/provider';
import { SqlValidatorService } from '../lib/sql/validator';
import { randomUUID } from 'crypto';

const FullRunRequestSchema = z.object({
  question: z.string(),
  conversationId: z.string().nullable().optional(),
  clarificationAnswers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string(),
    freeText: z.string().nullable().optional()
  })).optional(),
  requestedVisualization: z.enum(['LINE', 'BAR', 'TABLE', 'PIE', 'KPI']).nullable().optional()
});

export async function queryRoutes(server: FastifyInstance) {
  const aiProvider = new MockAIProvider();
  const sqlValidator = new SqlValidatorService();

  server.post('/full-run', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = FullRunRequestSchema.parse(request.body);
      const requestId = randomUUID();
      
      // Mock Auth Context
      const userId = 'user-123';
      const role = 'BUSINESS_USER';
      const regionScope = ['South'];

      logger.info({ requestId, question: body.question }, 'Starting full-run query orchestration');

      // 1. Create Request ID and query run
      const queryRun = await prisma.queryRun.create({
        data: {
          userId,
          question: body.question,
          normalizedQuestion: body.question.toLowerCase(),
          status: 'RECEIVED'
        }
      });

      // 2. Query Plan Generation
      const plan = await aiProvider.createQueryPlan({
        question: body.question,
        role,
        regionScope,
        glossary: [], // Mocked
        metrics: [], // Mocked
        examples: [], // Mocked
        clarificationAnswers: body.clarificationAnswers
      });

      // 3. Needs Clarification check
      if (plan.clarificationNeeded) {
        await prisma.queryRun.update({
          where: { id: queryRun.id },
          data: { status: 'NEEDS_CLARIFICATION' }
        });
        
        return reply.send({
          requestId,
          queryRunId: queryRun.id,
          status: 'NEEDS_CLARIFICATION',
          clarification: {
            question: plan.clarificationQuestion,
            options: plan.clarificationOptions
          },
          result: null,
          insight: null,
          realCheckCard: null
        });
      }

      await prisma.queryRun.update({
        where: { id: queryRun.id },
        data: { status: 'PLAN_VALIDATED' }
      });

      // 4. SQL Generation
      const sqlGen = await aiProvider.generateSQL({
        plan,
        metricDefinition: {},
        schemaContext: {},
        approvedJoinPaths: {}
      });

      // 5. AST Validation
      const validation = sqlValidator.validateSql(sqlGen.sql);
      
      if (!validation.valid) {
        await prisma.queryRun.update({
          where: { id: queryRun.id },
          data: { 
            status: 'SQL_BLOCKED',
            errorMessage: validation.errors.join('; '),
            generatedSql: sqlGen.sql
          }
        });

        return reply.code(403).send({
          requestId,
          queryRunId: queryRun.id,
          status: 'BLOCKED',
          error: {
             code: 'UNSAFE_SQL',
             message: 'Query blocked by Reality Check: ' + validation.errors.join('; ')
          }
        });
      }

      // 6. DB Execution (Mocked here since we don't have real seeded postgres running locally via docker)
      // In a real env, we'd use SET LOCAL row_security = on;
      let mockRows: any[] = [];
      try {
        mockRows = (await prisma.$queryRawUnsafe(sqlGen.sql)) as any[];
      } catch (err: any) {
        logger.error({ err }, 'Execution failed');
        await prisma.queryRun.update({
          where: { id: queryRun.id },
          data: { status: 'EXECUTION_FAILED', errorMessage: err.message }
        });
        return reply.code(500).send({
           requestId,
           queryRunId: queryRun.id,
           status: 'FAILED',
           error: { code: 'EXECUTION_FAILED', message: 'Query execution failed' }
        });
      }

      // 7. Data Quality & Insight
      const insight = await aiProvider.generateInsight({
        queryResults: mockRows,
        plan,
        dataQualityStatus: 'GOOD',
        realScore: 'HIGH',
        causalEvidence: false
      });

      await prisma.queryRun.update({
        where: { id: queryRun.id },
        data: { 
          status: 'COMPLETED',
          generatedSql: sqlGen.sql,
          realScore: 'HIGH',
          insightJson: JSON.stringify(insight)
        }
      });

      // 8. Return standard contract
      return reply.send({
        requestId,
        queryRunId: queryRun.id,
        status: 'COMPLETED',
        clarification: null,
        result: {
          columns: Object.keys(mockRows[0] || {}).map(k => ({ key: k, label: k, dataType: 'unknown' })),
          rows: mockRows,
          rowCount: mockRows.length,
          truncated: false
        },
        visualization: {
          recommendedType: plan.requestedVisualization || 'TABLE',
          config: {}
        },
        insight,
        realCheckCard: {
          questionInterpretation: plan.intent,
          questionType: plan.questionType,
          sql: sqlGen.sql,
          realScore: { score: 'HIGH', reasons: ['Validation passed'] },
          dataQuality: { status: 'GOOD', checks: [] },
          assumptions: [...plan.assumptions, ...sqlGen.assumptions],
          auditId: queryRun.id
        }
      });

    } catch (error) {
      logger.error(error);
      return reply.code(400).send({ error: 'Bad Request' });
    }
  });
}
