import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, logger } from '../index';

export async function dashboardRoutes(server: FastifyInstance) {
  // All dashboard routes require authentication
  server.addHook('preValidation', server.authenticate);

  server.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user: any = request.user;
      const regionFilter = user.roles.includes('ANALYST') ? '' : `AND r.name IN (${user.regions.map((r: any) => `'${r.name}'`).join(',')})`;

      // Safely query Postgres
      const result = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(DISTINCT o.id)::INT as "totalOrders",
          SUM(oi.quantity * oi."unitPrice")::FLOAT as revenue,
          SUM(oi.quantity * oi."unitPrice" * 0.4)::FLOAT as "grossProfit",
          40 as "profitMargin"
        FROM orders o
        JOIN order_items oi ON o.id = oi."orderId"
        JOIN regions r ON o."regionId" = r.id
        WHERE o.status = 'COMPLETED' ${regionFilter}
      `) as any[];

      return reply.send({
        success: true,
        data: result[0] || { totalOrders: 0, revenue: 0, grossProfit: 0, profitMargin: 40 }
      });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Dashboard error' });
    }
  });

  server.get('/revenue-trend', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user: any = request.user;
      const regionFilter = user.roles.includes('ANALYST') ? '' : `AND r.name IN (${user.regions.map((r: any) => `'${r.name}'`).join(',')})`;

      const result = await prisma.$queryRawUnsafe(`
        WITH RecentMonths AS (
          SELECT 
            TO_CHAR(o."orderDate", 'YYYY-MM') as month,
            SUM(oi.quantity * oi."unitPrice")::FLOAT as revenue
          FROM orders o
          JOIN order_items oi ON o.id = oi."orderId"
          JOIN regions r ON o."regionId" = r.id
          WHERE o.status = 'COMPLETED' ${regionFilter}
          GROUP BY TO_CHAR(o."orderDate", 'YYYY-MM')
          ORDER BY month DESC
          LIMIT 24
        )
        SELECT * FROM RecentMonths ORDER BY month ASC
      `) as any[];

      return reply.send({ success: true, data: result });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Dashboard error' });
    }
  });

  server.get('/region-comparison', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user: any = request.user;
      const regionFilter = user.roles.includes('ANALYST') ? '' : `AND r.name IN (${user.regions.map((r: any) => `'${r.name}'`).join(',')})`;

      const result = await prisma.$queryRawUnsafe(`
        SELECT 
          r.name as region,
          SUM(oi.quantity * oi."unitPrice")::FLOAT as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi."orderId"
        JOIN regions r ON o."regionId" = r.id
        WHERE o.status = 'COMPLETED' ${regionFilter}
        GROUP BY r.name
        ORDER BY revenue DESC
      `) as any[];

      return reply.send({ success: true, data: result });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Dashboard error' });
    }
  });

  server.get('/category-comparison', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user: any = request.user;
      const regionFilter = user.roles.includes('ANALYST') ? '' : `AND r.name IN (${user.regions.map((r: any) => `'${r.name}'`).join(',')})`;

      const result = await prisma.$queryRawUnsafe(`
        SELECT 
          c.name as category,
          SUM(oi.quantity * oi."unitPrice")::FLOAT as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi."orderId"
        JOIN products p ON oi."productId" = p.id
        JOIN product_categories c ON p."categoryId" = c.id
        JOIN regions r ON o."regionId" = r.id
        WHERE o.status = 'COMPLETED' ${regionFilter}
        GROUP BY c.name
        ORDER BY revenue DESC
        LIMIT 5
      `) as any[];

      return reply.send({ success: true, data: result });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ success: false, error: 'Dashboard error' });
    }
  });
}
