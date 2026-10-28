import React, { useState, useEffect } from 'react';
import { schoolService } from '../../services/schoolService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Building2, CheckCircle2, Clock, CreditCard } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await schoolService.listSchools();
        setSchools(res.success && res.data ? res.data : []);
      } catch {
        addToast('Failed to load schools', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeCount = schools.filter((s) => s.active).length;
  const paidCount = schools.filter((s) => s.planType === 'PAID').length;
  const trialCount = schools.filter((s) => s.planType === 'TRIAL').length;

  const recent = [...schools]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Overview across every school on the platform.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Schools</div>
            <div className="stat-value">{loading ? '—' : schools.length}</div>
            <div className="stat-subtext">Total schools on the platform</div>
          </div>
          <div className="stat-icon indigo"><Building2 size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Active</div>
            <div className="stat-value">{loading ? '—' : activeCount}</div>
            <div className="stat-subtext">Schools currently active</div>
          </div>
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Paid Plan</div>
            <div className="stat-value">{loading ? '—' : paidCount}</div>
            <div className="stat-subtext">On a paid subscription</div>
          </div>
          <div className="stat-icon"><CreditCard size={20} /></div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Trial Plan</div>
            <div className="stat-value">{loading ? '—' : trialCount}</div>
            <div className="stat-subtext">Still on trial</div>
          </div>
          <div className="stat-icon"><Clock size={20} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>Recently Added Schools</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>School Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No schools yet.</td></tr>
              ) : recent.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.planType === 'PAID' ? <span className="badge badge-primary">Paid</span> : <span className="badge badge-secondary">Trial</span>}</td>
                  <td>{s.active ? <span className="badge badge-success">Active</span> : <span className="badge badge-secondary">Inactive</span>}</td>
                  <td>{s.createdAt ? s.createdAt.split('T')[0] : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
