import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const glossary = await prisma.businessGlossary.findMany({
      orderBy: { term: 'asc' },
    });

    return NextResponse.json(glossary);
  } catch (error) {
    console.error('Glossary error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
