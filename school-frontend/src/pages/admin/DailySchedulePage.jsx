import React, { useState, useEffect, useMemo } from 'react';
import { scheduleService } from '../../services/scheduleService';
import { authService } from '../../services/authService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import { toDisplayClassName, toApplicationClassName, compareAcademicClasses, isClassMatch } from '../../utils/academicClassOrder';

const ADD_MANUALLY = '__add_manually__';

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
  const [students, setStudents] = useState([]);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [scheduledSections, setScheduledSections] = useState([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  // Classes/sections typed in by hand this visit (they persist once an entry is saved under them).
  const [manualClasses, setManualClasses] = useState([]);
  const [manualSections, setManualSections] = useState({});
  const [addingClass, setAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  // Classes come from what this school actually uploaded (its students' classes, e.g. "State Board
  // Boys"), plus classes already scheduled and any typed in by hand — never a fixed LKG-XII list.
  const classOptions = useMemo(() => {
    const byKey = new Map();
    const add = (raw) => {
      const name = toApplicationClassName(raw);
      if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
    };
    students.forEach((s) => add(s.className));
    scheduledClasses.forEach(add);
    manualClasses.forEach(add);
    add(form.className);
    return [...byKey.values()].sort(compareAcademicClasses);
  }, [students, scheduledClasses, manualClasses, form.className]);

  // Sections: from the class's enrolled students, sections already scheduled for it, and any typed in.
  const sectionOptions = useMemo(() => {
    const sections = new Set();
    students
      .filter((s) => isClassMatch(s.className, form.className))
      .forEach((s) => s.section && sections.add(s.section));
    scheduledSections.forEach((s) => sections.add(s));
    (manualSections[form.className] || []).forEach((s) => sections.add(s));
    if (form.section) sections.add(form.section);
    return [...sections].sort();
  }, [students, scheduledSections, manualSections, form.className, form.section]);

  useEffect(() => {
    loadStaff();
    loadClassSources();
  }, []);

  // Default to the school's first class once its data has loaded, instead of a hardcoded one.
  useEffect(() => {
    if (optionsLoaded && !form.className && classOptions.length > 0) {
      setForm((f) => ({ ...f, className: classOptions[0] }));
    }
  }, [optionsLoaded, classOptions, form.className]);

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

  const loadClassSources = async () => {
    const [studentsRes, scheduledRes] = await Promise.allSettled([
      studentService.getAllStudents({ page: 1, pageSize: 10000, status: 'Active' }),
      scheduleService.getScheduledClasses(),
    ]);
    if (studentsRes.status === 'fulfilled') {
      const res = studentsRes.value;
      setStudents(res?.data?.data || (Array.isArray(res?.data) ? res.data : []));
    } else {
      addToast('Failed to load this school\'s classes', 'error');
    }
    if (scheduledRes.status === 'fulfilled' && scheduledRes.value?.success) {
      setScheduledClasses(scheduledRes.value.data || []);
    }
    setOptionsLoaded(true);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await scheduleService.getForClass(form.className, form.section);
      const list = res.success && res.data ? res.data : [];
      setEntries(list);
      // Viewing a whole class (no section filter) tells us which sections it has been scheduled under.
      if (!form.section) {
        setScheduledSections([...new Set(list.map((e) => e.section).filter(Boolean))]);
      }
    } catch {
      addToast('Failed to load class schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const commitNewClass = () => {
    const name = toApplicationClassName(newClassName.trim());
    if (!name) {
      addToast('Type a class name first.', 'warning');
      return;
    }
    setManualClasses((prev) => [...prev, name]);
    setForm((f) => ({ ...f, className: name, section: '' }));
    setNewClassName('');
    setAddingClass(false);
  };

  const commitNewSection = () => {
    const name = newSectionName.trim();
    if (!name) {
      addToast('Type a section name first.', 'warning');
      return;
    }
    setManualSections((prev) => ({ ...prev, [form.className]: [...(prev[form.className] || []), name] }));
    setForm((f) => ({ ...f, section: name }));
    setNewSectionName('');
    setAddingSection(false);
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
                {addingClass ? (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <input
                      className="form-input"
                      style={{ minWidth: 0 }}
                      autoFocus
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitNewClass(); } }}
                      placeholder="e.g. State Board Boys"
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={commitNewClass} title="Add class"><Plus size={14} /></button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingClass(false); setNewClassName(''); }} title="Cancel"><X size={14} /></button>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={form.className}
                    onChange={(e) => {
                      if (e.target.value === ADD_MANUALLY) {
                        setAddingClass(true);
                      } else {
                        setForm({ ...form, className: e.target.value, section: '' });
                      }
                    }}
                    disabled={!optionsLoaded}
                  >
                    {!optionsLoaded && <option value="">Loading...</option>}
                    {optionsLoaded && classOptions.length === 0 && <option value="">No classes yet — add one</option>}
                    {classOptions.map((name) => (
                      <option key={name} value={name}>{toDisplayClassName(name)}</option>
                    ))}
                    <option value={ADD_MANUALLY}>+ Add class manually…</option>
                  </select>
                )}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Section</label>
                {addingSection ? (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <input
                      className="form-input"
                      style={{ minWidth: 0 }}
                      autoFocus
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitNewSection(); } }}
                      placeholder="e.g. A or Morning"
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={commitNewSection} title="Add section"><Plus size={14} /></button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingSection(false); setNewSectionName(''); }} title="Cancel"><X size={14} /></button>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={form.section}
                    onChange={(e) => {
                      if (e.target.value === ADD_MANUALLY) {
                        setAddingSection(true);
                      } else {
                        setForm({ ...form, section: e.target.value });
                      }
                    }}
                    disabled={!form.className}
                  >
                    <option value="">No Section</option>
                    {sectionOptions.map((s) => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                    <option value={ADD_MANUALLY}>+ Add section manually…</option>
                  </select>
                )}
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
