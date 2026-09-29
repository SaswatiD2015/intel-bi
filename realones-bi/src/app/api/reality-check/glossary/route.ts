import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as Record<string, any>;
    
    const res = await fetch('http://localhost:4000/api/v1/reality-check/glossary', {
      headers: { 'Authorization': `Bearer ${user.backendToken}` }
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch glossary' }, { status: 500 });
  }
}
