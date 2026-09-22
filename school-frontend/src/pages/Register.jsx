import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GraduationCap, UserPlus, Mail, KeyRound, User, ShieldCheck } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await register(formData);
      if (res.success) {
        addToast('Registration successful! Please login.', 'success');
        navigate('/login');
      } else {
        addToast(res.message || 'Registration failed', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(79, 70, 229, 0.2) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0, transparent 50%)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          padding: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#fff',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
            }}
          >
            <GraduationCap size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create an Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Register new user credentials for EduCore
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <User
                size={18}
                style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <Mail
                size={18}
                style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <KeyRound
                size={18}
                style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">User Role</label>
            <div style={{ position: 'relative' }}>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                style={{ paddingLeft: '2.4rem' }}
              >
                <option value="ADMIN">ADMIN (System Administrator)</option>
                <option value="TEACHER">TEACHER (Instructor)</option>
                <option value="PARENT">PARENT (Guardian)</option>
              </select>
              <ShieldCheck
                size={18}
                style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            <UserPlus size={18} />
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
