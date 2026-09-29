import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { runFullQueryPipeline } from '@/lib/ai/pipeline';
import type { UserContext } from '@/lib/types';
import { createAuditLog } from '@/lib/governance/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question, clarificationChoice } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a question.' },
        { status: 400 }
      );
    }

    let clarificationAnswers = [];
    if (clarificationChoice) {
       clarificationAnswers.push({
          questionId: 'clarify-1',
          selectedOptionId: clarificationChoice
       });
    }

    const userRecord = session.user as Record<string, any>;
    
    // Proxy to Fastify Backend
    const backendRes = await fetch('http://localhost:4000/api/v1/query/full-run', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userRecord.backendToken}`
      },
      body: JSON.stringify({ question, clarificationAnswers })
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
       return NextResponse.json({ success: false, error: data.error?.message || 'Backend Error' }, { status: backendRes.status });
    }

    // Map Fastify Response to Next.js UI Structure
    if (data.status === 'NEEDS_CLARIFICATION') {
       return NextResponse.json({
          success: true,
          ambiguity: {
             clarification_question: data.clarification.question,
             choices: data.clarification.options.map((o: any) => ({ name: o.label, value: o.id, description: o.description }))
          }
       });
    }

    return NextResponse.json({
      success: true,
      ambiguity: null,
      result: data.result,
      generatedSQL: data.realCheckCard?.sql,
      realCheckCard: {
         ...data.realCheckCard,
         assumptions: data.realCheckCard?.assumptions || []
      },
      insight: data.insight ? {
        headline: data.insight.headline,
        summary: data.insight.summary,
        key_findings: data.insight.keyFindings || [],
        drivers_or_associations: data.insight.driversOrAssociations || [],
        recommended_next_questions: data.insight.recommendedNextQuestions || [],
        confidence: data.insight.confidence,
        confidence_reason: data.insight.confidenceReason,
        assumptions: data.insight.assumptions || [],
        limitations: data.insight.limitations || [],
        causality_notice: data.insight.causalityNotice
      } : null,
      dataVibeStatus: data.realCheckCard?.dataQuality?.status,
      realScore: data.realCheckCard?.realScore?.score || 'HIGH',
      auditId: data.queryRunId
    });
  } catch (error) {
    console.error('Query pipeline error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
