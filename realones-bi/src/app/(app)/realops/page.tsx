'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RealOpsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchLogs();
    }
  }, [status, router, category]);

  const fetchLogs = async () => {
    try {
      const url = category ? `/api/audit-logs?category=${category}` : '/api/audit-logs';
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: '30px', height: '30px' }}/></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          ⚙️ RealOps Console
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          System-wide audit trail. Track queries, data quality issues, AI model usage, and security events.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['', 'query', 'auth', 'feedback', 'decision', 'governance', 'error'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="tag"
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              background: category === cat ? 'var(--accent-primary)' : 'var(--bg-input)',
              color: category === cat ? 'white' : 'var(--text-secondary)',
              border: 'none',
              textTransform: 'capitalize',
            }}
          >
            {cat || 'All Categories'}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Category</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td>
                  <div>{log.user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user?.email}</div>
                </td>
                <td>
                  <span className="tag" style={{ background: 'var(--bg-input)', fontSize: '0.7rem' }}>
                    {log.category}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{log.action}</td>
                <td>
                  <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit logs found.
          </div>
        )}
      </div>
    </div>
  );
}
