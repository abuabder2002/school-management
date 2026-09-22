import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GraduationCap, LogIn, KeyRound, User, Sparkles } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const user = await login({ email, password });
      addToast(`Welcome back, ${user.name || user.email}!`, 'success');

      // Navigate based on role
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEACHER') navigate('/teacher');
      else if (user.role === 'PARENT') navigate('/parent');
      else navigate('/');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (e, p) => {
    setEmail(e);
    setPassword(p);
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
          maxWidth: '440px',
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>EduCore Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <KeyRound
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
            <LogIn size={18} />
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Quick Fill Helper */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>Quick Demo Credentials</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin@school.com', 'Admin@123')}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('teacher@school.com', 'Teacher@123')}
            >
              Teacher
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('parent@school.com', 'Parent@123')}
            >
              Parent
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};
