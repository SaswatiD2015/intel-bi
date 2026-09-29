import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, logger } from '../index';

export async function realityCheckRoutes(server: FastifyInstance) {
  server.addHook('preValidation', server.authenticate);

  server.get('/glossary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const terms = await prisma.businessGlossary.findMany({
        orderBy: { term: 'asc' }
      });
      return reply.send({ success: true, data: terms });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Database error' });
    }
  });

  server.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await prisma.metricDefinition.findMany({
        orderBy: { displayName: 'asc' }
      });
      return reply.send({ success: true, data: metrics });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Database error' });
    }
  });
}
