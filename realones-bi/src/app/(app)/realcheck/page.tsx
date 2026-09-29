'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RealCheckCenterPage() {
  const { status } = useSession();
  const router = useRouter();
  const [glossary, setGlossary] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'glossary' | 'metrics'>('metrics');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          const [glossRes, metricRes] = await Promise.all([
            fetch('/api/glossary'),
            fetch('/api/metrics'),
          ]);
          setGlossary(await glossRes.json());
          setMetrics(await metricRes.json());
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [status, router]);

  const filteredGlossary = glossary.filter(g =>
    g.term.toLowerCase().includes(search.toLowerCase()) ||
    g.definition.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMetrics = metrics.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.definition.toLowerCase().includes(search.toLowerCase()) ||
    m.synonyms?.some((s: any) => s.synonym.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: '30px', height: '30px' }}/></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          ✅ RealCheck Center
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          The single source of truth for business terms, metrics, and definitions used across RealOnes BI.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input-field"
          style={{ maxWidth: '400px' }}
          placeholder="Search metrics or terms..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0' }}>
        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'metrics' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'metrics' ? 'var(--accent-hover)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'metrics' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'metrics' ? 600 : 400,
          }}
        >
          Approved Metrics ({filteredMetrics.length})
        </button>
        <button
          onClick={() => setActiveTab('glossary')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'glossary' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'glossary' ? 'var(--accent-hover)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'glossary' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'glossary' ? 600 : 400,
          }}
        >
          Business Glossary ({filteredGlossary.length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeTab === 'metrics' && filteredMetrics.map(m => (
          <div key={m.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.name}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Owner: {m.owner}</div>
              </div>
              <span className="tag score-high">Approved</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{m.definition}</p>
            <div style={{ background: '#0d1117', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#c9d1d9', marginBottom: '1rem' }}>
              Formula: {m.formula}
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Synonyms:</strong>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {m.synonyms?.map((s: any) => <span key={s.synonym} className="tag" style={{ background: 'var(--bg-input)' }}>{s.synonym}</span>)}
                </div>
              </div>
              <div>
                <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dimensions:</strong>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {m.dimensions?.map((d: any) => <span key={d.dimension} className="tag" style={{ background: 'var(--bg-input)' }}>{d.dimension}</span>)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'glossary' && filteredGlossary.map(g => (
          <div key={g.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{g.term}</h3>
              <span className="tag" style={{ background: 'var(--bg-input)' }}>{g.category}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>{g.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
