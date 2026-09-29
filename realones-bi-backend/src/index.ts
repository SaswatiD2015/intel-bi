import fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

// Initialize Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Initialize Prisma
export const prisma = new PrismaClient();

// Build Fastify Server
export const buildServer = async () => {
  const server = fastify({ logger: false });

  // Middleware
  await server.register(helmet);
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  });

  // Swagger Documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'RealOnes BI Backend API',
        description: 'REST APIs for RealOnes BI governed Text-to-SQL platform',
        version: '1.0.0'
      },
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Health check routes
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.get('/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'connected' };
    } catch (e) {
      server.log.error({ err: e }, 'DB not ready');
      return reply.code(503).send({ status: 'not_ready', db: 'disconnected' });
    }
  });

  // Root
  server.get('/', async () => {
    return { message: 'RealOnes BI API running' };
  });
  // Register Auth Plugin
  server.register(authPlugin);

  // Register API Routes
  server.register(async (api) => {
     const { authRoutes } = await import('./routes/auth');
     const { dashboardRoutes } = await import('./routes/dashboard');
     const { realityCheckRoutes } = await import('./routes/realityCheck');
     const { queryRoutes } = await import('./routes/query');
     
     api.register(authRoutes, { prefix: '/auth' });
     api.register(dashboardRoutes, { prefix: '/dashboard' });
     api.register(realityCheckRoutes, { prefix: '/reality-check' });
     api.register(queryRoutes, { prefix: '/query' });
  }, { prefix: '/api/v1' });

  return server;
};

// Start Server
const start = async () => {
  const server = await buildServer();
  try {
    const port = parseInt(process.env.PORT || '4000', 10);
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`Server listening on http://localhost:${port}`);
    logger.info(`Swagger docs available at http://localhost:${port}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
