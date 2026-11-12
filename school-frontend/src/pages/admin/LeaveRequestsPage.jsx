import React, { useState, useEffect, useMemo } from 'react';
import { leaveService } from '../../services/leaveService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { toDisplayClassName, CLASS_CONFIG } from '../../utils/academicClassOrder';
import { CalendarCheck2, FileText, Search, RefreshCw, User, Plus, X, Users, GraduationCap } from 'lucide-react';

const SESSION_OPTIONS = [
  '5 AM - 7 AM',
  '6 AM - 8 AM',
  '9 AM - 12 Noon',
  '4 PM - 7 PM',
  '5 PM - 7 PM',
  '5 PM - 8 PM',
  '6 PM - 8:30 PM',
  'Morning Session',
  'Afternoon Session',
];

/**
 * Admin Leave Records page.
 * Read-only view of all submitted leave records, plus the ability for the admin to
 * record a leave directly for a student whose parent never submitted one — this
 * notifies that student's parent portal.
 */
export const LeaveRequestsPage = () => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'staff'
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [teacherLeaves, setTeacherLeaves] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [allStudents, setAllStudents] = useState([]);
  const [leaveReasons, setLeaveReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  const [showMarkModal, setShowMarkModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState('');
  const [markForm, setMarkForm] = useState({ studentId: '', leaveDate: '', session: '', selectedReasonId: '', customReason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadLeaveRequests();
    leaveService.getActiveReasons().then((res) => {
      if (res.success && res.data) setLeaveReasons(res.data);
    }).catch(() => {});
  }, []);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const [res, stuRes, teacherRes] = await Promise.allSettled([
        leaveService.getAll(),
        studentService.getAllStudents({ page: 1, pageSize: 10000 }),
        leaveService.getAllTeacherLeave(),
      ]);

      if (res.status === 'fulfilled' && res.value?.success && res.value.data) {
        setLeaveRequests(res.value.data);
      } else {
        setLeaveRequests([]);
      }

      if (stuRes.status === 'fulfilled' && stuRes.value) {
        const val = stuRes.value;
        const list = val.data?.data || (Array.isArray(val.data) ? val.data : []);
        const map = {};
        list.forEach((s) => {
          map[s.id] = s;
        });
        setStudentsMap(map);
        setAllStudents(list);
      }

      if (teacherRes.status === 'fulfilled' && teacherRes.value?.success && teacherRes.value.data) {
        setTeacherLeaves(teacherRes.value.data);
      } else {
        setTeacherLeaves([]);
      }
    } catch (err) {
      addToast('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaveRequests.filter((r) => {
    const term = searchTerm.toLowerCase();
    const stu = studentsMap[r.studentId];
    const matchesSearch = (
      String(r.studentId).includes(term) ||
      (r.reason || '').toLowerCase().includes(term) ||
      (r.startDate || '').includes(term) ||
      (stu?.name || '').toLowerCase().includes(term) ||
      (stu?.admissionNumber || '').toLowerCase().includes(term) ||
      (stu?.className || '').toLowerCase().includes(term)
    );
    const matchesDate = !filterDate || (r.leaveDate || r.startDate) === filterDate;
    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    const nameA = studentsMap[a.studentId]?.name || `Student #${a.studentId}`;
    const nameB = studentsMap[b.studentId]?.name || `Student #${b.studentId}`;
    return nameA.localeCompare(nameB);
  });

  const filteredStaffLeaves = teacherLeaves.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (r.teacherName || '').toLowerCase().includes(term) ||
      (r.reason || '').toLowerCase().includes(term) ||
      (r.assignedClass || '').toLowerCase().includes(term) ||
      (r.assignedSection || '').toLowerCase().includes(term)
    );
    const matchesDate = !filterDate || r.startDate === filterDate || r.endDate === filterDate;
    return matchesSearch && matchesDate;
  });

  const studentMatches = useMemo(() => {
    const term = studentQuery.trim().toLowerCase();
    const section = studentSectionFilter.trim().toLowerCase();
    const list = allStudents.filter((s) => {
      const textMatch = !term ||
        (s.name || '').toLowerCase().includes(term) ||
        (s.admissionNumber || '').toLowerCase().includes(term) ||
        (s.className || '').toLowerCase().includes(term);
      const classMatch = !studentClassFilter || s.className === studentClassFilter;
      const sectionMatch = !section || (s.section || '').toLowerCase() === section;
      return textMatch && classMatch && sectionMatch;
    });
    const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return sorted.slice(0, 50);
  }, [studentQuery, studentClassFilter, studentSectionFilter, allStudents]);

  // Sections that actually exist for the selected class (or all sections, if no class chosen yet)
  const availableSections = useMemo(() => {
    const scoped = studentClassFilter
      ? allStudents.filter((s) => s.className === studentClassFilter)
      : allStudents;
    const unique = [...new Set(scoped.map((s) => s.section).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [allStudents, studentClassFilter]);

  const selectedStudent = markForm.studentId ? studentsMap[markForm.studentId] : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const openMarkModal = () => {
    setMarkForm({ studentId: '', leaveDate: '', session: '', selectedReasonId: '', customReason: '' });
    setStudentQuery('');
    setStudentClassFilter('');
    setStudentSectionFilter('');
    setShowMarkModal(true);
  };

  const handleMarkLeave = async (e) => {
    e.preventDefault();
    if (!markForm.studentId) {
      addToast('Please select a student.', 'error');
      return;
    }
    if (!markForm.leaveDate) {
      addToast('Please select a leave date.', 'error');
      return;
    }
    if (!markForm.session) {
      addToast('Please select a session.', 'error');
      return;
    }
    let reasonText = '';
    if (markForm.selectedReasonId === 'OTHER') {
      if (!markForm.customReason.trim()) {
        addToast('Please enter a reason.', 'error');
        return;
      }
      reasonText = markForm.customReason.trim();
    } else if (markForm.selectedReasonId) {
      const found = leaveReasons.find((r) => String(r.id) === String(markForm.selectedReasonId));
      reasonText = found ? found.englishReason : '';
    } else {
      addToast('Please select a reason.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await leaveService.submitAdminLeave({
        studentId: markForm.studentId,
        leaveDate: markForm.leaveDate,
        session: markForm.session,
        reason: reasonText,
      });
      if (res.success) {
        const name = selectedStudent?.name || 'Student';
        addToast(`Leave recorded — ${name}'s parent has been notified.`, 'success');
        setShowMarkModal(false);
        loadLeaveRequests();
      } else {
        addToast(res.message || 'Failed to record leave', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Leave Records' }]} />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Leave Records</h1>
          <p className="page-subtitle">
            Student absences, and staff leave submitted by teachers themselves — in separate sections below.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-secondary" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}>
            {activeTab === 'student' ? `${leaveRequests.length} Student Records` : `${teacherLeaves.length} Staff Records`}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadLeaveRequests}
            disabled={loading}
            title="Refresh leave records"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {activeTab === 'student' && (
            <button className="btn btn-primary btn-sm" onClick={openMarkModal}>
              <Plus size={14} />
              <span>Mark Student on Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600,
            border: 'none', borderBottom: activeTab === 'student' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'transparent', color: activeTab === 'student' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          <GraduationCap size={15} /> Student Leave
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600,
            border: 'none', borderBottom: activeTab === 'staff' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'transparent', color: activeTab === 'staff' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          <Users size={15} /> Staff Leave
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="form-input"
          placeholder={activeTab === 'student' ? 'Search by student name, admission no, class, or reason...' : 'Search by teacher name, class, section, or reason...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, border: 'none', padding: '0.25rem 0', boxShadow: 'none' }}
        />
        {searchTerm && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setSearchTerm('')}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            Clear
          </button>
        )}
        <input
          type="date"
          className="form-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ width: 'auto' }}
          title="Filter by leave date"
        />
        {filterDate && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setFilterDate('')}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            Clear Date
          </button>
        )}
      </div>

      {/* Student Leave Table */}
      {activeTab === 'student' && (
      <div className="table-container">
        <table className="table" style={{ width: '100%', minWidth: '860px' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>S.No</th>
              <th>Name</th>
              <th>Class & Sec</th>
              <th>Leave Date</th>
              <th>Session</th>
              <th>Reason</th>
              <th>Submitted On</th>
              <th style={{ textAlign: 'center', width: '110px' }}>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                  <FileText size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {loading ? 'Loading leave records...' : (searchTerm || filterDate) ? 'No records match your search.' : 'No leave records submitted yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((req, idx) => {
                const stu = studentsMap[req.studentId];
                const recId = req.recordId || req.id;
                const studentName = req.studentName || stu?.name || `Student #${req.studentId}`;
                const rawClass = req.className || stu?.className;
                const section = req.section || stu?.section || '';
                const classDisplay = rawClass
                  ? `${toDisplayClassName(rawClass)}${section ? ` (${section})` : ''}`
                  : '—';
                const leaveDate = req.leaveDate || req.startDate || '—';
                const submittedOn = req.submittedAt || req.createdAt ? formatDate(req.submittedAt || req.createdAt) : '—';
                const recordedByAdmin = req.recordedBy === 'ADMIN';

                return (
                  <tr key={recId}>
                    <td><strong>{idx + 1}</strong></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {studentName}
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {classDisplay}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {leaveDate}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {req.session || '—'}
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.875rem' }}>
                      {req.reason || '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {submittedOn}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${recordedByAdmin ? 'badge-warning' : 'badge-secondary'}`}>
                        {recordedByAdmin ? 'Admin' : 'Parent'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Staff Leave Table */}
      {activeTab === 'staff' && (
      <div className="table-container">
        <table className="table" style={{ width: '100%', minWidth: '780px' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>S.No</th>
              <th>Teacher Name</th>
              <th>Assigned Class & Sec</th>
              <th>Leave Date(s)</th>
              <th>Reason</th>
              <th>Submitted On</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaffLeaves.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                  <Users size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {loading ? 'Loading leave records...' : (searchTerm || filterDate) ? 'No records match your search.' : 'No staff leave submitted yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaffLeaves.map((req, idx) => {
                const classDisplay = req.assignedClass
                  ? `${toDisplayClassName(req.assignedClass)}${req.assignedSection ? ` (${req.assignedSection})` : ''}`
                  : '—';
                const dateRange = req.startDate === req.endDate || !req.endDate
                  ? (req.startDate || '—')
                  : `${req.startDate} – ${req.endDate}`;
                const submittedOn = req.createdAt ? formatDate(req.createdAt) : '—';

                return (
                  <tr key={req.id}>
                    <td><strong>{idx + 1}</strong></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {req.teacherName || `Teacher #${req.teacherId}`}
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {classDisplay}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {dateRange}
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.875rem' }}>
                      {req.reason || '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {submittedOn}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Mark Student on Leave Modal */}
      {showMarkModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => !submitting && setShowMarkModal(false)}
        >
          <div
            className="card"
            style={{ width: '480px', maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarCheck2 size={18} /> Mark Student on Leave
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowMarkModal(false)}
                disabled={submitting}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1rem' }}>
              For a student who is absent without the parent submitting a leave notice. The student's parent portal will be notified.
            </p>

            <form onSubmit={handleMarkLeave}>
              <div className="form-group">
                <label className="form-label">Student *</label>
                {!markForm.studentId ? (
                  <>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '0.65rem', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '1.9rem' }}
                        placeholder="Search student by name, admission no, or class..."
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <select
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.825rem' }}
                        value={studentClassFilter}
                        onChange={(e) => {
                          setStudentClassFilter(e.target.value);
                          setStudentSectionFilter('');
                        }}
                      >
                        <option value="">All Classes</option>
                        {CLASS_CONFIG.map((c) => (
                          <option key={c.internalValue} value={c.internalValue}>{c.displayLabel}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.825rem' }}
                        value={studentSectionFilter}
                        onChange={(e) => setStudentSectionFilter(e.target.value)}
                      >
                        <option value="">All Sections</option>
                        {availableSections.map((sec) => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      {studentMatches.length === 0 ? (
                        <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                          No students found.
                        </div>
                      ) : (
                        studentMatches.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setMarkForm({ ...markForm, studentId: s.id })}
                            style={{
                              padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex',
                              justifyContent: 'space-between', alignItems: 'center',
                              borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {toDisplayClassName(s.className)}{s.section ? ` (${s.section})` : ''} · {s.admissionNumber}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <User size={14} /> {selectedStudent?.name}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        ({toDisplayClassName(selectedStudent?.className)}{selectedStudent?.section ? ` - ${selectedStudent.section}` : ''})
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setMarkForm({ ...markForm, studentId: '' })}
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Leave Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={markForm.leaveDate}
                    onChange={(e) => setMarkForm({ ...markForm, leaveDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Session *</label>
                  <select
                    className="form-input"
                    value={markForm.session}
                    onChange={(e) => setMarkForm({ ...markForm, session: e.target.value })}
                    required
                  >
                    <option value="">Select...</option>
                    {SESSION_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason *</label>
                <select
                  className="form-input"
                  value={markForm.selectedReasonId}
                  onChange={(e) => setMarkForm({ ...markForm, selectedReasonId: e.target.value })}
                  required
                >
                  <option value="">Select a reason...</option>
                  {leaveReasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.englishReason}{r.tamilMeaning ? ` (${r.tamilMeaning})` : ''}
                    </option>
                  ))}
                  <option value="OTHER">Other (specify)</option>
                </select>
              </div>

              {markForm.selectedReasonId === 'OTHER' && (
                <div className="form-group">
                  <label className="form-label">Specify Reason *</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={markForm.customReason}
                    onChange={(e) => setMarkForm({ ...markForm, customReason: e.target.value })}
                    placeholder="Enter the reason for leave"
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {submitting ? 'Recording...' : 'Record Leave & Notify Parent'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
