'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RealityCheckPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Example placeholder state for reality checks
  const [checks, setChecks] = useState<any[]>([
    {
      id: 1,
      tableName: 'orders',
      checkName: 'Freshness',
      status: 'good',
      lastRun: new Date().toISOString(),
      details: 'Last updated 5 minutes ago',
    },
    {
      id: 2,
      tableName: 'customers',
      checkName: 'Null Value Check',
      status: 'needs_attention',
      lastRun: new Date().toISOString(),
      details: '5% of customers missing email addresses',
    },
    {
      id: 3,
      tableName: 'returns',
      checkName: 'Anomaly Detection',
      status: 'good',
      lastRun: new Date().toISOString(),
      details: 'Return rate within expected threshold (2.1%)',
    },
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      setLoading(false);
      // Real app would fetch from an API route like /api/data-quality
    }
  }, [status, router]);

  if (loading) {
    return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: '30px', height: '30px' }}/></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          🔍 Reality Check
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Monitor data pipelines, check data freshness, and verify data quality rules across all connected tables.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {checks.map(check => (
          <div key={check.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{check.checkName}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Table: {check.tableName}</div>
              </div>
              <span className={`tag vibe-${check.status}`} style={{ textTransform: 'capitalize' }}>
                {check.status.replace('_', ' ')}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                {check.details}
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Last Run: {new Date(check.lastRun).toLocaleString()}
              </div>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                Run Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
