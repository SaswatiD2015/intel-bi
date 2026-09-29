import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuditLogs } from '@/lib/governance/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = ((session.user as Record<string, unknown>).roles as string[]) || [];
    if (!roles.includes('analyst')) {
      return NextResponse.json({ error: 'Access denied. Analyst role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as 'auth' | 'query' | 'feedback' | 'decision' | 'governance' | 'error' | null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getAuditLogs(
      category ? { category } : undefined,
      limit,
      offset
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
