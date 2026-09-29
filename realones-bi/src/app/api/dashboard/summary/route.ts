import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as Record<string, unknown>;
    const roles = (user.roles as string[]) || [];
    const regions = (user.regions as { id: string }[]) || [];
    const isAnalyst = roles.includes('analyst');
    const regionFilter = isAnalyst ? {} : { regionId: { in: regions.map(r => r.id) } };

    // Revenue (completed orders only)
    const revenueResult = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'completed'
      ${isAnalyst ? prisma.$queryRaw`` : prisma.$queryRaw`AND o.region_id IN (${regions.map(r => r.id).join(',')})`}
    `.catch(() => [{ total: 0 }]);

    // Use Prisma for safer queries
    const totalOrders = await prisma.order.count({
      where: { status: 'completed', ...regionFilter },
    });

    const activeCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: { status: 'completed', ...regionFilter },
      _count: true,
    });

    const totalReturns = await prisma.return.count({
      where: { order: regionFilter },
    });

    // Gross profit calculation
    const profitResult: { revenue: number; cost: number }[] = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
        COALESCE(SUM(oi.quantity * p.cost_price), 0) as cost
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'completed'
    `;

    const revenue = Number(profitResult[0]?.revenue || 0);
    const cost = Number(profitResult[0]?.cost || 0);
    const grossProfit = revenue - cost;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    // Data freshness
    const latestData = await prisma.order.findFirst({
      where: { dataLoadedAt: { not: null } },
      orderBy: { dataLoadedAt: 'desc' },
      select: { dataLoadedAt: true },
    });

    return NextResponse.json({
      revenue: Math.round(revenue),
      grossProfit: Math.round(grossProfit),
      profitMargin: Math.round(profitMargin * 10) / 10,
      activeCustomers: activeCustomers.length,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue),
      returnCount: totalReturns,
      returnRate: totalOrders > 0 ? Math.round((totalReturns / totalOrders) * 1000) / 10 : 0,
      dataFreshness: latestData?.dataLoadedAt?.toISOString() || 'Unknown',
      dataVibeStatus: 'good',
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
