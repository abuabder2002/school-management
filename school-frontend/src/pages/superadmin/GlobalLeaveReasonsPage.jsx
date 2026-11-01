import React, { useState, useEffect } from 'react';
import { leaveService } from '../../services/leaveService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Plus, Edit2, Trash2, ToggleRight } from 'lucide-react';

/**
 * Super Admin page to manage leave reasons that apply to every school.
 * These appear alongside each school's own reasons in the parent dropdown
 * and in that school's Leave Reasons page (read-only there).
 * Deletion is soft (deactivate) to preserve historical leave records.
 */
export const GlobalLeaveReasonsPage = () => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const res = await leaveService.getGlobalReasons();
      if (res.success && res.data) setReasons(res.data);
    } catch {
      addToast('Failed to load global leave reasons', 'error');
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
        await leaveService.updateGlobalReason(editingReason.id, form);
        addToast('Global leave reason updated', 'success');
      } else {
        await leaveService.createGlobalReason(form);
        addToast('Global leave reason added — now visible to every school', 'success');
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
    if (!window.confirm(`Deactivate "${r.englishReason}" for every school? Historical records using this reason remain intact.`)) return;
    try {
      await leaveService.deleteGlobalReason(r.id);
      addToast('Reason deactivated', 'warning');
      loadReasons();
    } catch {
      addToast('Failed to deactivate reason', 'error');
    }
  };

  const handleReactivate = async (r) => {
    try {
      await leaveService.reactivateGlobalReason(r.id);
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
          <h1 className="page-title">Leave Reasons (All Schools)</h1>
          <p className="page-subtitle">
            Reasons added here appear in every school's parent leave dropdown, alongside that school's own reasons. Schools cannot edit or remove these.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> Add Reason
        </button>
      </div>

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

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>English Reason</th>
              <th>Tamil Meaning / தமிழ் அர்த்தம்</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  Loading...
                </td>
              </tr>
            ) : reasons.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  No global leave reasons yet. Click "Add Reason" to get started.
                </td>
              </tr>
            ) : (
              reasons.map((r) => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <td><strong>#{r.id}</strong></td>
                  <td style={{ fontWeight: 600 }}>{r.englishReason}</td>
                  <td style={{ fontFamily: 'inherit' }}>{r.tamilMeaning}</td>
                  <td>
                    {r.active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-secondary">Deactivated</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
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
                          title="Deactivate for every school"
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReason ? 'Edit Global Leave Reason' : 'Add Global Leave Reason'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              type="submit"
              form="globalReasonForm"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingReason ? 'Save Changes' : 'Add Reason'}
            </button>
          </>
        }
      >
        <form id="globalReasonForm" onSubmit={handleSave}>
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
              Preview in dropdown (every school):{' '}
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
