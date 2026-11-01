import React, { useState, useEffect, useMemo } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { authService } from '../../services/authService';
import { academicService } from '../../services/academicService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Edit2, Trash2 } from 'lucide-react';
import { toDisplayClassName, compareAcademicClasses, isClassMatch } from '../../utils/academicClassOrder';

const emptyForm = () => ({
  scheduleDate: new Date().toISOString().slice(0, 10),
  className: '',
  section: '',
  subjectName: '',
  teacherName: '',
  block: 'A',
});

export const DailySchedulePage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState([]);
  const [academicClasses, setAcademicClasses] = useState([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  // Only the classes/sections this school has actually added — never a fixed LKG-XII list,
  // since one school may stop at Class 5 and another may go all the way to Class 12.
  const classOptions = useMemo(() => {
    const names = [...new Set(academicClasses.map((c) => c.name).filter(Boolean))];
    return names.sort(compareAcademicClasses);
  }, [academicClasses]);

  // Sections come from the actual student roster (a class's section split is defined by its
  // enrolled students, not the single-section-per-class AcademicClass master list).
  const sectionOptions = useMemo(() => {
    const sections = students
      .filter((s) => isClassMatch(s.className, form.className))
      .map((s) => s.section)
      .filter(Boolean);
    return [...new Set(sections)].sort();
  }, [students, form.className]);

  useEffect(() => {
    loadStaff();
    loadAcademicClasses();
    loadStudents();
  }, []);

  // Default to the school's first configured class once loaded, instead of a hardcoded one.
  useEffect(() => {
    if (classesLoaded && !form.className && classOptions.length > 0) {
      setForm((f) => ({ ...f, className: classOptions[0] }));
    }
  }, [classesLoaded, classOptions, form.className]);

  useEffect(() => {
    if (!form.className) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.className, form.section]);

  const loadStaff = async () => {
    try {
      const res = await authService.getStaffAccounts();
      if (res.success && res.data) {
        setStaffOptions(res.data.filter((s) => s.role === 'TEACHER'));
      }
    } catch {
      // non-fatal — Staff dropdown just stays empty
    }
  };

  const loadAcademicClasses = async () => {
    try {
      const res = await academicService.getAllClasses();
      setAcademicClasses(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load this school\'s classes', 'error');
    } finally {
      setClassesLoaded(true);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentService.getAllStudents({ page: 1, pageSize: 10000, status: 'Active' });
      const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
      setStudents(list);
    } catch {
      // non-fatal — Section dropdown just stays empty until classes/students are picked
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await scheduleService.getForClass(form.className, form.section);
      setEntries(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load class schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm((f) => ({ ...emptyForm(), className: f.className, section: f.section }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subjectName.trim()) {
      addToast('Subject is required.', 'warning');
      return;
    }
    if (!form.scheduleDate) {
      addToast('Date is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, section: form.section || null };
      if (editingId) {
        await scheduleService.update(editingId, payload);
        addToast('Schedule entry updated.', 'success');
      } else {
        await scheduleService.create(payload);
        addToast('Schedule entry added.', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save schedule entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      scheduleDate: entry.scheduleDate || '',
      className: entry.className,
      section: entry.section || '',
      subjectName: entry.subjectName || '',
      teacherName: entry.teacherName || '',
      block: entry.block || 'A',
    });
  };

  const handleDelete = async (entry) => {
    try {
      await scheduleService.remove(entry.id);
      addToast('Schedule entry removed.', 'success');
      if (editingId === entry.id) resetForm();
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete schedule entry', 'error');
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Daily Schedule' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Daily Schedule</h1>
          <p className="page-subtitle">Log each day's class schedule by block.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>
            {editingId ? 'Edit Entry' : 'Add Entry'}
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.9rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.scheduleDate}
                  onChange={(e) => setForm({ ...form, scheduleDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Class</label>
                <select
                  className="form-select"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value, section: '' })}
                  disabled={!classesLoaded || classOptions.length === 0}
                >
                  {classOptions.length === 0 ? (
                    <option value="">{classesLoaded ? 'No classes added yet' : 'Loading...'}</option>
                  ) : (
                    classOptions.map((name) => (
                      <option key={name} value={name}>{toDisplayClassName(name)}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Section</label>
                <select className="form-select" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                  <option value="">No Section</option>
                  {sectionOptions.map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject</label>
                <input
                  className="form-input"
                  value={form.subjectName}
                  onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                  placeholder="Type subject name"
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Staff</label>
                <select className="form-select" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })}>
                  <option value="">Select staff</option>
                  {staffOptions.map((s) => (
                    <option key={s.id || s.email} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">A Block / B Block</label>
                <select className="form-select" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })}>
                  <option value="A">A Block</option>
                  <option value="B">B Block</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Submit'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600 }}>Daily Schedule Summary</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Class</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Staff</th>
                <th>Block</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No schedule entries yet.</td></tr>
              ) : entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.scheduleDate}</td>
                  <td>{toDisplayClassName(entry.className)}</td>
                  <td>{entry.section || '—'}</td>
                  <td>{entry.subjectName}</td>
                  <td>{entry.teacherName || '—'}</td>
                  <td>{entry.block} Block</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-icon" onClick={() => handleEdit(entry)} title="Edit"><Edit2 size={14} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(entry)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
