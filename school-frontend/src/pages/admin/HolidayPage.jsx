import React, { useState, useEffect } from 'react';
import { holidayService } from '../../services/holidayService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Calendar, Plus, Trash2, Edit2, Sun } from 'lucide-react';

export const HolidayPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    holidayType: 'PUBLIC',
  });

  // Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    description: '',
    holidayType: 'PUBLIC',
  });

  const { addToast } = useToast();

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const res = await holidayService.getAll();
      if (res.success && res.data) {
        const sorted = [...res.data].sort((a, b) => new Date(a.date) - new Date(b.date));
        setHolidays(sorted);
      } else {
        setHolidays([]);
      }
    } catch (err) {
      addToast('Failed to load holidays', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await holidayService.create(createForm);
      addToast('Holiday added successfully!', 'success');
      setCreateModal(false);
      setCreateForm({
        name: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        holidayType: 'PUBLIC',
      });
      loadHolidays();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add holiday', 'error');
    }
  };

  const openEditModal = (h) => {
    setEditingHoliday(h);
    setEditForm({
      name: h.name || '',
      date: h.date || '',
      description: h.description || '',
      holidayType: h.holidayType || 'PUBLIC',
    });
    setEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingHoliday) return;
    try {
      await holidayService.update(editingHoliday.id, editForm);
      addToast('Holiday updated successfully!', 'success');
      setEditModal(false);
      setEditingHoliday(null);
      loadHolidays();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update holiday', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await holidayService.delete(id);
      addToast('Holiday deleted successfully', 'success');
      loadHolidays();
    } catch (err) {
      addToast('Failed to delete holiday', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <Sun className="text-warning" /> School Holidays & Calendar
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Manage official school holidays and special events</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={18} /> Add Holiday
        </button>
      </div>

      {/* Holiday Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Holiday Name</th>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {loading ? 'Loading holidays...' : 'No holidays scheduled yet.'}
                </td>
              </tr>
            ) : (
              holidays.map((h) => {
                const isUpcoming = new Date(h.date) >= new Date(new Date().toDateString());
                return (
                  <tr key={h.id}>
                    <td><strong>#{h.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td>
                      <span className={`badge ${isUpcoming ? 'badge-primary' : 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} /> {h.date}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${h.holidayType === 'PUBLIC' ? 'badge-warning' : 'badge-success'}`}>
                        {h.holidayType || 'PUBLIC'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {h.description || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(h)}
                        style={{ marginRight: '0.5rem' }}
                        title="Edit Holiday"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(h.id)}
                        title="Delete Holiday"
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
        title="Add School Holiday"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" form="createHolidayForm" className="btn btn-primary">Save Holiday</button>
          </>
        }
      >
        <form id="createHolidayForm" onSubmit={handleCreate}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Holiday Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Independence Day, Annual Sports Break"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Holiday Type *</label>
              <select
                className="form-control"
                value={createForm.holidayType}
                onChange={(e) => setCreateForm({ ...createForm, holidayType: e.target.value })}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="SCHOOL">SCHOOL</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description / Remarks</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Optional notes or details..."
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
        title="Edit Holiday"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" form="editHolidayForm" className="btn btn-primary">Update Holiday</button>
          </>
        }
      >
        <form id="editHolidayForm" onSubmit={handleUpdate}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Holiday Name *</label>
            <input
              type="text"
              className="form-control"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Holiday Type *</label>
              <select
                className="form-control"
                value={editForm.holidayType}
                onChange={(e) => setEditForm({ ...editForm, holidayType: e.target.value })}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="SCHOOL">SCHOOL</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description / Remarks</label>
            <textarea
              className="form-control"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
