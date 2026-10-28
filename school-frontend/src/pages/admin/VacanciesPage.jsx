import React, { useState, useEffect } from 'react';
import { vacancyService } from '../../services/vacancyService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

const emptyForm = () => ({ title: '', department: '', description: '', status: 'OPEN' });

export const VacanciesPage = () => {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await vacancyService.list();
      setVacancies(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load vacancies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingVacancy(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditingVacancy(v);
    setForm({ title: v.title, department: v.department || '', description: v.description || '', status: v.status });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast('Title is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingVacancy) {
        await vacancyService.update(editingVacancy.id, form);
        addToast('Vacancy updated.', 'success');
      } else {
        await vacancyService.create(form);
        addToast('Vacancy posted.', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save vacancy', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete the "${v.title}" vacancy? This cannot be undone.`)) return;
    try {
      await vacancyService.remove(v.id);
      addToast('Vacancy deleted.', 'success');
      load();
    } catch {
      addToast('Failed to delete vacancy', 'error');
    }
  };

  const openCount = vacancies.filter((v) => v.status === 'OPEN').length;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Vacancies' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Vacancies</h1>
          <p className="page-subtitle">Internal staff openings for your school.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> Post Vacancy
        </button>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <span className="badge badge-success" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}>
          {openCount} Open
        </span>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Posted</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Loading...</td></tr>
            ) : vacancies.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>No vacancies posted yet.</td></tr>
            ) : vacancies.map((v) => (
              <tr key={v.id} style={{ opacity: v.status === 'OPEN' ? 1 : 0.6 }}>
                <td style={{ fontWeight: 600 }}>{v.title}</td>
                <td>{v.department || '—'}</td>
                <td>{v.postedDate || '—'}</td>
                <td>
                  {v.status === 'OPEN'
                    ? <span className="badge badge-success">Open</span>
                    : <span className="badge badge-secondary">Closed</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}><Edit2 size={14} /> Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v)}><Trash2 size={14} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVacancy ? 'Edit Vacancy' : 'Post Vacancy'}
        icon={Briefcase}
        footer={(
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="vacancyForm" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingVacancy ? 'Save Changes' : 'Post Vacancy'}
            </button>
          </>
        )}
      >
        <form id="vacancyForm" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Title *</label>
            <input className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Primary School Teacher" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department</label>
            <input className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Primary Wing" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {editingVacancy && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
