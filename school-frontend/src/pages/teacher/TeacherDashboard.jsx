import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { academicService } from '../../services/academicService';
import { homeworkService } from '../../services/homeworkService';
import { holidayService } from '../../services/holidayService';
import { leaveService } from '../../services/leaveService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  CalendarCheck,
  Award,
  Check,
  X,
  Send,
  Users,
  BookOpen,
  Calendar,
  Sun,
  FileText,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'marks' | 'homework' | 'holidays' | 'leave'
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: 'PRESENT' | 'ABSENT' }
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Marks State
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksMap, setMarksMap] = useState({});
  const [submittingMarks, setSubmittingMarks] = useState(false);

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

  // Holidays State
  const [holidays, setHolidays] = useState([]);

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState([]);

  const { addToast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stuRes, clsRes, subRes, exRes, hwRes, holRes, lvRes] = await Promise.allSettled([
        studentService.getAllStudents(),
        academicService.getAllClasses(),
        academicService.getAllSubjects(),
        academicService.getAllExams(),
        homeworkService.getAll(),
        holidayService.getAll(),
        leaveService.getAll(),
      ]);

      if (stuRes.status === 'fulfilled' && stuRes.value?.data) {
        const list = stuRes.value.data.map(s => {
          const names = (s.name || '').split(' ');
          return {
            ...s,
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            rollNumber: s.admissionNumber || ''
          };
        });
        setStudents(list);
        const initialAtt = {};
        const initialMarks = {};
        list.forEach((s) => {
          initialAtt[s.id] = 'PRESENT';
          initialMarks[s.id] = { marksObtained: '', maxMarks: 100 };
        });
        setAttendanceMap(initialAtt);
        setMarksMap(initialMarks);
      }

      if (clsRes.status === 'fulfilled' && clsRes.value?.data) setClasses(clsRes.value.data);
      if (subRes.status === 'fulfilled' && subRes.value?.data) {
        setSubjects(subRes.value.data);
        if (subRes.value.data.length > 0) setSelectedSubjectId(subRes.value.data[0].id);
      }
      if (exRes.status === 'fulfilled' && exRes.value?.data) {
        setExams(exRes.value.data);
        if (exRes.value.data.length > 0) setSelectedExamId(exRes.value.data[0].id);
      }
      if (hwRes.status === 'fulfilled' && hwRes.value?.data) setHomeworkList(hwRes.value.data);
      if (holRes.status === 'fulfilled' && holRes.value?.data) setHolidays(holRes.value.data);
      if (lvRes.status === 'fulfilled' && lvRes.value?.data) setLeaveRequests(lvRes.value.data);
    } catch (err) {
      addToast('Failed to load teacher portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Attendance handlers
  const toggleAttendanceStatus = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSubmitAttendance = async () => {
    try {
      setSubmittingAttendance(true);
      const promises = students.map((s) =>
        attendanceService.markAttendance({
          studentId: s.id,
          date: attendanceDate,
          status: attendanceMap[s.id] || 'PRESENT',
          remarks: 'Marked by instructor',
        })
      );
      await Promise.all(promises);
      addToast(`Attendance submitted successfully for ${attendanceDate}!`, 'success');
    } catch (err) {
      addToast('Failed to submit some or all attendance records', 'error');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Marks handlers
  const handleMarkChange = (studentId, field, val) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const handleSubmitMarks = async () => {
    if (!selectedExamId || !selectedSubjectId) {
      addToast('Please select both an exam and a subject', 'warning');
      return;
    }

    try {
      setSubmittingMarks(true);
      const entriesToSubmit = students
        .filter((s) => marksMap[s.id]?.marksObtained !== '')
        .map((s) =>
          academicService.submitMarks({
            studentId: s.id,
            examId: parseInt(selectedExamId),
            subjectId: parseInt(selectedSubjectId),
            marksObtained: parseFloat(marksMap[s.id].marksObtained),
            maxMarks: parseFloat(marksMap[s.id].maxMarks || 100),
          })
        );

      if (entriesToSubmit.length === 0) {
        addToast('No marks entered to submit', 'warning');
        return;
      }

      await Promise.all(entriesToSubmit);
      addToast(`Submitted marks for ${entriesToSubmit.length} students!`, 'success');
    } catch (err) {
      addToast('Failed to submit marks', 'error');
    } finally {
      setSubmittingMarks(false);
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

  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Delete this homework?')) return;
    try {
      await homeworkService.delete(id);
      addToast('Homework deleted', 'success');
      const res = await homeworkService.getAll();
      if (res.success && res.data) setHomeworkList(res.data);
    } catch (err) {
      addToast('Failed to delete homework', 'error');
    }
  };

  // Leave approval handlers
  const handleApproveLeave = async (id) => {
    try {
      await leaveService.approve(id, 'Approved by Teacher');
      addToast('Leave request approved', 'success');
      const res = await leaveService.getAll();
      if (res.success && res.data) setLeaveRequests(res.data);
    } catch (err) {
      addToast('Failed to approve leave', 'error');
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await leaveService.reject(id, 'Rejected by Teacher');
      addToast('Leave request rejected', 'warning');
      const res = await leaveService.getAll();
      if (res.success && res.data) setLeaveRequests(res.data);
    } catch (err) {
      addToast('Failed to reject leave', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Command Center</h1>
          <p className="page-subtitle">Mark daily classroom attendance, enter grades, post homework, and review student leaves.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`btn btn-sm ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <CalendarCheck size={16} /> Daily Attendance Sheet
        </button>
        <button
          onClick={() => setActiveTab('marks')}
          className={`btn btn-sm ${activeTab === 'marks' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Award size={16} /> Gradebook / Enter Marks
        </button>
        <button
          onClick={() => setActiveTab('homework')}
          className={`btn btn-sm ${activeTab === 'homework' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <BookOpen size={16} /> Homework ({homeworkList.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`btn btn-sm ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Sun size={16} /> Holidays Calendar
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`btn btn-sm ${activeTab === 'leave' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={16} /> Leave Requests ({leaveRequests.filter(r => r.status === 'PENDING').length} pending)
        </button>
      </div>

      {/* Tab 1: Attendance */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Date:</label>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="btn btn-secondary btn-sm"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('ABSENT')}
                className="btn btn-secondary btn-sm"
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={submittingAttendance || students.length === 0}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} /> {submittingAttendance ? 'Submitting...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Quick Toggle</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      {loading ? 'Loading class list...' : 'No students found.'}
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.rollNumber}</strong></td>
                      <td style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</td>
                      <td><span className="badge badge-primary">{s.className}</span></td>
                      <td>
                        <span className={`badge ${attendanceMap[s.id] === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                          {attendanceMap[s.id]}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => toggleAttendanceStatus(s.id)}
                          className={`btn btn-sm ${attendanceMap[s.id] === 'PRESENT' ? 'btn-danger' : 'btn-primary'}`}
                          style={{ minWidth: '90px' }}
                        >
                          {attendanceMap[s.id] === 'PRESENT' ? <><X size={14} /> Absent</> : <><Check size={14} /> Present</>}
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

      {/* Tab 2: Marks Entry */}
      {activeTab === 'marks' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Select Exam:</label>
                <select
                  className="form-select"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Select Subject:</label>
                <select
                  className="form-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSubmitMarks}
                disabled={submittingMarks || students.length === 0}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} /> {submittingMarks ? 'Saving...' : 'Submit Evaluation Marks'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Marks Obtained</th>
                  <th>Max Score</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      {loading ? 'Loading class list...' : 'No students found.'}
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.rollNumber}</strong></td>
                      <td style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</td>
                      <td><span className="badge badge-primary">{s.className}</span></td>
                      <td style={{ width: '160px' }}>
                        <input
                          type="number"
                          step="0.5"
                          className="form-input"
                          placeholder="e.g. 85"
                          value={marksMap[s.id]?.marksObtained || ''}
                          onChange={(e) => handleMarkChange(s.id, 'marksObtained', e.target.value)}
                        />
                      </td>
                      <td style={{ width: '140px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={marksMap[s.id]?.maxMarks || 100}
                          onChange={(e) => handleMarkChange(s.id, 'maxMarks', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Homework */}
      {activeTab === 'homework' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title"><BookOpen size={18} style={{ marginRight: 6 }} /> Homework Assignments</h3>
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
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No homework assigned yet.
                    </td>
                  </tr>
                ) : (
                  homeworkList.map((hw) => (
                    <tr key={hw.id}>
                      <td style={{ fontWeight: 600 }}>{hw.title}</td>
                      <td><span className="badge badge-primary">{hw.className} {hw.section || ''}</span></td>
                      <td style={{ maxWidth: '300px', fontSize: '0.9rem' }}>{hw.description}</td>
                      <td>
                        <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> {hw.dueDate}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHomework(hw.id)}>
                          <Trash2 size={13} />
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

      {/* Tab 4: Holidays */}
      {activeTab === 'holidays' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Sun size={18} style={{ marginRight: 6 }} /> Official School Holidays</h3>
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
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No holidays scheduled.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.date}</strong></td>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
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

      {/* Tab 5: Leave Requests */}
      {activeTab === 'leave' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FileText size={18} style={{ marginRight: 6 }} /> Student Absence Requests</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Date Period</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Review Note</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No student leave requests.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((r) => (
                    <tr key={r.id}>
                      <td><strong>Student #{r.studentId}</strong></td>
                      <td style={{ fontWeight: 600 }}>{r.startDate} to {r.endDate || r.startDate}</td>
                      <td style={{ maxWidth: '250px' }}>{r.reason}</td>
                      <td>
                        <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.reviewNote || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {r.status === 'PENDING' && (
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleApproveLeave(r.id)}>
                              Approve
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleRejectLeave(r.id)}>
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
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
            <button type="submit" form="teacherHwForm" className="btn btn-primary">Assign</button>
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
              placeholder="e.g. Chapter 5 Practice"
              value={hwForm.title}
              onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={hwForm.className}
                onChange={(e) => setHwForm({ ...hwForm, className: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-control"
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
              value={hwForm.description}
              onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
