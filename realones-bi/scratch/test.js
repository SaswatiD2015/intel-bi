const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT typeof(order_date) as type, order_date FROM orders LIMIT 1`.then(console.log);
