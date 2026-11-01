import React, { useState, useEffect } from 'react';
import { leaveService } from '../../services/leaveService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { BookMarked, Plus, Edit2, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

/**
 * Admin page to manage predefined leave reasons (English + Tamil).
 * Reasons appear in the parent's leave submission dropdown.
 * Deletion is soft (deactivate) to preserve historical leave records.
 */
export const LeaveReasonsPage = () => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState(null); // null = add mode
  const [form, setForm] = useState({ englishReason: '', tamilMeaning: '' });
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setLoading(true);
      const res = await leaveService.getAllReasons();
      if (res.success && res.data) setReasons(res.data);
    } catch {
      addToast('Failed to load leave reasons', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingReason(null);
    setForm({ englishReason: '', tamilMeaning: '' });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingReason(r);
    setForm({ englishReason: r.englishReason, tamilMeaning: r.tamilMeaning });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.englishReason.trim() || !form.tamilMeaning.trim()) {
      addToast('Both English Reason and Tamil Meaning are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingReason) {
        await leaveService.updateReason(editingReason.id, form);
        addToast('Leave reason updated', 'success');
      } else {
        await leaveService.createReason(form);
        addToast('Leave reason added', 'success');
      }
      setModalOpen(false);
      loadReasons();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save reason', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (r) => {
    if (!window.confirm(`Deactivate "${r.englishReason}"? It will no longer appear in the parent dropdown. Historical records using this reason remain intact.`)) return;
    try {
      await leaveService.deleteReason(r.id);
      addToast('Reason deactivated', 'warning');
      loadReasons();
    } catch {
      addToast('Failed to deactivate reason', 'error');
    }
  };

  const handleReactivate = async (r) => {
    try {
      await leaveService.reactivateReason(r.id);
      addToast('Reason reactivated', 'success');
      loadReasons();
    } catch {
      addToast('Failed to reactivate reason', 'error');
    }
  };

  const activeCount = reasons.filter(r => r.active).length;
  const inactiveCount = reasons.filter(r => !r.active).length;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Leave Reasons' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Leave Reasons</h1>
          <p className="page-subtitle">
            Predefined leave reasons shown in the parent leave submission form (English + Tamil).
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> Add Reason
        </button>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <span className="badge badge-success" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}>
          {activeCount} Active
        </span>
        {inactiveCount > 0 && (
          <span className="badge badge-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}>
            {inactiveCount} Deactivated
          </span>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>English Reason</th>
              <th>Tamil Meaning / தமிழ் அர்த்தம்</th>
              <th>Displayed As</th>
              <th>Source</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  Loading...
                </td>
              </tr>
            ) : reasons.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  No leave reasons defined yet. Click "Add Reason" to get started.
                </td>
              </tr>
            ) : (
              reasons.map((r) => {
                const isGlobal = r.schoolId == null;
                return (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <td><strong>#{r.id}</strong></td>
                  <td style={{ fontWeight: 600 }}>{r.englishReason}</td>
                  <td style={{ fontFamily: 'inherit' }}>{r.tamilMeaning}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                    {r.englishReason} / {r.tamilMeaning}
                  </td>
                  <td>
                    {isGlobal
                      ? <span className="badge badge-secondary" title="Added by Super Admin — applies to every school">Global</span>
                      : <span className="badge badge-secondary">This school</span>
                    }
                  </td>
                  <td>
                    {r.active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-secondary">Deactivated</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isGlobal ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Managed by Super Admin</span>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEdit(r)}
                          title="Edit reason"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        {r.active ? (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeactivate(r)}
                            title="Deactivate (soft-delete)"
                          >
                            <Trash2 size={14} /> Deactivate
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleReactivate(r)}
                            title="Reactivate reason"
                          >
                            <ToggleRight size={14} /> Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReason ? 'Edit Leave Reason' : 'Add Leave Reason'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              type="submit"
              form="reasonForm"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingReason ? 'Save Changes' : 'Add Reason'}
            </button>
          </>
        }
      >
        <form id="reasonForm" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">English Reason *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Fever"
              value={form.englishReason}
              onChange={e => setForm({ ...form, englishReason: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tamil Meaning * (தமிழ் அர்த்தம்)</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. காய்ச்சல்"
              value={form.tamilMeaning}
              onChange={e => setForm({ ...form, tamilMeaning: e.target.value })}
            />
          </div>
          {(form.englishReason || form.tamilMeaning) && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary, #f1f5f9)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              Preview in dropdown:{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {form.englishReason || '...'} / {form.tamilMeaning || '...'}
              </strong>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
