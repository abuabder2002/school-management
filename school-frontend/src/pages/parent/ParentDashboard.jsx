import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeService';
import { academicService } from '../../services/academicService';
import { leaveService } from '../../services/leaveService';
import { notificationService } from '../../services/notificationService';
import { homeworkService } from '../../services/homeworkService';
import { useFeatureToggles } from '../../hooks/useFeatureToggles';
import {
  User,
  DollarSign,
  Award,
  FileText,
  Bell,
  CheckCircle2,
  AlertCircle,
  UserX,
  Send,
  Calendar,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'marks', label: 'Marks', icon: Award },
  { id: 'leave', label: 'Leave', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

// A due date is the one thing a parent scans for first — show how urgent it is, not just what it is.
const getUrgency = (dueDate) => {
  if (!dueDate) return { label: 'No due date', tone: 'secondary' };
  const today = new Date(new Date().toDateString());
  const due = new Date(dueDate);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, tone: 'danger' };
  if (days === 0) return { label: 'Due today', tone: 'warning' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'warning' };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'primary' };
  return { label: `Due in ${days}d`, tone: 'secondary' };
};

export const ParentDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isEnabled, loading: togglesLoading } = useFeatureToggles('PARENT');

  const [activeTab, setActiveTab] = useState('overview');
  const [child, setChild] = useState(null);
  const [fees, setFees] = useState([]);
  const [marks, setMarks] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveReasons, setLeaveReasons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({ startDate: '', selectedReasonId: '', customReason: '' });
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

  // 'overview' is always available (it's the home tab); fall back to it if the
  // current tab gets disabled by the admin.
  useEffect(() => {
    if (togglesLoading || activeTab === 'overview') return;
    if (!isEnabled(activeTab.toUpperCase())) setActiveTab('overview');
  }, [togglesLoading, isEnabled, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      let studentRecord = null;
      try {
        const stuRes = await studentService.getStudentById(studentId);
        if (stuRes.success && stuRes.data) {
          studentRecord = stuRes.data;
          setChild(stuRes.data);
        }
      } catch (e) {
        console.error('Student load failed', e);
      }

      const [feeRes, mrkRes, lvRes, notifRes, hwRes] = await Promise.allSettled([
        feeService.getFeesByStudent(studentId),
        academicService.getMarksByStudent(studentId),
        leaveService.getMyLeave(),
        notificationService.getMyNotifications(studentRecord?.className),
        studentRecord?.className ? homeworkService.getByClass(studentRecord.className) : Promise.resolve(null),
      ]);

      if (feeRes.status === 'fulfilled' && feeRes.value?.data) setFees(feeRes.value.data);
      if (mrkRes.status === 'fulfilled' && mrkRes.value?.data) setMarks(mrkRes.value.data);
      if (lvRes.status === 'fulfilled' && lvRes.value?.data) setLeaveRequests(lvRes.value.data || []);
      if (notifRes.status === 'fulfilled' && notifRes.value?.data) setNotifications(notifRes.value.data || []);
      if (hwRes.status === 'fulfilled' && hwRes.value?.data) {
        // Section-specific homework only reaches that section; class-wide homework (no section set) reaches everyone.
        const mySection = (studentRecord?.section || '').trim().toLowerCase();
        const relevant = hwRes.value.data.filter((h) => !h.section || h.section.trim().toLowerCase() === mySection);
        relevant.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
        setHomework(relevant);
      }

      // Load active predefined leave reasons
      try {
        const reasonRes = await leaveService.getActiveReasons();
        if (reasonRes.success && reasonRes.data) setLeaveReasons(reasonRes.data);
      } catch (e) {
        console.error('Failed to load leave reasons', e);
      }
    } catch (err) {
      console.error('Failed to load parent overview', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate) {
      addToast('Start date is required', 'warning');
      return;
    }
    // Determine final reason text
    let reasonText = '';
    if (leaveForm.selectedReasonId === 'OTHER') {
      if (!leaveForm.customReason.trim()) {
        addToast('Please enter a custom reason', 'warning');
        return;
      }
      reasonText = leaveForm.customReason.trim();
    } else if (leaveForm.selectedReasonId) {
      const found = leaveReasons.find((r) => String(r.id) === String(leaveForm.selectedReasonId));
      reasonText = found ? `${found.englishReason} / ${found.tamilMeaning}` : '';
    }
    if (!reasonText) {
      addToast('Please select or enter a reason', 'warning');
      return;
    }

    setSubmittingLeave(true);
    try {
      const payload = {
        startDate: leaveForm.startDate,
        leaveDate: leaveForm.startDate,
        reason: reasonText,
      };
      const res = await leaveService.submit(payload);
      if (res.success) {
        addToast('Leave recorded successfully.', 'success');
        setLeaveForm({ startDate: '', selectedReasonId: '', customReason: '' });
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

  // Computations
  const totalBilled = fees.reduce((acc, f) => acc + parseFloat(f.totalAmount || 0), 0);
  const totalPaid = fees.reduce((acc, f) => acc + parseFloat(f.paidAmount || 0), 0);
  const totalPending = fees.reduce((acc, f) => acc + parseFloat(f.pendingAmount || 0), 0);

  // Absent entries (grade "AB") are stored with 0 marks; they must not pull the average down
  const gradedMarks = marks.filter((m) => m.grade !== 'AB' && m.marksObtained !== null && m.marksObtained !== undefined && !isNaN(m.marksObtained));
  const examsEvaluated = new Set(gradedMarks.map((m) => m.examName || m.examId)).size;
  const avgScore = gradedMarks.length > 0
    ? (gradedMarks.reduce((acc, m) => acc + (Number(m.marksObtained) / (Number(m.maxMarks) || 100)) * 100, 0) / gradedMarks.length).toFixed(1)
    : '—';

  const overdueHomeworkCount = useMemo(
    () => homework.filter((h) => h.dueDate && new Date(h.dueDate) < new Date(new Date().toDateString())).length,
    [homework]
  );

  const getChildName = (c) => c?.name || `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || 'Student';
  const getAdmissionNo = (c) => c?.admissionNumber || c?.rollNumber || 'N/A';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading parent portal...
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
          <h3>No Student Linked</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            No student record is linked to your parent account (ID #{parentId}).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Please contact the school administrator to verify your student enrollment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Parent Portal</h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Viewing: <strong style={{ color: 'var(--text-main)' }}>{getChildName(child)}</strong> &nbsp;|&nbsp; Admission #{getAdmissionNo(child)} &nbsp;|&nbsp; {child.className} {child.section ? `(${child.section})` : ''}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
        {TABS.filter(({ id }) => id === 'overview' || isEnabled(id.toUpperCase())).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === id ? 'var(--primary)' : 'transparent',
              color: activeTab === id ? '#ffffff' : 'var(--text-muted)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              fontWeight: activeTab === id ? 600 : 500,
              fontSize: '0.85rem',
              transition: 'var(--transition)',
            }}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top 2-Card Summary: Academic & Fee */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {/* Academic Summary Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
                  <Award size={16} color="var(--primary)" />
                  Academic Summary
                </h3>
                <span className="badge badge-primary">{gradedMarks.length} Graded</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Average Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                      {avgScore !== '—' ? `${avgScore}%` : '—'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Exams Evaluated</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {examsEvaluated}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Class: {child.className} {child.section ? `• Section ${child.section}` : ''}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('marks')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem' }}
                  >
                    View Details <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Fee Summary Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
                  <DollarSign size={16} color="var(--success)" />
                  Fee Summary
                </h3>
                <span className={`badge ${totalPending > 0 ? 'badge-warning' : 'badge-success'}`}>
                  {totalPending > 0 ? 'Dues Pending' : 'Paid in Full'}
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Amount Paid</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                      ₹{totalPaid.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Balance Due</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: totalPending > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                      ₹{totalPending.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Total Invoiced: ₹{totalBilled.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fees')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem' }}
                  >
                    View Invoices <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Student Profile Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Student Profile</h3>
              <span className={`badge ${child.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                {child.isActive !== false ? 'ACTIVE STUDENT' : 'INACTIVE'}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                {[
                  ['Student Name', getChildName(child)],
                  ['Admission Number', getAdmissionNo(child)],
                  ['Class & Section', `${child.className || '—'} ${child.section ? `(${child.section})` : ''}`],
                  ['Date of Birth', child.dateOfBirth || '—'],
                  ['Gender', child.gender || '—'],
                  ['Blood Group', child.bloodGroup || '—'],
                  ['Father Name', child.fatherName || '—'],
                  ['Mother Name', child.motherName || '—'],
                  ['Parent Mobile', child.contactNumber || child.phoneNumber || child.fatherMobileNumber || '—'],
                  ['Joining Date', child.joiningDate || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Homework */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
                <BookOpen size={16} color="var(--primary)" />
                Upcoming Homework
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('homework')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
              >
                View All
              </button>
            </div>
            <div className="card-body">
              {homework.length === 0 ? (
                <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No homework assigned right now.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {homework.slice(0, 3).map((h) => {
                    const urgency = getUrgency(h.dueDate);
                    return (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{h.title}</span>
                        <span className={`badge badge-${urgency.tone}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{urgency.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Marks & Recent Notifications Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Recent Marks Table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Recent Marks</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('marks')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  All Marks
                </button>
              </div>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          No marks published yet.
                        </td>
                      </tr>
                    ) : (
                      marks.slice(0, 4).map((m, idx) => (
                        <tr key={m.id || idx}>
                          <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{m.examName}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{m.subjectName}</td>
                          <td style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                            {m.marksObtained !== null ? `${m.marksObtained} / ${m.maxMarks || 100}` : '—'}
                          </td>
                          <td>
                            <span className="badge badge-primary">{m.grade || '—'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Recent Announcements</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  All Notices
                </button>
              </div>
              <div style={{ padding: '0.75rem 1.25rem' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No announcements available.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {notifications.slice(0, 3).map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '0.55rem 0',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2px' }}>
                          <Calendar size={11} /> {formatDate(n.date)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: HOMEWORK */}
      {/* ========================================================================= */}
      {activeTab === 'homework' && isEnabled('HOMEWORK') && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Homework</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Assignments for {child.className}{child.section ? ` (${child.section})` : ''}, soonest due date first
              </p>
            </div>
            {overdueHomeworkCount > 0 && (
              <span className="badge badge-danger">{overdueHomeworkCount} overdue</span>
            )}
          </div>
          <div className="card-body">
            {homework.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                <BookOpen size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                No homework assigned yet — check back after class.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {homework.map((h) => {
                  const urgency = getUrgency(h.dueDate);
                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `3px solid var(--${urgency.tone === 'secondary' ? 'text-muted' : urgency.tone})`,
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{h.title}</span>
                        <span className={`badge badge-${urgency.tone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          <Calendar size={11} /> {urgency.label}
                        </span>
                      </div>
                      {h.description && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {h.description}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Due {formatDate(h.dueDate)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FEES */}
      {/* ========================================================================= */}
      {activeTab === 'fees' && isEnabled('FEES') && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Fee Records & Invoices</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Academic invoices, installments paid, and balance due
              </p>
            </div>
            <span className={`badge ${totalPending > 0 ? 'badge-warning' : 'badge-success'}`}>
              Outstanding: ₹{totalPending.toLocaleString()}
            </span>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Fee Description</th>
                  <th>Total Billed</th>
                  <th>Paid Amount</th>
                  <th>Outstanding</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                      <DollarSign size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                      No billing records found for this student.
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.id}>
                      <td style={{ fontWeight: 600 }}>{fee.academicYear || '2026-2027'}</td>
                      <td>{fee.remarks || fee.feeCategory || 'Tuition & Academic Term Fee'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(fee.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{Number(fee.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ color: Number(fee.pendingAmount || 0) > 0 ? 'var(--danger)' : 'var(--text-main)', fontWeight: 700 }}>
                        ₹{Number(fee.pendingAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {formatDate(fee.dueDate)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${Number(fee.pendingAmount || 0) === 0 ? 'badge-success' : Number(fee.paidAmount || 0) > 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {Number(fee.pendingAmount || 0) === 0 ? 'PAID' : Number(fee.paidAmount || 0) > 0 ? 'PARTIAL' : 'PENDING'}
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

      {/* ========================================================================= */}
      {/* TAB 3: MARKS */}
      {/* ========================================================================= */}
      {activeTab === 'marks' && isEnabled('MARKS') && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Academic Examination Results</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Subject-wise examination marks and performance evaluation
              </p>
            </div>
            <span className="badge badge-primary">
              Average Score: {avgScore !== '—' ? `${avgScore}%` : '—'}
            </span>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Examination</th>
                  <th>Subject</th>
                  <th>Marks Obtained</th>
                  <th>Maximum Marks</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Teacher Remarks</th>
                </tr>
              </thead>
              <tbody>
                {marks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                      <Award size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                      No examination marks published yet.
                    </td>
                  </tr>
                ) : (
                  marks.map((m, idx) => {
                    const pct = m.marksObtained !== null && m.maxMarks
                      ? `${Math.round((Number(m.marksObtained) / Number(m.maxMarks)) * 100)}%`
                      : '—';
                    return (
                      <tr key={m.id || idx}>
                        <td style={{ fontWeight: 600 }}>{m.examName}</td>
                        <td>{m.subjectName}</td>
                        <td style={{ fontWeight: 700, fontSize: '0.925rem' }}>
                          {m.marksObtained !== null ? m.marksObtained : '—'}
                        </td>
                        <td>{m.maxMarks || 100}</td>
                        <td style={{ fontWeight: 600 }}>{pct}</td>
                        <td>
                          <span className={`badge ${['A+', 'A'].includes(m.grade) ? 'badge-success' : ['B+', 'B'].includes(m.grade) ? 'badge-primary' : m.grade === 'F' ? 'badge-danger' : 'badge-warning'}`}>
                            {m.grade || '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{m.remarks || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && isEnabled('LEAVE') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Submit Leave Request Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Send size={15} color="var(--primary)" />
                Submit Leave Notice
              </h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmitLeave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Leave Date *
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={leaveForm.startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Reason *
                    </label>
                    <select
                      className="form-select"
                      value={leaveForm.selectedReasonId}
                      onChange={(e) => setLeaveForm({ ...leaveForm, selectedReasonId: e.target.value })}
                      required
                    >
                      <option value="">Select Reason</option>
                      {leaveReasons.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.englishReason} / {r.tamilMeaning}
                        </option>
                      ))}
                      <option value="OTHER">Other / மற்றவை</option>
                    </select>
                  </div>
                </div>

                {leaveForm.selectedReasonId === 'OTHER' && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">
                      Enter your reason *
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Enter your reason"
                      value={leaveForm.customReason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, customReason: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingLeave}
                  >
                    <Send size={14} />
                    <span>{submittingLeave ? 'Submitting Leave...' : 'Submit Leave Request'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Submitted Leave History Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">MY LEAVE RECORDS</h3>
              <span className="badge badge-secondary">{leaveRequests.length} Records</span>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Record #</th>
                    <th>Leave Date</th>
                    <th>Reason</th>
                    <th>Submitted On</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                        No leave records submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id}>
                        <td><strong>#{req.id}</strong></td>
                        <td style={{ fontWeight: 600 }}>{req.startDate}</td>
                        <td style={{ maxWidth: '360px' }}>{req.reason || '—'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {formatDate(req.createdAt)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-primary">
                            RECORDED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && isEnabled('NOTIFICATIONS') && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">School Announcements & Notices</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Official broadcasts and communications from school administration
              </p>
            </div>
            <span className="badge badge-secondary">{notifications.length} Announcements</span>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
                <Bell size={32} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                No announcements published yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span className="badge badge-primary">School Notice</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={11} /> {formatDate(n.date)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
