import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import {
  Users,
  BookOpen,
  CalendarCheck,
  DollarSign,
  ArrowRight,
  ClipboardList,
  Sun,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    subjectsCount: 0,
    pendingLeaves: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes, subjectsRes, leavesRes] = await Promise.allSettled([
        studentService.getAllStudents(),
        academicService.getAllClasses(),
        academicService.getAllSubjects(),
        leaveService.getAll(),
      ]);

      const students = studentsRes.status === 'fulfilled' && studentsRes.value?.data ? studentsRes.value.data : [];
      const classes = classesRes.status === 'fulfilled' && classesRes.value?.data ? classesRes.value.data : [];
      const subjects = subjectsRes.status === 'fulfilled' && subjectsRes.value?.data ? subjectsRes.value.data : [];
      const leaves = leavesRes.status === 'fulfilled' && leavesRes.value?.data ? leavesRes.value.data : [];

      setStats({
        studentsCount: students.length,
        classesCount: classes.length,
        subjectsCount: subjects.length,
        pendingLeaves: leaves.filter(l => l.status === 'PENDING').length,
      });

      setRecentStudents(students.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Welcome back. Overview of school metrics, pending approvals, and quick actions.</p>
        </div>
        <button onClick={loadDashboardData} className="btn btn-secondary btn-sm">
          Refresh Metrics
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{stats.studentsCount}</div>
          </div>
          <div className="stat-icon indigo">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Active Classes</div>
            <div className="stat-value">{stats.classesCount}</div>
          </div>
          <div className="stat-icon emerald">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Subjects</div>
            <div className="stat-value">{stats.subjectsCount}</div>
          </div>
          <div className="stat-icon amber">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Pending Leaves</div>
            <div className="stat-value" style={{ color: stats.pendingLeaves > 0 ? 'var(--warning, #eab308)' : 'inherit' }}>
              {stats.pendingLeaves}
            </div>
          </div>
          <div className="stat-icon rose">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>Operational Hub & Shortcuts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/admin/students" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={20} className="text-primary" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Students Directory</h3>
              </div>
              <ArrowRight size={16} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Enroll new students and modify profiles.
            </p>
          </div>
        </Link>

        <Link to="/admin/homework" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ClipboardList size={20} className="text-primary" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Homework Desk</h3>
              </div>
              <ArrowRight size={16} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Assign homework and track submission due dates.
            </p>
          </div>
        </Link>

        <Link to="/admin/leave" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={20} className="text-primary" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Leave Approvals</h3>
              </div>
              <ArrowRight size={16} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Review parent absence applications.
            </p>
          </div>
        </Link>

        <Link to="/admin/holidays" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sun size={20} className="text-warning" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>School Holidays</h3>
              </div>
              <ArrowRight size={16} color="var(--warning)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Schedule academic breaks and public holidays.
            </p>
          </div>
        </Link>

        <Link to="/admin/fees" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <DollarSign size={20} className="text-success" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Fees & Payments</h3>
              </div>
              <ArrowRight size={16} color="var(--success)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Generate invoices and record installments.
            </p>
          </div>
        </Link>

        <Link to="/admin/import-export" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileSpreadsheet size={20} className="text-primary" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Excel Import / Export</h3>
              </div>
              <ArrowRight size={16} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Bulk roster uploads and system backups.
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Students Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recently Enrolled Students</h3>
          <Link to="/admin/students" className="btn btn-outline btn-sm">
            View All
          </Link>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Roll / Admission</th>
                <th>Student Name</th>
                <th>Class & Section</th>
                <th>Gender</th>
                <th>Parent ID</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Loading records...' : 'No students found.'}
                  </td>
                </tr>
              ) : (
                recentStudents.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.admissionNumber || s.rollNumber}</strong></td>
                    <td style={{ fontWeight: 600 }}>{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</td>
                    <td><span className="badge badge-primary">{s.className} {s.section ? `(${s.section})` : ''}</span></td>
                    <td>{s.gender || '—'}</td>
                    <td>Parent #{s.parentId || 'N/A'}</td>
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
