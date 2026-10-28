import React, { useState, useEffect } from 'react';
import { schoolService } from '../../services/schoolService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CalendarClock } from 'lucide-react';

export const SubscriptionViewPage = () => {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await schoolService.getOwnSchool();
        if (res.success && res.data) setSchool(res.data);
      } catch {
        addToast('Failed to load subscription details', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Subscription' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="page-subtitle">Your school's current plan — managed by the platform administrator.</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : !school ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Could not load subscription details.</div>
      ) : (
        <div className="card" style={{ maxWidth: '520px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarClock size={18} className="text-primary" />
            <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>{school.name}</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Plan</span>
              {school.planType === 'PAID'
                ? <span className="badge badge-primary">Paid</span>
                : <span className="badge badge-secondary">Trial</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              {school.active
                ? <span className="badge badge-success">Active</span>
                : <span className="badge badge-secondary">Inactive</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subscribed From</span>
              <strong>{school.subscriptionStart || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Valid Until</span>
              <strong>{school.subscriptionEnd || '—'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
