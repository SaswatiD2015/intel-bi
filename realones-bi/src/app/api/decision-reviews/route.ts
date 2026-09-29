import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { createAuditLog } from '@/lib/governance/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const userId = (session.user as Record<string, unknown>).id as string;

    const review = await prisma.decisionReview.create({
      data: {
        userId,
        queryRunId: body.queryRunId || null,
        title: body.title,
        businessQuestion: body.businessQuestion,
        businessContext: body.businessContext,
        decisionTaken: body.decisionTaken,
        decisionOwner: body.decisionOwner,
        expectedOutcome: body.expectedOutcome,
        expectedImpact: body.expectedImpact,
        reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
        notes: body.notes,
      },
    });

    await createAuditLog({
      userId,
      action: 'decision_receipt_created',
      category: 'decision',
      details: { reviewId: review.id, title: body.title },
    });

    return NextResponse.json({ success: true, id: review.id });
  } catch (error) {
    console.error('Decision review error:', error);
    return NextResponse.json({ error: 'Failed to create decision receipt' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reviews = await prisma.decisionReview.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Decision review fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
