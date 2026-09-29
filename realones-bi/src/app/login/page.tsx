'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push('/ask');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'analyst' | 'business') => {
    if (type === 'analyst') {
      setEmail('analyst@realonesbi.demo');
    } else {
      setEmail('business@realonesbi.demo');
    }
    setPassword('Demo123!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a1a3e, #0a0a0f 70%)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }} className="animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #6366f1, #a855f7, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            RealOnes BI
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Real Data, Real Metrics, Real Decisions.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            Sign In
          </h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: '18px', height: '18px' }} />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Demo Credentials
          </h3>

          <div
            onClick={() => fillDemo('analyst')}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-input)',
              borderRadius: '10px',
              marginBottom: '0.75rem',
              cursor: 'pointer',
              border: '1px solid var(--border-primary)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>👩‍💻 Analyst</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>analyst@realonesbi.demo</div>
              </div>
              <span className="tag score-high">All Regions</span>
            </div>
          </div>

          <div
            onClick={() => fillDemo('business')}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-input)',
              borderRadius: '10px',
              cursor: 'pointer',
              border: '1px solid var(--border-primary)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>📊 Business User</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>business@realonesbi.demo</div>
              </div>
              <span className="tag score-medium">South Only</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem', lineHeight: 1.6 }}>
            Password for both: <code style={{ color: 'var(--accent-hover)', background: 'var(--bg-input)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>Demo123!</code>
          </p>
        </div>

        {/* Trust statement */}
        <p style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.7rem',
          marginTop: '1.5rem',
          lineHeight: 1.6,
        }}>
          RealOnes BI helps you make evidence-backed decisions. Always review the metric
          definition, data-quality status, and assumptions before acting.
        </p>
      </div>
    </div>
  );
}
