import React, { useState, useEffect, useMemo } from 'react';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Award, Plus, Trash2, Edit2, Save, RefreshCw } from 'lucide-react';

const BOARD_OPTIONS = [
  { value: 'STATE_BOARD', label: 'State Board' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
];

const defaultAcademicYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

const emptyForm = () => ({
  studentName: '',
  board: 'STATE_BOARD',
  standard: 'X',
  academicYear: defaultAcademicYear(),
  subjects: [{ subjectName: '', marks: '' }],
  schoolName: '',
  area: '',
  pincode: '',
  schoolPhone: '',
  photo: '',
});

/**
 * Super Admin's Board Result entry. Student name is typed freely — no search/select step —
 * so results can also be entered for students who don't have an account yet. School is chosen
 * from a picker. studentId is omitted intentionally; it's optional in the backend.
 */
export const BoardResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await academicService.getBoardResults();
      if (res.success && res.data) setResults(res.data);
    } catch {
      addToast('Failed to load board results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalMarks = useMemo(
    () => form.subjects.reduce((sum, s) => sum + (Number(s.marks) || 0), 0),
    [form.subjects]
  );

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const addSubjectRow = () => {
    setForm({ ...form, subjects: [...form.subjects, { subjectName: '', marks: '' }] });
  };

  const removeSubjectRow = (idx) => {
    setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== idx) });
  };

  const updateSubjectRow = (idx, field, value) => {
    const subjects = form.subjects.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    setForm({ ...form, subjects });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height)); height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        setForm((prev) => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.75) }));
      };
      img.onerror = () => addToast('Could not read that image', 'error');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const openEdit = (result) => {
    setEditingId(result.id);
    setForm({
      studentName: result.studentName || '',
      board: result.board,
      standard: result.standard,
      academicYear: result.academicYear,
      subjects: result.subjects && result.subjects.length > 0
        ? result.subjects.map((s) => ({ subjectName: s.subjectName, marks: s.marks }))
        : [{ subjectName: '', marks: '' }],
      schoolName: result.schoolName || '',
      area: result.area || '',
      pincode: result.pincode || '',
      schoolPhone: result.schoolPhone || '',
      photo: result.photo || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this board result?')) return;
    try {
      await academicService.deleteBoardResult(id);
      addToast('Board result deleted', 'success');
      loadResults();
    } catch {
      addToast('Failed to delete board result', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim()) {
      addToast('Please enter the student name', 'warning');
      return;
    }
    const cleanSubjects = form.subjects
      .filter((s) => s.subjectName.trim())
      .map((s) => ({ subjectName: s.subjectName.trim(), marks: Number(s.marks) || 0 }));
    if (cleanSubjects.length === 0) {
      addToast('Add at least one subject with marks', 'warning');
      return;
    }
    const payload = {
      studentName: form.studentName.trim(),
      board: form.board,
      standard: form.standard,
      academicYear: form.academicYear.trim(),
      subjects: cleanSubjects,
      schoolName: form.schoolName.trim(),
      area: form.area.trim(),
      pincode: form.pincode.trim(),
      schoolPhone: form.schoolPhone.trim(),
      photo: form.photo || undefined,
    };
    try {
      setSaving(true);
      if (editingId) {
        await academicService.updateBoardResult(editingId, payload);
        addToast('Board result updated', 'success');
      } else {
        await academicService.createBoardResult(payload);
        addToast('Board result saved', 'success');
      }
      setForm(emptyForm());
      setEditingId(null);
      loadResults();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save board result', 'error');
    } finally {
      setSaving(false);
    }
  };

  const boardLabel = (val) => BOARD_OPTIONS.find((b) => b.value === val)?.label || val;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Board Results' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Add Student — Board Result</h1>
          <p className="page-subtitle">Record Class X / XII board exam results for any school, subject by subject.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadResults} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={15} color="var(--primary)" />
            {editingId ? 'Edit Board Result' : 'Add Board Result'}
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Student
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Student Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type student name"
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Board *</label>
                <select className="form-select" value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}>
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Class *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. X, XII"
                  value={form.standard}
                  onChange={(e) => setForm({ ...form, standard: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Academic Year *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2026-2027"
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '1.5rem 0 0.6rem' }}>
              Board Result
            </div>
            <div>
              <label className="form-label">Subjects & Marks *</label>
              {form.subjects.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 2 }}
                    placeholder="Subject name (type it in)"
                    value={s.subjectName}
                    onChange={(e) => updateSubjectRow(idx, 'subjectName', e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Marks (0-100)"
                    min="0"
                    max="100"
                    value={s.marks}
                    onChange={(e) => updateSubjectRow(idx, 'marks', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => removeSubjectRow(idx)}
                    disabled={form.subjects.length === 1}
                    title="Remove subject"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSubjectRow}>
                <Plus size={13} /> Add Subject
              </button>
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '1.5rem 0 0.6rem' }}>
              School Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">School Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="School name"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Area</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">School Phone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="School phone"
                  value={form.schoolPhone}
                  onChange={(e) => setForm({ ...form, schoolPhone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Student Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {form.photo ? (
                  <img
                    src={form.photo}
                    alt="Student preview"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    No photo
                  </div>
                )}
                <input type="file" accept="image/*" className="form-input" onChange={handlePhotoSelect} style={{ flex: 1 }} />
                {form.photo && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, photo: '' })}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                Total Marks: <span style={{ color: 'var(--primary)' }}>{totalMarks}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingId && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>Cancel</button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Result'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Saved Results</h3>
          <span className="badge badge-secondary">{results.length} Result{results.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student Name</th>
                <th>Total</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Loading...</td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>No board results recorded yet.</td></tr>
              ) : (
                results.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {r.photo ? (
                          <img src={r.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary, #f1f5f9)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {boardLabel(r.board)} · {r.standard} · {r.academicYear}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.totalMarks}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)}><Edit2 size={13} /> Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}><Trash2 size={13} /> Del</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
