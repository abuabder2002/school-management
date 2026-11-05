import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { leaveService } from '../../services/leaveService';
import { feeService } from '../../services/feeService';
import { authService } from '../../services/authService';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  CalendarCheck,
  DollarSign,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Award,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Cake,
  GraduationCap,
  ShieldCheck,
  Trash2,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { to: '/admin/students', label: 'Add Student', icon: Users, color: 'var(--primary)' },
  { to: '/admin/marks', label: 'Enter Marks', icon: Award, color: 'var(--primary)' },
  { to: '/admin/fees', label: 'Create Billing', icon: DollarSign, color: 'var(--success)' },
  { to: '/admin/homework', label: 'Create Homework', icon: ClipboardList, color: 'var(--primary)' },
  { to: '/admin/leave', label: 'Manage Leave', icon: FileText, color: 'var(--warning)' },
  { to: '/admin/import-export', label: 'Import Data', icon: FileSpreadsheet, color: 'var(--primary)' },
];

// Days until this person's next birthday (0 = today), or null if no DOB on record.
const daysUntilNextBirthday = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  return Math.round((next - today) / 86400000);
};

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    studentsCount: 0,
    pendingLeaves: 0,
  });
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [feeSummary, setFeeSummary] = useState({ totalBilled: 0, totalPaid: 0, totalOutstanding: 0 });
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [allBirthdayPeople, setAllBirthdayPeople] = useState([]);
  const [showAllBirthdays, setShowAllBirthdays] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearingData, setClearingData] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!quickActionsOpen) return;
    const handleClickOutside = (e) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [quickActionsOpen]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, leavesRes, teacherLeavesRes, examsRes, feesRes, birthdayStudentsRes, staffRes] = await Promise.allSettled([
        studentService.getAllStudents({ page: 1, pageSize: 1 }),
        leaveService.getAll(),
        leaveService.getAllTeacherLeave(),
        academicService.getAllExams(),
        feeService.getClassBillingSummary(),
        studentService.getAllStudents({ page: 1, pageSize: 10000, status: 'Active' }),
        authService.getStaffAccounts(),
      ]);

      // Extract Students
      let studentsList = [];
      let totalStudentsCount = 0;
      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        const val = studentsRes.value;
        if (val.success && val.data) {
          studentsList = val.data.data || (Array.isArray(val.data) ? val.data : []);
          totalStudentsCount = val.data.pagination?.total || studentsList.length;
        } else if (val.data) {
          studentsList = Array.isArray(val.data) ? val.data : (val.data.data || []);
          totalStudentsCount = val.data.pagination?.total || studentsList.length;
        }
      }

      // Extract Leaves (student leave, submitted by parents)
      let leavesList = [];
      if (leavesRes.status === 'fulfilled' && leavesRes.value) {
        const val = leavesRes.value;
        leavesList = Array.isArray(val) ? val : (val.data || []);
      }

      // Extract Teacher Leaves
      let teacherLeavesList = [];
      if (teacherLeavesRes.status === 'fulfilled' && teacherLeavesRes.value) {
        const val = teacherLeavesRes.value;
        teacherLeavesList = Array.isArray(val) ? val : (val.data || []);
      }

      // Extract Exams
      let examsList = [];
      if (examsRes.status === 'fulfilled' && examsRes.value) {
        const val = examsRes.value;
        examsList = Array.isArray(val) ? val : (val.data || []);
      }

      // Extract Fees
      let billed = 0;
      let paid = 0;
      let outstanding = 0;
      if (feesRes.status === 'fulfilled' && feesRes.value) {
        const fData = Array.isArray(feesRes.value) ? feesRes.value : (feesRes.value.data || []);
        fData.forEach((row) => {
          billed += Number(row.totalAmount || 0);
          paid += Number(row.totalPaidAmount || 0);
          outstanding += Number(row.totalOutstandingAmount || 0);
        });
      }

      // Upcoming Birthdays: students + all staff (teachers and admins), soonest first.
      let birthdayStudentsList = [];
      if (birthdayStudentsRes.status === 'fulfilled' && birthdayStudentsRes.value) {
        const val = birthdayStudentsRes.value;
        birthdayStudentsList = val.data?.data || (Array.isArray(val.data) ? val.data : []);
      }
      let staffList = [];
      if (staffRes.status === 'fulfilled' && staffRes.value) {
        const val = staffRes.value;
        staffList = val.success && val.data ? val.data : [];
      }
      const allBirthdays = [
        ...birthdayStudentsList.map((s) => ({ name: s.name, kind: 'student', dob: s.dateOfBirth, meta: s.className ? `${s.className}${s.section ? ` (${s.section})` : ''}` : '' })),
        ...staffList.map((s) => ({ name: s.name, kind: s.role === 'ADMIN' ? 'admin' : 'teacher', dob: s.dateOfBirth, meta: s.role === 'ADMIN' ? 'Administrator' : 'Teacher' })),
      ]
        .map((p) => ({ ...p, daysUntil: daysUntilNextBirthday(p.dob) }))
        .filter((p) => p.daysUntil !== null)
        .sort((a, b) => a.daysUntil - b.daysUntil || (a.name || '').localeCompare(b.name || ''));
      const birthdayPeople = allBirthdays.filter((p) => p.daysUntil <= 1);

      setStats({
        studentsCount: totalStudentsCount || studentsList.length,
        pendingLeaves: leavesList.length + teacherLeavesList.length,
      });

      // Only exams that haven't happened yet, soonest first (not just the first four rows).
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const upcoming = examsList
        .filter((e) => e.examDate && String(e.examDate).slice(0, 10) >= todayStr)
        .sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)));
      setUpcomingExams(upcoming.slice(0, 4));
      setFeeSummary({ totalBilled: billed, totalPaid: paid, totalOutstanding: outstanding });
      setUpcomingBirthdays(birthdayPeople);
      setAllBirthdayPeople(allBirthdays);
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  // Permanently deletes every student record in the school. No undo.
  const handleClearAllData = async () => {
    if (stats.studentsCount === 0) {
      addToast('There are no students to clear.', 'info');
      return;
    }
    const firstConfirm = window.confirm(
      `Are you sure you want to clear ALL student data? This will permanently delete all ${stats.studentsCount} student records across every class.`
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `This cannot be undone. ${stats.studentsCount} student records will be permanently removed right now. Click OK to proceed.`
    );
    if (!secondConfirm) return;

    try {
      setClearingData(true);
      const res = await studentService.clearAllStudents();
      const deletedCount = res?.data?.deletedCount ?? stats.studentsCount;
      addToast(`Cleared ${deletedCount} student record(s).`, 'success');
      await loadDashboardData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to clear student data', 'error');
    } finally {
      setClearingData(false);
    }
  };

  const adminName = user?.name || user?.username || 'Admin';

  return (
    <div>
      {/* Top Section: Welcome / School Overview */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {getGreeting()}, {adminName}
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>
            Here's what's happening across your school today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClearAllData}
            disabled={clearingData}
            className="btn btn-danger btn-sm"
            title="Permanently delete every student record"
          >
            <Trash2 size={13} />
            <span>{clearingData ? 'Clearing...' : 'Clear Data'}</span>
          </button>
        </div>
      </div>

      {/* Compact Metric Cards (Clean, uniform, enterprise design) */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Students</div>
            <div className="stat-value">{loading ? '—' : stats.studentsCount}</div>
            <div className="stat-subtext">Total active enrolled students</div>
          </div>
          <div className="stat-icon indigo">
            <Users size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Leave Records</div>
            <div className="stat-value">{loading ? '—' : stats.pendingLeaves}</div>
            <div className="stat-subtext">Recorded parent leaves</div>
          </div>
          <div className="stat-icon rose">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Quick Actions Menu */}
      <div style={{ marginBottom: '1.75rem', position: 'relative' }} ref={quickActionsRef}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setQuickActionsOpen((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LayoutGrid size={16} />
          <span>Quick Actions</span>
          <ChevronDown size={14} style={{ transform: quickActionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {quickActionsOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              zIndex: 20,
              minWidth: '220px',
              background: '#ffffff',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: 'var(--radius-md, 6px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  onClick={() => setQuickActionsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.7rem 1rem',
                    textDecoration: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-main, #f8fafc)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} color={action.color} />
                  {action.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Upcoming / Important */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Upcoming Examinations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
              <Calendar size={16} color="var(--primary)" />
              Upcoming Examinations
            </h3>
            <Link to="/admin/marks" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Manage
            </Link>
          </div>
          <div style={{ padding: '0.75rem 1.25rem' }}>
            {upcomingExams.length === 0 ? (
              <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No upcoming exams scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {exam.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={11} />
                        {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'}
                      </div>
                    </div>
                    <span className="badge badge-primary">
                      {exam.totalMarks || 100} Marks
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Fees & Financial Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
              <DollarSign size={16} color="var(--success)" />
              Financial Collection Overview
            </h3>
            <Link to="/admin/fees" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Billing
            </Link>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ padding: '0.65rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500 }}>Collected</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                  ₹{feeSummary.totalPaid.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500 }}>Outstanding</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: feeSummary.totalOutstanding > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                  ₹{feeSummary.totalOutstanding.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Invoiced</span>
              <strong>₹{feeSummary.totalBilled.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem' }}>
              <Cake size={16} color="var(--warning)" />
              Upcoming Birthdays
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Today & Tomorrow</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setShowAllBirthdays(true)}
              >
                View All
              </button>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.25rem' }}>
            {upcomingBirthdays.length === 0 ? (
              <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No birthdays today or tomorrow.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcomingBirthdays.map((p, idx) => (
                  <BirthdayRow key={`${p.kind}-${p.name}-${idx}`} person={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAllBirthdays}
        onClose={() => setShowAllBirthdays(false)}
        title="All Upcoming Birthdays"
        icon={Cake}
        maxWidth="520px"
      >
        {allBirthdayPeople.length === 0 ? (
          <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No student or staff birthdays on record.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
            {allBirthdayPeople.map((p, idx) => (
              <BirthdayRow key={`${p.kind}-${p.name}-${idx}`} person={p} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

// One row in the Upcoming Birthdays widget and its "View All" modal.
const BirthdayRow = ({ person: p }) => {
  const kindLabel = p.kind === 'admin' ? 'Administrator' : p.kind === 'teacher' ? 'Teacher' : 'Student';
  const Icon = p.kind === 'admin' ? ShieldCheck : p.kind === 'teacher' ? GraduationCap : Users;
  const when = p.daysUntil === 0 ? 'Today' : p.daysUntil === 1 ? 'Tomorrow' : `In ${p.daysUntil} days`;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon size={13} color={p.kind === 'student' ? 'var(--text-muted)' : 'var(--primary)'} />
          {p.name}
          <span className={`badge ${p.kind === 'student' ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
            {kindLabel}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {p.meta}
        </div>
      </div>
      <span className={`badge ${p.daysUntil === 0 ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
        {when}
      </span>
    </div>
  );
};
