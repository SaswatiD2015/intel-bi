'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [regionComp, setRegionComp] = useState<any[]>([]);
  const [categoryComp, setCategoryComp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          const [sumRes, trendRes, regRes, catRes] = await Promise.all([
            fetch('/api/dashboard/summary'),
            fetch('/api/dashboard/revenue-trend'),
            fetch('/api/dashboard/region-comparison'),
            fetch('/api/dashboard/category-comparison'),
          ]);

          setSummary(await sumRes.json());
          setRevenueTrend(await trendRes.json());
          setRegionComp(await regRes.json());
          setCategoryComp(await catRes.json());
        } catch (e) {
          console.error('Failed to load dashboard data', e);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [status, router]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  const formatCurrency = (val: number) => `$${(val / 1000).toFixed(1)}k`;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            📊 Executive Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Overview of key business metrics. Data is filtered according to your region access.
          </p>
        </div>
        {summary?.dataVibeStatus && (
          <div className={`tag vibe-${summary.dataVibeStatus}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Data Quality: {summary.dataVibeStatus.toUpperCase()}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="kpi-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${(summary.revenue / 1000).toFixed(1)}k</div>
          </div>
          <div className="kpi-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Profit</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${(summary.grossProfit / 1000).toFixed(1)}k</div>
          </div>
          <div className="kpi-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit Margin</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.profitMargin}%</div>
          </div>
          <div className="kpi-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.totalOrders}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
        {/* Revenue Trend */}
        <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue Trend (24 Months)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
              <XAxis dataKey="month" stroke="#6b6b99" fontSize={12} tickLine={false} />
              <YAxis stroke="#6b6b99" fontSize={12} tickFormatter={formatCurrency} tickLine={false} axisLine={false} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Region Comparison */}
        <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue by Region</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={regionComp} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" horizontal={false} />
              <XAxis type="number" stroke="#6b6b99" fontSize={12} tickFormatter={formatCurrency} />
              <YAxis dataKey="region" type="category" stroke="#a0a0cc" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px' }} />
              <Bar dataKey="revenue" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
