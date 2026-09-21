import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { academicService } from '../../services/academicService';
import { homeworkService } from '../../services/homeworkService';
import { holidayService } from '../../services/holidayService';
import { leaveService } from '../../services/leaveService';
import {
  User,
  CalendarCheck,
  DollarSign,
  Award,
  CheckCircle,
  AlertCircle,
  UserX,
  BookOpen,
  Palmtree,
  FileText,
  Clock,
  Send,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'marks', label: 'Marks', icon: Award },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'holidays', label: 'Holidays', icon: Palmtree },
  { id: 'leave', label: 'Leave', icon: FileText },
];

export const ParentDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [marks, setMarks] = useState([]);
  const [homework, setHomework] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const parentId = user?.userId;
  const studentId = user?.studentId;

  useEffect(() => {
    if (studentId) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [studentId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      let currentClassName = '';
      try {
        const stuRes = await studentService.getStudentById(studentId);
        if (stuRes.success && stuRes.data) {
          setChild(stuRes.data);
          currentClassName = stuRes.data.className;
        }
      } catch (e) {
        console.error('Student load failed', e);
      }

      const [attRes, feeRes, mrkRes, hwRes, holRes, lvRes] = await Promise.allSettled([
        attendanceService.getAttendanceByStudent(studentId),
        feeService.getFeesByStudent(studentId),
        academicService.getMarksByStudent(studentId),
        currentClassName ? homeworkService.getByClass(currentClassName) : Promise.resolve({ data: [] }),
        holidayService.getAll(),
        leaveService.getMyLeave(),
      ]);

      if (attRes.status === 'fulfilled' && attRes.value?.data) setAttendance(attRes.value.data);
      if (feeRes.status === 'fulfilled' && feeRes.value?.data) setFees(feeRes.value.data);
      if (mrkRes.status === 'fulfilled' && mrkRes.value?.data) setMarks(mrkRes.value.data);
      if (hwRes.status === 'fulfilled' && hwRes.value?.data) setHomework(hwRes.value.data || []);
      if (holRes.status === 'fulfilled' && holRes.value?.data) setHolidays(holRes.value.data || []);
      if (lvRes.status === 'fulfilled' && lvRes.value?.data) setLeaveRequests(lvRes.value.data || []);
    } catch (err) {
      console.error('Failed to load parent overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (child?.className) {
      homeworkService.getByClass(child.className)
        .then(data => { if (data.success && data.data) setHomework(data.data); })
        .catch(() => {});
    }
  }, [child]);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.reason) {
      addToast('Start date and reason are required', 'warning');
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await leaveService.submit(leaveForm);
      if (res.success) {
        addToast('Leave request submitted successfully!', 'success');
        setLeaveForm({ startDate: '', endDate: '', reason: '' });
        const lvRes = await leaveService.getMyLeave();
        if (lvRes.success && lvRes.data) setLeaveRequests(lvRes.data);
      } else {
        addToast(res.message || 'Failed to submit leave', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit leave request', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Computed stats
  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;
  const totalPending = fees.reduce((acc, f) => acc + parseFloat(f.pendingAmount || 0), 0);
  const getChildName = (c) => c?.name || 'Student';
  const getAdmissionNo = (c) => c?.admissionNumber || 'N/A';

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading parent dashboard...
      </div>
    );
  }

  if (!child) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Parent Portal</h1>
        </div>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <UserX size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Student Associated</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            No student record is linked to your account (Parent ID #{parentId}).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Please contact the school administrator to link your child's record.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const map = {
      PENDING: 'badge-warning',
      APPROVED: 'badge-success',
      REJECTED: 'badge-danger',
    };
    return map[status] || 'badge-secondary';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Parent Portal</h1>
          <p className="page-subtitle">
            Viewing: <strong>{getChildName(child)}</strong> | Admission #{getAdmissionNo(child)} | {child.className} – {child.section || 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1rem', border: 'none', cursor: 'pointer',
              background: activeTab === id ? 'var(--primary)' : 'transparent',
              color: activeTab === id ? '#fff' : 'var(--text-muted)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              fontWeight: activeTab === id ? 600 : 400,
              fontSize: '0.85rem', transition: 'var(--transition)',
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div>
                <div className="stat-label">Attendance Rate</div>
                <div className="stat-value">{attendanceRate}%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{presentCount} / {attendance.length} days</div>
              </div>
              <div className="stat-icon emerald"><CalendarCheck size={24} /></div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Outstanding Dues</div>
                <div className="stat-value" style={{ color: totalPending > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{totalPending.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fees.length} fee records</div>
              </div>
              <div className="stat-icon amber"><DollarSign size={24} /></div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Exams Graded</div>
                <div className="stat-value">{marks.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assessments</div>
              </div>
              <div className="stat-icon rose"><Award size={24} /></div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Pending Homework</div>
                <div className="stat-value">{homework.filter(h => new Date(h.dueDate) >= new Date()).length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due upcoming</div>
              </div>
              <div className="stat-icon indigo"><BookOpen size={24} /></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header"><h3 className="card-title">Student Profile</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  ['Name', getChildName(child)],
                  ['Admission No', getAdmissionNo(child)],
                  ['Class', child.className],
                  ['Section', child.section || 'N/A'],
                  ['Gender', child.gender || 'N/A'],
                  ['Date of Birth', child.dateOfBirth || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><CalendarCheck size={18} style={{ marginRight: 6 }} />Attendance Records</h3>
            <span className="badge badge-success">{attendanceRate}% Rate</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No attendance records yet.</td></tr>
                ) : (
                  attendance.slice().reverse().map(att => (
                    <tr key={att.id}>
                      <td><strong>{att.date}</strong></td>
                      <td>
                        <span className={`badge ${att.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                          {att.status === 'PRESENT' ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== FEES TAB ===== */}
      {activeTab === 'fees' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><DollarSign size={18} style={{ marginRight: 6 }} />Fee & Payment Status</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Type</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th></tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No fee records.</td></tr>
                ) : (
                  fees.map(fee => (
                    <tr key={fee.id}>
                      <td>{fee.feeType || fee.description || '—'}</td>
                      <td>₹{parseFloat(fee.totalAmount).toFixed(2)}</td>
                      <td style={{ color: 'var(--success)' }}>₹{parseFloat(fee.paidAmount).toFixed(2)}</td>
                      <td style={{ color: parseFloat(fee.pendingAmount) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        ₹{parseFloat(fee.pendingAmount).toFixed(2)}
                      </td>
                      <td><span className={`badge ${fee.status === 'PAID' ? 'badge-success' : fee.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{fee.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MARKS TAB ===== */}
      {activeTab === 'marks' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Award size={18} style={{ marginRight: 6 }} />Assessment Results</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Exam ID</th><th>Marks Obtained</th><th>Grade</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {marks.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No assessment results yet.</td></tr>
                ) : (
                  marks.map(m => (
                    <tr key={m.id}>
                      <td>Exam #{m.examId}</td>
                      <td><strong>{m.marksObtained}</strong></td>
                      <td><span className="badge badge-primary">{m.grade || '—'}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== HOMEWORK TAB ===== */}
      {activeTab === 'homework' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><BookOpen size={18} style={{ marginRight: 6 }} />Homework — {child.className}</h3>
          </div>
          <div className="card-body">
            {homework.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No homework assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {homework.map(hw => (
                  <div key={hw.id} style={{ padding: '1rem 1.25rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{hw.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: new Date(hw.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <Clock size={12} style={{ marginRight: 4 }} />Due: {hw.dueDate}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: 0 }}>{hw.description}</p>
                    {hw.section && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Section: {hw.section}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== HOLIDAYS TAB ===== */}
      {activeTab === 'holidays' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Palmtree size={18} style={{ marginRight: 6 }} />School Holidays</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Holiday</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No holidays scheduled.</td></tr>
                ) : (
                  holidays.map(h => (
                    <tr key={h.id}>
                      <td><strong>{h.date}</strong></td>
                      <td>{h.name}</td>
                      <td><span className={`badge ${h.holidayType === 'PUBLIC' ? 'badge-primary' : 'badge-warning'}`}>{h.holidayType}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{h.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== LEAVE TAB ===== */}
      {activeTab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
          {/* Submit Leave Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Send size={18} style={{ marginRight: 6 }} />Submit Leave Request</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmitLeave}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    required
                    placeholder="Describe the reason for leave..."
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submittingLeave} style={{ width: '100%' }}>
                  <Send size={16} /> {submittingLeave ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </form>
            </div>
          </div>

          {/* Leave History */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Clock size={18} style={{ marginRight: 6 }} />My Leave Requests</h3>
            </div>
            <div className="card-body">
              {leaveRequests.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No leave requests submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {leaveRequests.map(lr => (
                    <div key={lr.id} style={{ padding: '0.875rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{lr.startDate} {lr.endDate ? `→ ${lr.endDate}` : ''}</strong>
                        <span className={`badge ${getStatusBadge(lr.status)}`}>{lr.status}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>{lr.reason}</p>
                      {lr.reviewNote && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Note: {lr.reviewNote}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
