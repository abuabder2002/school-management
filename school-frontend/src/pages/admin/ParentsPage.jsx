import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Plus,
  Search,
  Mail,
  UserCheck,
  Shield,
  Baby,
} from 'lucide-react';

export const ParentsPage = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PARENT',
    studentId: '', // Added studentId
  });

  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [parentRes, studentRes] = await Promise.allSettled([
        authService.getParents(),
        studentService.getAllStudents(),
      ]);

      if (parentRes.status === 'fulfilled' && parentRes.value?.data) {
        setParents(parentRes.value.data);
      }
      if (studentRes.status === 'fulfilled' && studentRes.value?.data) {
        setStudents(studentRes.value.data);
      }
    } catch (err) {
      addToast('Failed to load parent management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'PARENT',
      studentId: '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId) {
      addToast('Please select a student to link to this parent.', 'error');
      return;
    }
    
    try {
      // Use the new createParent endpoint that enforces role and requires studentId
      const payload = {
        ...formData,
        studentId: Number(formData.studentId)
      };
      
      const res = await authService.createParent(payload);
      if (res.success || res.token || res.data) {
        addToast(`Parent account created for ${formData.name}`, 'success');
        setIsModalOpen(false);
        loadData();
      } else {
        addToast(res.message || 'Failed to create parent account', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  const getChildrenForParent = (parentId) => {
    return students.filter((s) => s.parentId === parentId);
  };

  const getStudentForParent = (studentId) => {
      if (!studentId) return null;
      return students.find((s) => s.id === studentId);
  };

  const filteredParents = parents.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Parent Account Management</h1>
          <p className="page-subtitle">Register parent users and view associated students.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Add New Parent Account
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search parent by name or email..."
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

      {/* Parents Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Parent ID</th>
              <th>Parent Name</th>
              <th>Email Address</th>
              <th>Role</th>
              <th>Assigned Student</th>
            </tr>
          </thead>
          <tbody>
            {filteredParents.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  {loading ? 'Fetching parent accounts...' : 'No parent accounts found.'}
                </td>
              </tr>
            ) : (
              filteredParents.map((p) => {
                // Use the studentId property we added to UserSummaryDTO
                const linkedStudent = getStudentForParent(p.studentId);
                
                return (
                  <tr key={p.id}>
                    <td><strong>#{p.id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                        <Mail size={14} /> {p.email}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">PARENT</span>
                    </td>
                    <td>
                      {!linkedStudent ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No student linked</span>
                      ) : (
                        <span className="badge badge-primary">
                          {linkedStudent.name || `${linkedStudent.firstName || ''} ${linkedStudent.lastName || ''}`} ({linkedStudent.className}-{linkedStudent.section})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Parent Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Parent User Account"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="parentForm" className="btn btn-primary">
              Register Parent
            </button>
          </>
        }
      >
        <form id="parentForm" onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Abdul Shaheen"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="e.g. parent@school.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="Set initial password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Assign Student</label>
            <select
              className="form-input"
              required
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            >
              <option value="">-- Select a Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.firstName || ''} ${s.lastName || ''}`} (Admin No: {s.admissionNumber})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
