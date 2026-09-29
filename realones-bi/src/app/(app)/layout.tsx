'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const user = session?.user as Record<string, unknown> | undefined;
  const roles = (user?.roles as string[]) || [];
  const isAnalyst = roles.includes('analyst');
  const regions = (user?.regions as { name: string }[]) || [];

  const navItems = [
    { href: '/ask', label: 'Ask RealOnes', icon: '💬' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/realcheck', label: 'RealCheck Center', icon: '✅' },
    { href: '/decisions', label: 'Decision Receipts', icon: '📝' },
    ...(isAnalyst ? [
      { href: '/reality-check', label: 'Reality Check', icon: '🔍' },
      { href: '/realops', label: 'RealOps Console', icon: '⚙️' },
    ] : []),
  ];

  return (
    <aside style={{
      width: collapsed ? '70px' : '260px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          R
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>RealOnes BI</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Real Data. Real Metrics.</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto' }}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            style={{ marginBottom: '0.25rem' }}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-primary)',
        }}>
          <div style={{
            padding: '0.75rem',
            background: 'var(--bg-card)',
            borderRadius: '10px',
            marginBottom: '0.75rem',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name as string || 'User'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user?.email as string}</div>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {roles.map(r => (
                <span key={r} className="tag" style={{
                  background: 'var(--info-bg)',
                  color: 'var(--info)',
                  fontSize: '0.65rem',
                }}>
                  {r.replace('_', ' ')}
                </span>
              ))}
              {regions.map(r => (
                <span key={r.name} className="tag" style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#a855f7',
                  fontSize: '0.65rem',
                }}>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-secondary"
            style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
