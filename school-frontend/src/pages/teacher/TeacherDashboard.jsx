import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { academicService } from '../../services/academicService';
import { homeworkService } from '../../services/homeworkService';
import { holidayService } from '../../services/holidayService';
import { leaveService } from '../../services/leaveService';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useFeatureToggles } from '../../hooks/useFeatureToggles';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import {
  BookOpen,
  Calendar,
  Sun,
  FileText,
  Plus,
  Edit2,
  Bell,
  RefreshCw,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { CLASS_CONFIG, toDisplayClassName } from '../../utils/academicClassOrder';

export const TeacherDashboard = () => {
  // Tabs: 'homework' | 'leave' | 'holidays' | 'notifications'
  const [activeTab, setActiveTab] = useState('homework');
  const [loading, setLoading] = useState(true);

  // Homework State
  const [homeworkList, setHomeworkList] = useState([]);
  const [hwModal, setHwModal] = useState(false);
  const [hwForm, setHwForm] = useState({
    title: '',
    description: '',
    className: 'Class 10',
    section: 'A',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });
  const [hwEditModal, setHwEditModal] = useState(false);
  const [editingHw, setEditingHw] = useState(null);
  const [hwEditForm, setHwEditForm] = useState({
    title: '',
    description: '',
    className: '',
    section: '',
    dueDate: '',
  });

  // Holidays State
  const [holidays, setHolidays] = useState([]);

  // Leave Requests State (students in the teacher's class)
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveSearch, setLeaveSearch] = useState('');

  // My Leave State (the teacher's own leave)
  const [myLeaves, setMyLeaves] = useState([]);
  const [myLeaveModal, setMyLeaveModal] = useState(false);
  const [myLeaveForm, setMyLeaveForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    selectedReasonId: '',
    customReason: '',
  });
  const [submittingMyLeave, setSubmittingMyLeave] = useState(false);
  const [leaveReasons, setLeaveReasons] = useState([]);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const { addToast } = useToast();
  const { user } = useAuth();
  const { isEnabled, loading: togglesLoading } = useFeatureToggles('TEACHER');

  // If the current tab gets disabled (or the default 'homework' tab is disabled for this
  // teacher), fall back to the first module that's actually enabled.
  useEffect(() => {
    if (togglesLoading) return;
    if (isEnabled(activeTab.toUpperCase())) return;
    const fallback = ['homework', 'leave', 'holidays', 'notifications'].find((t) => isEnabled(t.toUpperCase()));
    if (fallback) setActiveTab(fallback);
  }, [togglesLoading, isEnabled, activeTab]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [hwRes, holRes, lvRes, myLvRes, reasonRes] = await Promise.allSettled([
        homeworkService.getAll(),
        holidayService.getAll(),
        leaveService.getTeacherLeaves(),
        leaveService.getMyTeacherLeave(),
        leaveService.getActiveReasons(),
      ]);

      if (hwRes.status === 'fulfilled' && hwRes.value?.data) setHomeworkList(hwRes.value.data);
      if (holRes.status === 'fulfilled' && holRes.value?.data) setHolidays(holRes.value.data);
      if (lvRes.status === 'fulfilled') {
        const lvData = lvRes.value?.data || (Array.isArray(lvRes.value) ? lvRes.value : []);
        setLeaveRequests(Array.isArray(lvData) ? lvData : []);
      }
      if (myLvRes.status === 'fulfilled') {
        const myLvData = myLvRes.value?.data || (Array.isArray(myLvRes.value) ? myLvRes.value : []);
        setMyLeaves(Array.isArray(myLvData) ? myLvData : []);
      }
      if (reasonRes.status === 'fulfilled' && reasonRes.value?.data) setLeaveReasons(reasonRes.value.data);
    } catch (err) {
      addToast('Failed to load teacher portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // My Leave handlers
  const handleSubmitMyLeave = async (e) => {
    e.preventDefault();
    let reasonText = '';
    if (myLeaveForm.selectedReasonId === 'OTHER') {
      if (!myLeaveForm.customReason.trim()) {
        addToast('Please enter a custom reason', 'warning');
        return;
      }
      reasonText = myLeaveForm.customReason.trim();
    } else if (myLeaveForm.selectedReasonId) {
      const found = leaveReasons.find((r) => String(r.id) === String(myLeaveForm.selectedReasonId));
      reasonText = found ? `${found.englishReason} / ${found.tamilMeaning}` : '';
    }
    if (!reasonText) {
      addToast('Please select or enter a reason', 'warning');
      return;
    }
    try {
      setSubmittingMyLeave(true);
      await leaveService.submitTeacherLeave({
        teacherName: user?.name || 'Teacher',
        leaveDate: myLeaveForm.startDate,
        endDate: myLeaveForm.endDate || null,
        reason: reasonText,
      });
      addToast('Leave recorded successfully', 'success');
      setMyLeaveModal(false);
      setMyLeaveForm({ startDate: new Date().toISOString().split('T')[0], endDate: '', selectedReasonId: '', customReason: '' });
      const res = await leaveService.getMyTeacherLeave();
      if (res.success && res.data) setMyLeaves(res.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record leave', 'error');
    } finally {
      setSubmittingMyLeave(false);
    }
  };

  // Homework handlers
  const handleCreateHomework = async (e) => {
    e.preventDefault();
    try {
      await homeworkService.create(hwForm);
      addToast('Homework assigned successfully!', 'success');
      setHwModal(false);
      setHwForm({
        title: '',
        description: '',
        className: 'Class 10',
        section: 'A',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      });
      const res = await homeworkService.getAll();
      if (res.success && res.data) setHomeworkList(res.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to assign homework', 'error');
    }
  };

  const openEditHomeworkModal = (hw) => {
    setEditingHw(hw);
    setHwEditForm({
      title: hw.title || '',
      description: hw.description || '',
      className: hw.className || '',
      section: hw.section || '',
      dueDate: hw.dueDate || '',
    });
    setHwEditModal(true);
  };

  const handleUpdateHomework = async (e) => {
    e.preventDefault();
    if (!editingHw) return;
    try {
      await homeworkService.update(editingHw.id, hwEditForm);
      addToast('Homework updated', 'success');
      setHwEditModal(false);
      setEditingHw(null);
      const res = await homeworkService.getAll();
      if (res.success && res.data) setHomeworkList(res.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update homework', 'error');
    }
  };



  // Notification handler
  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await notificationService.getMyNotifications();
      if (res.success && res.data) setNotifications(res.data);
    } catch (err) {
      addToast('Failed to load notifications', 'error');
    } finally {
      setLoadingNotifications(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Teacher Dashboard' }]} />

      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Teacher Command Center</h1>
          <p className="page-subtitle">
            Manage homework assignments, review student leave requests, check official holidays, and view announcements.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={loadInitialData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {isEnabled('HOMEWORK') && (
          <button
            onClick={() => setActiveTab('homework')}
            className={`btn btn-sm ${activeTab === 'homework' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BookOpen size={16} /> Homework ({homeworkList.length})
          </button>
        )}
        {isEnabled('LEAVE') && (
          <button
            onClick={() => setActiveTab('leave')}
            className={`btn btn-sm ${activeTab === 'leave' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText size={16} /> Leave Requests ({leaveRequests.length})
          </button>
        )}
        {isEnabled('HOLIDAYS') && (
          <button
            onClick={() => setActiveTab('holidays')}
            className={`btn btn-sm ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Sun size={16} /> Holidays Calendar ({holidays.length})
          </button>
        )}
        {isEnabled('NOTIFICATIONS') && (
          <button
            onClick={() => {
              setActiveTab('notifications');
              if (notifications.length === 0) loadNotifications();
            }}
            className={`btn btn-sm ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Bell size={16} /> Announcements
          </button>
        )}
      </div>

      {/* Tab 1: Homework */}
      {activeTab === 'homework' && isEnabled('HOMEWORK') && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <BookOpen size={18} className="text-primary" /> Active Homework Assignments
            </h3>
            <button className="btn btn-primary btn-sm" onClick={() => setHwModal(true)}>
              <Plus size={14} /> Assign Homework
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Class / Section</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {homeworkList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      {loading ? 'Loading homework assignments...' : 'No homework assigned yet. Click "+ Assign Homework" to create one.'}
                    </td>
                  </tr>
                ) : (
                  homeworkList.map((hw) => (
                    <tr key={hw.id}>
                      <td style={{ fontWeight: 600 }}>{hw.title}</td>
                      <td>
                        <span className="badge badge-primary">
                          {toDisplayClassName(hw.className)} {hw.section ? `(${hw.section})` : ''}
                        </span>
                      </td>
                      <td style={{ maxWidth: '340px', fontSize: '0.875rem' }}>{hw.description}</td>
                      <td>
                        <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> {hw.dueDate}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditHomeworkModal(hw)} title="Edit homework">
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Leave Requests */}
      {activeTab === 'leave' && isEnabled('LEAVE') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <UserCheck size={18} className="text-primary" /> My Leave
            </h3>
            <button className="btn btn-primary btn-sm" onClick={() => setMyLeaveModal(true)}>
              <Plus size={14} /> Request Leave
            </button>
          </div>
          <div className="table-container">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Submitted On</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      {loading ? 'Loading your leave records...' : 'No leave requested yet.'}
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((lv) => (
                    <tr key={lv.id}>
                      <td style={{ fontWeight: 600 }}>
                        {lv.leaveDate || lv.startDate}
                        {lv.endDate ? ` to ${lv.endDate}` : ''}
                      </td>
                      <td style={{ maxWidth: '320px', fontSize: '0.875rem' }}>{lv.reason}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {(lv.submittedAt || lv.createdAt)
                          ? new Date(lv.submittedAt || lv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">{lv.status || 'RECORDED'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <FileText size={18} className="text-primary" /> Leave Records
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-secondary" style={{ fontSize: '0.8125rem' }}>
                {leaveRequests.length} Class Records
              </span>
              <Link to="/teacher/leave" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <ExternalLink size={13} /> Full View
              </Link>
            </div>
          </div>
          <div className="table-container">
            <table className="table" style={{ width: '100%', minWidth: '780px' }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Record #</th>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class & Section</th>
                  <th>Leave Date</th>
                  <th>Reason</th>
                  <th>Submitted On</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      {loading ? 'Loading leave records...' : 'No student leave records for your assigned class.'}
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((r) => {
                    const recId = r.recordId || r.id;
                    const studentName = r.studentName || `Student #${r.studentId}`;
                    const admissionNo = r.admissionNumber || '—';
                    const classDisplay = r.className
                      ? `${toDisplayClassName(r.className)}${r.section ? ` (${r.section})` : ''}`
                      : '—';
                    const leaveDate = r.leaveDate || r.startDate || '—';
                    const submittedOn = r.submittedAt || r.createdAt
                      ? new Date(r.submittedAt || r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';

                    return (
                      <tr key={recId}>
                        <td><strong>#{recId}</strong></td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{studentName}</td>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>{admissionNo}</td>
                        <td><span className="badge badge-primary">{classDisplay}</span></td>
                        <td style={{ fontWeight: 600 }}>{leaveDate}</td>
                        <td style={{ maxWidth: '280px', fontSize: '0.875rem' }}>{r.reason || '—'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{submittedOn}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-primary">RECORDED</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Tab 3: Holidays */}
      {activeTab === 'holidays' && isEnabled('HOLIDAYS') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <Sun size={18} className="text-warning" /> Official School Holidays & Events
            </h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday Name</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      {loading ? 'Loading holidays...' : 'No holidays scheduled.'}
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.date}</strong></td>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td><span className={`badge ${h.holidayType === 'PUBLIC' ? 'badge-primary' : 'badge-warning'}`}>{h.holidayType}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{h.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && isEnabled('NOTIFICATIONS') && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <Bell size={18} className="text-primary" /> School Broadcasts & Announcements
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={loadNotifications} disabled={loadingNotifications}>
              <RefreshCw size={13} className={loadingNotifications ? 'animate-spin' : ''} />
              <span>{loadingNotifications ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Audience</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {loadingNotifications ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      Loading announcements...
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      No announcements broadcasted.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id}>
                      <td><strong>{n.date}</strong></td>
                      <td>
                        <span className={`badge ${n.audience === 'BOTH' ? 'badge-success' : 'badge-warning'}`}>
                          {n.audience === 'TEACHERS' ? 'Teachers' : n.audience === 'BOTH' ? 'All Users' : n.audience}
                        </span>
                      </td>
                      <td style={{ maxWidth: '460px', fontSize: '0.875rem', whiteSpace: 'pre-line' }}>{n.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Homework Modal */}
      <Modal
        isOpen={hwModal}
        onClose={() => setHwModal(false)}
        title="Assign Homework"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setHwModal(false)}>Cancel</button>
            <button type="submit" form="teacherHwForm" className="btn btn-primary">Assign Homework</button>
          </>
        }
      >
        <form id="teacherHwForm" onSubmit={handleCreateHomework}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Homework Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Chapter 5 Practice Questions"
              value={hwForm.title}
              onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name *</label>
              <select
                className="form-control"
                required
                value={hwForm.className}
                onChange={(e) => setHwForm({ ...hwForm, className: e.target.value })}
              >
                <option value="" disabled>Select Class</option>
                {CLASS_CONFIG.map((c) => (
                  <option key={c.internalValue} value={c.internalValue}>{c.displayLabel}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A"
                value={hwForm.section}
                onChange={(e) => setHwForm({ ...hwForm, section: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={hwForm.dueDate}
              onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Instructions *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="Provide instructions for students..."
              value={hwForm.description}
              onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Homework Modal */}
      <Modal
        isOpen={hwEditModal}
        onClose={() => setHwEditModal(false)}
        title="Edit Homework"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setHwEditModal(false)}>Cancel</button>
            <button type="submit" form="teacherHwEditForm" className="btn btn-primary">Save Changes</button>
          </>
        }
      >
        <form id="teacherHwEditForm" onSubmit={handleUpdateHomework}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Homework Title *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Chapter 5 Practice Questions"
              value={hwEditForm.title}
              onChange={(e) => setHwEditForm({ ...hwEditForm, title: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name *</label>
              <select
                className="form-control"
                required
                value={hwEditForm.className}
                onChange={(e) => setHwEditForm({ ...hwEditForm, className: e.target.value })}
              >
                <option value="" disabled>Select Class</option>
                {CLASS_CONFIG.map((c) => (
                  <option key={c.internalValue} value={c.internalValue}>{c.displayLabel}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A"
                value={hwEditForm.section}
                onChange={(e) => setHwEditForm({ ...hwEditForm, section: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={hwEditForm.dueDate}
              onChange={(e) => setHwEditForm({ ...hwEditForm, dueDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Instructions *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="Provide instructions for students..."
              value={hwEditForm.description}
              onChange={(e) => setHwEditForm({ ...hwEditForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* My Leave Modal */}
      <Modal
        isOpen={myLeaveModal}
        onClose={() => setMyLeaveModal(false)}
        title="Request Leave"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setMyLeaveModal(false)}>Cancel</button>
            <button type="submit" form="myLeaveForm" className="btn btn-primary" disabled={submittingMyLeave}>
              {submittingMyLeave ? 'Submitting...' : 'Submit Leave'}
            </button>
          </>
        }
      >
        <form id="myLeaveForm" onSubmit={handleSubmitMyLeave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">From *</label>
              <input
                type="date"
                className="form-control"
                required
                value={myLeaveForm.startDate}
                onChange={(e) => setMyLeaveForm({ ...myLeaveForm, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To (optional)</label>
              <input
                type="date"
                className="form-control"
                min={myLeaveForm.startDate}
                value={myLeaveForm.endDate}
                onChange={(e) => setMyLeaveForm({ ...myLeaveForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: myLeaveForm.selectedReasonId === 'OTHER' ? '1rem' : 0 }}>
            <label className="form-label">Reason *</label>
            <select
              className="form-control"
              required
              value={myLeaveForm.selectedReasonId}
              onChange={(e) => setMyLeaveForm({ ...myLeaveForm, selectedReasonId: e.target.value })}
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

          {myLeaveForm.selectedReasonId === 'OTHER' && (
            <div className="form-group">
              <label className="form-label">Enter your reason *</label>
              <textarea
                className="form-control"
                rows={3}
                required
                placeholder="Enter your reason"
                value={myLeaveForm.customReason}
                onChange={(e) => setMyLeaveForm({ ...myLeaveForm, customReason: e.target.value })}
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
