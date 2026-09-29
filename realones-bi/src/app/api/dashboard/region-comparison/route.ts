import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result: { region: string; revenue: number; orders: bigint; profit: number }[] = await prisma.$queryRaw`
      SELECT 
        r.name as region,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cost_price) as profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN regions r ON o.region_id = r.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'completed'
      GROUP BY r.name
      ORDER BY revenue DESC
    `;

    return NextResponse.json(result.map(r => ({
      region: r.region,
      revenue: Math.round(Number(r.revenue)),
      orders: Number(r.orders),
      profit: Math.round(Number(r.profit)),
    })));
  } catch (error) {
    console.error('Region comparison error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
