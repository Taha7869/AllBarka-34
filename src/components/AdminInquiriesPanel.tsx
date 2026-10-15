import React, { useEffect, useState } from 'react';
import { adminRequest } from '../lib/adminClient';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { formatAdminDate } from '../lib/adminPresentation';
import { CheckCircle2, Clock } from 'lucide-react';

export type Inquiry = {
  ticketId: string;
  name: string;
  contact: string;
  topic: string;
  message: string;
  createdAt: string;
  status: 'PENDING' | 'RESOLVED';
};

export default function AdminInquiriesPanel() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { language } = useLanguage();
  const { currentUser } = useAuth();

  useEffect(() => {
    let active = true;
    if (!currentUser) return;
    const fetchInquiries = async () => {
      try {
        setLoading(true);
        const data = await adminRequest<{ inquiries: Inquiry[] }>(
          () => currentUser.getIdToken(),
          '/api/admin/inquiries'
        );
        if (active) setInquiries(data.inquiries);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load inquiries');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchInquiries();
    return () => { active = false; };
  }, [currentUser]);

  const markResolved = async (ticketId: string) => {
    if (!currentUser) return;
    try {
      setBusy(true);
      await adminRequest(
        () => currentUser.getIdToken(),
        '/api/admin/inquiries/' + ticketId + '/status',
        { body: { status: 'RESOLVED' } }
      );
      setInquiries(prev => prev.map(inq => inq.ticketId === ticketId ? { ...inq, status: 'RESOLVED' } : inq));
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="admin-ledger-loading">Loading inquiries...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="admin-section">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Inquiries ({inquiries.length})</h2>
      {inquiries.length === 0 ? (
        <p className="admin-muted">No inquiries found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {inquiries.map(inq => (
            <article key={inq.ticketId} style={{ padding: '1rem', background: '#FDFCFA', border: '1px solid #B8935F50', borderRadius: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{inq.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>{inq.contact}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: inq.status === 'RESOLVED' ? '#e6f4ea' : '#fef7e0', color: inq.status === 'RESOLVED' ? '#137333' : '#b06000', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {inq.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {inq.status}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>{formatAdminDate(inq.createdAt, language)}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B8935F', fontWeight: 700 }}>Topic: {inq.topic}</span>
                <p style={{ marginTop: '0.25rem', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#333' }}>{inq.message}</p>
              </div>
              
              {inq.status === 'PENDING' && (
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  disabled={busy}
                  onClick={() => markResolved(inq.ticketId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={16} /> Mark Resolved
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
