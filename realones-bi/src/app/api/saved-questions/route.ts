import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { createAuditLog } from '@/lib/governance/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const saved = await prisma.savedQuestion.create({
      data: {
        userId,
        question: body.question,
        queryRunId: body.queryRunId || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
      },
    });

    await createAuditLog({
      userId,
      action: 'saved_realtalk_created',
      category: 'query',
      details: { savedId: saved.id, question: body.question },
    });

    return NextResponse.json({ success: true, id: saved.id });
  } catch (error) {
    console.error('Save question error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const saved = await prisma.savedQuestion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Fetch saved error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
