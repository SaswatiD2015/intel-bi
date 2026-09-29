'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface QueryResult {
  success: boolean;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  queryResult?: { columns: string[]; rows: Record<string, unknown>[]; rowCount: number };
  chartData?: { type: string; data: Record<string, unknown>[]; xKey: string; yKey: string; label: string };
  kpiValues?: Record<string, unknown>;
  generatedSQL?: string;
  realCheckCard?: Record<string, unknown>;
  dataVibeStatus?: string;
  dataVibeMessage?: string;
  realScore?: string;
  realScoreReason?: string;
  insight?: {
    headline: string;
    summary: string;
    key_findings: string[];
    drivers_or_associations: string[];
    recommended_next_questions: string[];
    confidence: string;
    confidence_reason: string;
    assumptions: string[];
    limitations: string[];
    causality_notice: string;
  };
  assumptions?: string[];
  limitations?: string[];
  suggestedQuestions?: string[];
  auditId?: string;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  { category: 'Sales', questions: [
    'What was completed-order revenue by month in 2025?',
    'Show sales last quarter.',
  ]},
  { category: 'Customers', questions: [
    'Show customers with high churn risk in South region.',
    'How many active customers do we have?',
  ]},
  { category: 'Products', questions: [
    'Which product categories had the highest return rate?',
    'What is the average order value by category?',
  ]},
  { category: 'Analysis', questions: [
    'Why did revenue decline last month?',
    'Compare gross profit across regions for the last quarter.',
  ]},
  { category: 'Causation', questions: [
    'Did the new discount campaign cause revenue growth?',
  ]},
];

export default function AskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'sql' | 'quality' | 'realcheck'>('results');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [originalQuestion, setOriginalQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (q?: string, clarificationChoice?: string) => {
    const queryText = q || question;
    if (!queryText.trim()) return;

    setLoading(true);
    setResult(null);
    setFeedbackSent(false);
    setActiveTab('results');
    if (!clarificationChoice) setOriginalQuestion(queryText);

    try {
      const res = await fetch('/api/query/full-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clarificationChoice ? originalQuestion : queryText,
          clarificationChoice,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Failed to connect to the server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (rating: number, type: string) => {
    if (!result?.auditId) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryRunId: result.auditId,
          rating,
          feedbackType: type,
        }),
      });
      setFeedbackSent(true);
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!result?.auditId) return;
    try {
      await fetch('/api/saved-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: originalQuestion || question,
          queryRunId: result.auditId,
        }),
      });
      alert('Saved to RealTalks!');
    } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          💬 Ask RealOnes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Ask a business question in plain English. We&apos;ll validate everything before showing you the answer.
        </p>
      </div>

      {/* Question Input */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          className="input-field"
          placeholder="Ask a business question... (e.g., 'What was completed-order revenue by month in 2025?')"
          rows={2}
          style={{ resize: 'none', marginBottom: '1rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Press Enter to ask or click the button →
          </span>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !question.trim()}
            className="btn-primary"
            style={{ padding: '0.65rem 2rem' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px' }} /> Analyzing...
              </span>
            ) : 'Ask RealOnes'}
          </button>
        </div>
      </div>

      {/* Suggested Questions */}
      {!result && !loading && (
        <div style={{ marginBottom: '2rem' }} className="animate-fade-in">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Suggested Questions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {SUGGESTED_QUESTIONS.map(cat => (
              <div key={cat.category}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-hover)', marginBottom: '0.5rem' }}>
                  {cat.category}
                </div>
                {cat.questions.map(q => (
                  <div
                    key={q}
                    onClick={() => { setQuestion(q); handleSubmit(q); }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                      transition: 'all 0.2s',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Running the full query pipeline...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Retrieving context → Planning → Generating SQL → Validating → Executing → Checking quality → Generating insight
          </p>
        </div>
      )}

      {/* Clarification */}
      {result?.clarificationNeeded && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🤔</span>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Clarification Needed</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {result.clarificationQuestion}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {result.clarificationOptions?.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(undefined, opt)}
                className="btn-secondary"
                style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {result && !result.success && !result.clarificationNeeded && (
        <div className="glass-card animate-fade-in" style={{
          padding: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⚠️ {result.error}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real Insight is decision support, not a replacement for human judgment.
          </p>
        </div>
      )}

      {/* Results */}
      {result?.success && !result.clarificationNeeded && (
        <div className="animate-fade-in">
          {/* Score Badges */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {result.realScore && (
              <span className={`tag score-${result.realScore}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                Real Score: {result.realScore.toUpperCase()}
              </span>
            )}
            {result.dataVibeStatus && (
              <span className={`tag vibe-${result.dataVibeStatus}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                Data Vibe: {result.dataVibeStatus.replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
            {result.auditId && (
              <span className="tag" style={{
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.7rem',
              }}>
                Audit: {result.auditId?.slice(0, 8)}
              </span>
            )}
          </div>

          {/* KPI Cards */}
          {result.kpiValues && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {Object.entries(result.kpiValues).slice(0, 6).map(([key, value]) => (
                <div key={key} className="kpi-card">
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {typeof value === 'number'
                      ? value > 10000
                        ? `$${(value / 1000).toFixed(0)}K`
                        : value % 1 !== 0
                          ? value.toFixed(1)
                          : value.toLocaleString()
                      : String(value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0' }}>
            {(['results', 'sql', 'quality', 'realcheck'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab ? 600 : 400,
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'realcheck' ? 'RealCheck Card' : tab === 'sql' ? 'SQL' : tab === 'quality' ? 'Data Quality' : 'Results'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            {activeTab === 'results' && (
              <>
                {/* Insight */}
                {result.insight && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      📊 {result.insight.headline}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.7 }}>
                      {result.insight.summary}
                    </p>
                    {result.insight.key_findings.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Key Findings</h4>
                        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {result.insight.key_findings.map((f, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.insight.drivers_or_associations.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Associated Changes</h4>
                        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {result.insight.drivers_or_associations.map((d, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.insight.causality_notice && (
                      <div style={{
                        background: 'var(--warning-bg)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.8rem',
                        color: 'var(--warning)',
                        marginBottom: '1rem',
                      }}>
                        ⚠️ {result.insight.causality_notice}
                      </div>
                    )}
                  </div>
                )}

                {/* Results Table */}
                {result.queryResult && result.queryResult.rows.length > 0 && (
                  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {result.queryResult.columns.map(col => (
                            <th key={col}>{col.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.queryResult.rows.slice(0, 100).map((row, i) => (
                          <tr key={i}>
                            {result.queryResult!.columns.map(col => (
                              <td key={col}>
                                {typeof row[col] === 'number'
                                  ? Number(row[col]) > 1000
                                    ? Number(row[col]).toLocaleString('en-US', { maximumFractionDigits: 2 })
                                    : Number(row[col]).toFixed(2)
                                  : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right' }}>
                      Showing {Math.min(100, result.queryResult.rows.length)} of {result.queryResult.rowCount} rows
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'sql' && (
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Generated SQL</h3>
                <pre className="sql-block">{result.generatedSQL}</pre>
                {result.realCheckCard && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--success-bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--success)' }}>
                    ✅ {String((result.realCheckCard as Record<string, unknown>).sqlValidationStatus)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quality' && (
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Data Quality Checks</h3>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}
                  className={`vibe-${result.dataVibeStatus}`}
                >
                  {result.dataVibeMessage}
                </div>
                {result.realCheckCard && (result.realCheckCard as Record<string, unknown[]>).dataQualityChecks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {((result.realCheckCard as Record<string, unknown[]>).dataQualityChecks as Record<string, unknown>[]).map((check, i) => (
                      <div key={i} style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-input)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{String(check.checkName)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{String(check.details)}</div>
                        </div>
                        <span className={`tag vibe-${check.status}`}>{String(check.status).replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'realcheck' && result.realCheckCard && (
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>RealCheck Card</h3>
                {Object.entries(result.realCheckCard).map(([key, value]) => {
                  if (key === 'dataQualityChecks') return null;
                  return (
                    <div key={key} style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(42, 42, 74, 0.3)',
                      display: 'flex',
                      gap: '1rem',
                    }}>
                      <div style={{ minWidth: '180px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {Array.isArray(value) ? value.join(', ') || '—'
                          : typeof value === 'object' ? JSON.stringify(value)
                          : String(value) || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confidence */}
          {result.realScoreReason && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              fontSize: '0.8rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
            }}>
              {result.realScoreReason}
            </div>
          )}

          {/* Assumptions & Limitations */}
          {(result.assumptions?.length || result.limitations?.length) && (
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              {result.assumptions && result.assumptions.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Assumptions</h4>
                  <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {result.limitations && result.limitations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Limitations</h4>
                  <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {result.limitations.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions: Feedback, Save, Decision */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {!feedbackSent ? (
              <>
                <button onClick={() => handleFeedback(5, 'accurate')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>👍 Accurate</button>
                <button onClick={() => handleFeedback(2, 'misleading')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>⚠️ Misleading</button>
                <button onClick={() => handleFeedback(1, 'wrong')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>❌ Wrong</button>
              </>
            ) : (
              <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✅ Feedback recorded. Thank you!</span>
            )}
            <button onClick={handleSave} className="btn-secondary" style={{ fontSize: '0.8rem' }}>💾 Save RealTalk</button>
            <button onClick={() => router.push('/decisions')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>📝 Create Decision Receipt</button>
          </div>

          {/* Suggested Next Questions */}
          {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
            <div className="glass-card" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Suggested Next Questions
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.suggestedQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuestion(sq); handleSubmit(sq); }}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
            marginTop: '1.5rem',
            textAlign: 'center',
          }}>
            Real Insight is decision support, not a replacement for human judgment.
          </p>
        </div>
      )}
    </div>
  );
}
