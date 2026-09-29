import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result: { month: Date; revenue: number; orders: bigint }[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', o.order_date) as month,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.id) as orders
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'completed'
        AND o.order_date >= NOW() - INTERVAL '24 months'
      GROUP BY DATE_TRUNC('month', o.order_date)
      ORDER BY month
    `;

    const data = result.map(r => ({
      month: new Date(r.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: Math.round(Number(r.revenue)),
      orders: Number(r.orders),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Revenue trend error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
