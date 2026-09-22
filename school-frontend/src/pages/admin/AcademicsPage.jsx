import React, { useState, useEffect } from 'react';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { BookOpen, Award, Calendar, Plus } from 'lucide-react';

export const AcademicsPage = () => {
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'subjects' | 'exams'
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [classModal, setClassModal] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', section: 'A' });

  const [subjectModal, setSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', classId: 1 });

  const [examModal, setExamModal] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examDate: '2026-10-15', classId: 1 });

  const { addToast } = useToast();

  useEffect(() => {
    loadAcademicData();
  }, []);

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes, eRes] = await Promise.allSettled([
        academicService.getAllClasses(),
        academicService.getAllSubjects(),
        academicService.getAllExams(),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value?.data) setClasses(cRes.value.data);
      if (sRes.status === 'fulfilled' && sRes.value?.data) setSubjects(sRes.value.data);
      if (eRes.status === 'fulfilled' && eRes.value?.data) setExams(eRes.value.data);
    } catch (err) {
      addToast('Failed to load academic data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await academicService.createClass(classForm);
      addToast('Class created successfully!', 'success');
      setClassModal(false);
      setClassForm({ name: '', section: 'A' });
      loadAcademicData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create class', 'error');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await academicService.createSubject(subjectForm);
      addToast('Subject created successfully!', 'success');
      setSubjectModal(false);
      setSubjectForm({ name: '', code: '', classId: classes[0]?.id || 1 });
      loadAcademicData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create subject', 'error');
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await academicService.createExam(examForm);
      addToast('Exam created successfully!', 'success');
      setExamModal(false);
      setExamForm({ name: '', examDate: '2026-10-15', classId: classes[0]?.id || 1 });
      loadAcademicData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to schedule exam', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Management</h1>
          <p className="page-subtitle">Configure classes, subjects curriculum, and examination schedules.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeTab === 'classes' && (
            <button onClick={() => setClassModal(true)} className="btn btn-primary">
              <Plus size={18} /> Add Class
            </button>
          )}
          {activeTab === 'subjects' && (
            <button
              onClick={() => {
                if (classes.length > 0) setSubjectForm((f) => ({ ...f, classId: classes[0].id }));
                setSubjectModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={18} /> Add Subject
            </button>
          )}
          {activeTab === 'exams' && (
            <button
              onClick={() => {
                if (classes.length > 0) setExamForm((f) => ({ ...f, classId: classes[0].id }));
                setExamModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={18} /> Schedule Exam
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('classes')}
          className={`btn btn-sm ${activeTab === 'classes' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <BookOpen size={16} /> Classes ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`btn btn-sm ${activeTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Award size={16} /> Subjects ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`btn btn-sm ${activeTab === 'exams' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Calendar size={16} /> Exams ({exams.length})
        </button>
      </div>

      {/* Classes View */}
      {activeTab === 'classes' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Class ID</th>
                <th>Class Name</th>
                <th>Section</th>
                <th>Total Associated Subjects</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Loading classes...' : 'No classes configured yet.'}
                  </td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id}>
                    <td><strong>#{c.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className="badge badge-primary">Section {c.section}</span></td>
                    <td>
                      {subjects.filter((s) => s.classId === c.id).length} subjects
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subjects View */}
      {activeTab === 'subjects' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Subject ID</th>
                <th>Subject Name</th>
                <th>Subject Code</th>
                <th>Assigned Class ID</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Loading subjects...' : 'No subjects created yet.'}
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.id}>
                    <td><strong>#{s.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="badge badge-secondary">{s.code}</span></td>
                    <td>Class #{s.classId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Exams View */}
      {activeTab === 'exams' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Exam ID</th>
                <th>Exam Title</th>
                <th>Exam Date</th>
                <th>Target Class ID</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Loading exams...' : 'No exams scheduled yet.'}
                  </td>
                </tr>
              ) : (
                exams.map((e) => (
                  <tr key={e.id}>
                    <td><strong>#{e.id}</strong></td>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.examDate}</td>
                    <td><span className="badge badge-primary">Class #{e.classId}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Class Modal */}
      <Modal
        isOpen={classModal}
        onClose={() => setClassModal(false)}
        title="Add New Academic Class"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setClassModal(false)}>Cancel</button>
            <button type="submit" form="classForm" className="btn btn-primary">Create Class</button>
          </>
        }
      >
        <form id="classForm" onSubmit={handleCreateClass}>
          <div className="form-group">
            <label className="form-label">Class Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Grade 10"
              required
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. A"
              required
              value={classForm.section}
              onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={subjectModal}
        onClose={() => setSubjectModal(false)}
        title="Add Subject to Class"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setSubjectModal(false)}>Cancel</button>
            <button type="submit" form="subForm" className="btn btn-primary">Create Subject</button>
          </>
        }
      >
        <form id="subForm" onSubmit={handleCreateSubject}>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Mathematics"
              required
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. MATH-101"
              required
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assign to Class</label>
            <select
              className="form-select"
              value={subjectForm.classId}
              onChange={(e) => setSubjectForm({ ...subjectForm, classId: parseInt(e.target.value) })}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Section {c.section}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Exam Modal */}
      <Modal
        isOpen={examModal}
        onClose={() => setExamModal(false)}
        title="Schedule New Examination"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setExamModal(false)}>Cancel</button>
            <button type="submit" form="examForm" className="btn btn-primary">Schedule Exam</button>
          </>
        }
      >
        <form id="examForm" onSubmit={handleCreateExam}>
          <div className="form-group">
            <label className="form-label">Exam Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Midterm Examination"
              required
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              required
              value={examForm.examDate}
              onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">For Class</label>
            <select
              className="form-select"
              value={examForm.classId}
              onChange={(e) => setExamForm({ ...examForm, classId: parseInt(e.target.value) })}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Section {c.section}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
