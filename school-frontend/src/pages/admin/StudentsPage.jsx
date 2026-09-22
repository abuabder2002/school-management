import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { BulkUploadModal } from '../../components/students/BulkUploadModal';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Upload,
} from 'lucide-react';

export const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    rollNumber: '',
    className: 'Class 10',
    section: 'A',
    dateOfBirth: '2010-01-01',
    parentId: '',
    contactNumber: '',
    address: '',
  });

  const { addToast } = useToast();

  useEffect(() => {
    loadStudents();
    loadParents();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredStudents(students);
    } else {
      const q = search.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.firstName?.toLowerCase().includes(q) ||
            s.lastName?.toLowerCase().includes(q) ||
            s.rollNumber?.toLowerCase().includes(q) ||
            s.className?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, students]);

  const loadParents = async () => {
    try {
      const res = await authService.getParents();
      if (res.success && res.data) {
        setParents(res.data);
      }
    } catch (err) {
      console.error('Failed to load parents list', err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAllStudents();
      if (res.success && res.data) {
        const mappedData = res.data.map(s => {
          const names = (s.name || '').split(' ');
          return {
            ...s,
            firstName: names[0] || '',
            lastName: names.slice(1).join(' ') || '',
            rollNumber: s.admissionNumber || ''
          };
        });
        setStudents(mappedData);
        setFilteredStudents(mappedData);
      }
    } catch (err) {
      addToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    const defaultParentId = parents.length > 0 ? parents[0].id : '';
    setFormData({
      firstName: '',
      lastName: '',
      rollNumber: `RN-${Math.floor(1000 + Math.random() * 9000)}`,
      className: 'Class 10',
      section: 'A',
      dateOfBirth: '2010-01-01',
      parentId: defaultParentId,
      contactNumber: '+1 555-0199',
      address: '123 Main St, Springfield',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      rollNumber: student.rollNumber,
      className: student.className,
      section: student.section,
      dateOfBirth: student.dateOfBirth,
      parentId: student.parentId || '',
      contactNumber: student.contactNumber || '',
      address: student.address || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      await studentService.deleteStudent(id);
      addToast('Student deleted successfully', 'success');
      loadStudents();
    } catch (err) {
      addToast('Failed to delete student', 'error');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.parentId) {
      addToast('Please select a parent for the student', 'error');
      return;
    }
    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        admissionNumber: formData.rollNumber,
        className: formData.className,
        section: formData.section,
        dateOfBirth: formData.dateOfBirth,
        parentId: parseInt(formData.parentId),
        contactNumber: formData.contactNumber,
        address: formData.address
      };

      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, payload);
        addToast('Student updated successfully!', 'success');
      } else {
        await studentService.createStudent(payload);
        addToast('Student enrolled successfully!', 'success');
      }
      setIsModalOpen(false);
      loadStudents();
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const getParentLabel = (parentId) => {
    if (!parentId) return 'Unassigned';
    const found = parents.find((p) => p.id === parentId);
    return found ? `${found.name} (ID #${found.id})` : `Parent ID #${parentId}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Directory</h1>
          <p className="page-subtitle">Manage student enrollments, profiles, and parent associations.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
            }}
          >
            <Upload size={18} /> Bulk Upload Students
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={18} /> Enroll New Student
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by student name, roll number, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
          <Search
            size={18}
            style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Class & Section</th>
              <th>Contact Number</th>
              <th>Parent / Guardian</th>
              <th>Address</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  {loading ? 'Fetching student records...' : 'No students matching your search criteria.'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.rollNumber}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DOB: {s.dateOfBirth}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{s.className} - {s.section}</span>
                  </td>
                  <td>{s.contactNumber || '—'}</td>
                  <td>
                    <span className="badge badge-outline" style={{ border: '1px solid var(--border-subtle)' }}>
                      {getParentLabel(s.parentId)}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.address || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="btn btn-secondary btn-sm"
                        title="Edit profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete student"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Profile' : 'Enroll New Student'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="studentForm" className="btn btn-primary">
              {editingStudent ? 'Save Changes' : 'Enroll Student'}
            </button>
          </>
        }
      >
        <form id="studentForm" onSubmit={handleFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Roll / Admission Number</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent / Guardian</label>
              <select
                className="form-input"
                required
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">-- Select Parent --</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email}) - ID #{p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Class 10"
                required
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. A"
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address</label>
            <input
              type="text"
              className="form-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Students Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={loadStudents}
      />
    </div>
  );
};
