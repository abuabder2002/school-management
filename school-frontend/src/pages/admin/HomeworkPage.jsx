import React, { useState, useEffect } from 'react';
import { homeworkService } from '../../services/homeworkService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { BookOpen, Plus, Trash2, Calendar, Edit2, Filter } from 'lucide-react';

export const HomeworkPage = () => {
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('ALL');

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    className: 'Class 10',
    section: 'A',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  // Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [editingHw, setEditingHw] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    className: '',
    section: '',
    dueDate: '',
  });

  const { addToast } = useToast();

  useEffect(() => {
    loadHomework();
  }, []);

  const loadHomework = async () => {
    try {
      setLoading(true);
      const res = await homeworkService.getAll();
      if (res.success && res.data) {
        setHomeworkList(res.data);
      } else {
        setHomeworkList([]);
      }
    } catch (err) {
      addToast('Failed to load homework assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await homeworkService.create(createForm);
      addToast('Homework assigned successfully!', 'success');
      setCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        className: 'Class 10',
        section: 'A',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
      loadHomework();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create homework', 'error');
    }
  };

  const openEditModal = (hw) => {
    setEditingHw(hw);
    setEditForm({
      title: hw.title || '',
      description: hw.description || '',
      className: hw.className || '',
      section: hw.section || '',
      dueDate: hw.dueDate || '',
    });
    setEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingHw) return;
    try {
      await homeworkService.update(editingHw.id, editForm);
      addToast('Homework updated successfully!', 'success');
      setEditModal(false);
      setEditingHw(null);
      loadHomework();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update homework', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this homework?')) return;
    try {
      await homeworkService.delete(id);
      addToast('Homework deleted successfully', 'success');
      loadHomework();
    } catch (err) {
      addToast('Failed to delete homework', 'error');
    }
  };

  const filteredList = classFilter === 'ALL'
    ? homeworkList
    : homeworkList.filter(h => h.className === classFilter);

  const uniqueClasses = Array.from(new Set(homeworkList.map(h => h.className).filter(Boolean)));

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <BookOpen className="text-primary" /> Homework Management
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Create and manage student homework assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={18} /> Assign Homework
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Filter size={18} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by Class:</span>
        <select
          className="form-control"
          style={{ width: 'auto', display: 'inline-block' }}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="ALL">All Classes ({homeworkList.length})</option>
          {uniqueClasses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Homework Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Class & Section</th>
              <th>Description</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {loading ? 'Loading homework...' : 'No homework assignments found.'}
                </td>
              </tr>
            ) : (
              filteredList.map((hw) => {
                const isOverdue = hw.dueDate && new Date(hw.dueDate) < new Date(new Date().toDateString());
                return (
                  <tr key={hw.id}>
                    <td><strong>#{hw.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{hw.title}</td>
                    <td>
                      <span className="badge badge-primary">
                        {hw.className} {hw.section ? `(${hw.section})` : ''}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                      {hw.description}
                    </td>
                    <td>
                      <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} /> {hw.dueDate}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(hw)}
                        style={{ marginRight: '0.5rem' }}
                        title="Edit Homework"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(hw.id)}
                        title="Delete Homework"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Assign New Homework"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" form="createHwForm" className="btn btn-primary">Publish Homework</button>
          </>
        }
      >
        <form id="createHwForm" onSubmit={handleCreate}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Homework Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Chapter 4 Exercise 1-10"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Class 10"
                value={createForm.className}
                onChange={(e) => setCreateForm({ ...createForm, className: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A"
                value={createForm.section}
                onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description / Instructions *</label>
            <textarea
              className="form-control"
              rows={4}
              required
              placeholder="Detailed instructions or questions..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Homework"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" form="editHwForm" className="btn btn-primary">Save Changes</button>
          </>
        }
      >
        <form id="editHwForm" onSubmit={handleUpdate}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Homework Title *</label>
            <input
              type="text"
              className="form-control"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={editForm.className}
                onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-control"
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={editForm.dueDate}
              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description / Instructions *</label>
            <textarea
              className="form-control"
              rows={4}
              required
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
