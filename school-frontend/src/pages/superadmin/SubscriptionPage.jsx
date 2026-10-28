import React, { useState, useEffect } from 'react';
import { schoolService } from '../../services/schoolService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CalendarClock, Edit } from 'lucide-react';

const toEditForm = (s) => ({
  subscriptionStart: s.subscriptionStart || '',
  subscriptionEnd: s.subscriptionEnd || '',
  planType: s.planType || 'TRIAL',
  active: s.active,
});

export const SubscriptionPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editSchool, setEditSchool] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await schoolService.listSchools();
      setSchools(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (school) => {
    setEditSchool(school);
    setEditForm(toEditForm(school));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editSchool) return;
    setSaving(true);
    try {
      await schoolService.updateSubscription(editSchool.id, {
        subscriptionStart: editForm.subscriptionStart || null,
        subscriptionEnd: editForm.subscriptionEnd || null,
        planType: editForm.planType,
        active: editForm.active,
      });
      addToast(`Subscription updated for ${editSchool.name}.`, 'success');
      setEditSchool(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update subscription', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Subscription' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="page-subtitle">Track each school's subscription period and plan.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>School Name</th>
                <th>User ID</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Plan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : schools.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No schools yet.</td></tr>
              ) : schools.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.adminEmail || '—'}</td>
                  <td>{s.subscriptionStart || '—'}</td>
                  <td>{s.subscriptionEnd || '—'}</td>
                  <td>
                    {s.planType === 'PAID'
                      ? <span className="badge badge-primary">Paid</span>
                      : <span className="badge badge-secondary">Trial</span>}
                  </td>
                  <td>
                    {s.active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-secondary">Inactive</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(s)}>
                      <Edit size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editSchool}
        onClose={() => setEditSchool(null)}
        title={editSchool ? `Subscription — ${editSchool.name}` : 'Subscription'}
        icon={CalendarClock}
        footer={(
          <>
            <button className="btn btn-secondary" onClick={() => setEditSchool(null)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
      >
        {editForm && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="form-group">
              <label>From Date</label>
              <input className="form-input" type="date" value={editForm.subscriptionStart} onChange={(e) => setEditForm({ ...editForm, subscriptionStart: e.target.value })} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input className="form-input" type="date" value={editForm.subscriptionEnd} onChange={(e) => setEditForm({ ...editForm, subscriptionEnd: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Plan</label>
              <select className="form-select" value={editForm.planType} onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}>
                <option value="TRIAL">Trial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                Active
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
