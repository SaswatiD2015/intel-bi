'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DecisionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    businessQuestion: '',
    businessContext: '',
    decisionTaken: '',
    decisionOwner: '',
    expectedOutcome: '',
    expectedImpact: '',
    reviewDate: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDecisions();
    }
  }, [status, router]);

  const fetchDecisions = async () => {
    try {
      const res = await fetch('/api/decision-reviews');
      setReviews(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/decision-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setShowForm(false);
      setFormData({
        title: '', businessQuestion: '', businessContext: '', decisionTaken: '', 
        decisionOwner: '', expectedOutcome: '', expectedImpact: '', reviewDate: ''
      });
      fetchDecisions();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--warning)';
      case 'reviewed': return 'var(--info)';
      case 'successful': return 'var(--success)';
      case 'failed': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: '30px', height: '30px' }}/></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            📝 Decision Receipts
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Document business decisions made based on data. Review them later to improve decision quality.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Decision Receipt'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card animate-slide-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create Decision Receipt</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Receipt Title</label>
              <input required type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Q3 Pricing Adjustment for Electronics" />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Business Question Answered</label>
              <textarea required className="input-field" rows={3} value={formData.businessQuestion} onChange={e => setFormData({...formData, businessQuestion: e.target.value})} placeholder="What data question led to this?" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Business Context</label>
              <textarea required className="input-field" rows={3} value={formData.businessContext} onChange={e => setFormData({...formData, businessContext: e.target.value})} placeholder="Why was this decision made?" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Decision Taken</label>
              <textarea required className="input-field" rows={2} value={formData.decisionTaken} onChange={e => setFormData({...formData, decisionTaken: e.target.value})} placeholder="What exact action is being taken?" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Decision Owner</label>
              <input required type="text" className="input-field" value={formData.decisionOwner} onChange={e => setFormData({...formData, decisionOwner: e.target.value})} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Review Date (When to evaluate impact)</label>
              <input required type="date" className="input-field" value={formData.reviewDate} onChange={e => setFormData({...formData, reviewDate: e.target.value})} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Expected Outcome</label>
              <input required type="text" className="input-field" value={formData.expectedOutcome} onChange={e => setFormData({...formData, expectedOutcome: e.target.value})} placeholder="e.g., 5% increase in gross profit margin" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Expected Financial/Business Impact</label>
              <input type="text" className="input-field" value={formData.expectedImpact} onChange={e => setFormData({...formData, expectedImpact: e.target.value})} placeholder="e.g., +$50k monthly revenue" />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary">Save Decision Receipt</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {reviews.map(review => (
          <div key={review.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{review.title}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  By {review.user?.name} on {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className="tag" style={{ background: 'var(--bg-input)', color: getStatusColor(review.status), border: `1px solid ${getStatusColor(review.status)}` }}>
                {review.status.toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Decision Taken</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{review.decisionTaken}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Expected Outcome</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{review.expectedOutcome}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Expected Impact</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{review.expectedImpact || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Review Date: {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : 'N/A'}
              </div>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                Conduct Review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
