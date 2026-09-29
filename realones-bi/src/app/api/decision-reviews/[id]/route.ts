import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const review = await prisma.decisionReview.update({
      where: { id },
      data: {
        actualOutcome: body.actualOutcome,
        actualImpact: body.actualImpact,
        aiUsefulnessRating: body.aiUsefulnessRating,
        qualityScore: body.qualityScore,
        notes: body.notes,
        status: body.status,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Decision review update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
