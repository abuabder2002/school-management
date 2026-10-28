import React, { useState, useEffect, useMemo } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CalendarClock, Plus, Edit2, Trash2 } from 'lucide-react';
import { CLASS_CONFIG } from '../../utils/academicClassOrder';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const dayLabel = (d) => d.charAt(0) + d.slice(1).toLowerCase();

const emptyForm = () => ({
  dayOfWeek: 'MONDAY',
  periodNumber: 1,
  startTime: '',
  endTime: '',
  subjectName: '',
  teacherName: '',
});

export const DailySchedulePage = () => {
  const [className, setClassName] = useState('Class 1');
  const [section, setSection] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, section]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await scheduleService.getForClass(className, section);
      setEntries(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load class schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const byDay = useMemo(() => {
    const grouped = {};
    DAYS.forEach((d) => { grouped[d] = []; });
    entries.forEach((e) => {
      if (!grouped[e.dayOfWeek]) grouped[e.dayOfWeek] = [];
      grouped[e.dayOfWeek].push(e);
    });
    Object.values(grouped).forEach((list) => list.sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0)));
    return grouped;
  }, [entries]);

  const openAdd = () => {
    setEditingEntry(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      subjectName: entry.subjectName || '',
      teacherName: entry.teacherName || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subjectName.trim()) {
      addToast('Subject is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, className, section: section || null, periodNumber: Number(form.periodNumber) };
      if (editingEntry) {
        await scheduleService.update(editingEntry.id, payload);
        addToast('Schedule entry updated.', 'success');
      } else {
        await scheduleService.create(payload);
        addToast('Schedule entry added.', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save schedule entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    try {
      await scheduleService.remove(entry.id);
      addToast('Schedule entry removed.', 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete schedule entry', 'error');
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Daily Schedule' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Daily Schedule</h1>
          <p className="page-subtitle">Weekly class timetable — period, subject and teacher by day.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Period
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label className="form-label">Class</label>
            <select className="form-select" value={className} onChange={(e) => setClassName(e.target.value)}>
              {CLASS_CONFIG.map((c) => (
                <option key={c.internalValue} value={c.internalValue}>{c.displayLabel}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
            <label className="form-label">Section</label>
            <input className="form-input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A (optional)" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {DAYS.map((day) => (
            <div className="card" key={day}>
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>{dayLabel(day)}</h3>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Period</th>
                      <th style={{ width: '140px' }}>Time</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDay[day].length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No periods scheduled</td></tr>
                    ) : byDay[day].map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontWeight: 600 }}>{entry.periodNumber}</td>
                        <td>{entry.startTime || '—'}{entry.endTime ? ` – ${entry.endTime}` : ''}</td>
                        <td>{entry.subjectName}</td>
                        <td>{entry.teacherName || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn-icon" onClick={() => openEdit(entry)} title="Edit"><Edit2 size={14} /></button>
                          <button className="btn-icon" onClick={() => handleDelete(entry)} title="Delete"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? 'Edit Period' : 'Add Period'}
        icon={CalendarClock}
        footer={(
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        )}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Day</label>
              <select className="form-select" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                {DAYS.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Period Number</label>
              <input className="form-input" type="number" min="1" value={form.periodNumber} onChange={(e) => setForm({ ...form, periodNumber: e.target.value })} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Subject</label>
            <input className="form-input" value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Teacher</label>
            <input className="form-input" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
};
