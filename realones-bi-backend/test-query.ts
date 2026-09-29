import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      TO_CHAR(o."orderDate", 'YYYY-MM') as month,
      SUM(oi.quantity * oi."unitPrice")::FLOAT as revenue
    FROM orders o
    JOIN order_items oi ON o.id = oi."orderId"
    WHERE o.status = 'COMPLETED'
    GROUP BY TO_CHAR(o."orderDate", 'YYYY-MM')
    ORDER BY revenue DESC
    LIMIT 12
  `);
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
