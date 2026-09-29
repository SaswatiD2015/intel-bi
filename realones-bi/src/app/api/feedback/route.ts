import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { createAuditLog } from '@/lib/governance/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { queryRunId, rating, feedbackType, comment } = body;

    if (!queryRunId || !rating || !feedbackType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const feedback = await prisma.userFeedback.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        queryRunId,
        rating: Math.min(5, Math.max(1, rating)),
        feedbackType,
        comment,
      },
    });

    await createAuditLog({
      userId: (session.user as Record<string, unknown>).id as string,
      action: 'feedback_submitted',
      category: 'feedback',
      details: { feedbackId: feedback.id, queryRunId, rating, feedbackType },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feedback = await prisma.userFeedback.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
