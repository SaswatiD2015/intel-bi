import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const metrics = await prisma.metricDefinition.findMany({
      include: {
        synonyms: { select: { synonym: true } },
        dimensions: { select: { dimension: true, columnRef: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
