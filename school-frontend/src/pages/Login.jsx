import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/common/Logo';
import { LogIn, KeyRound, IdCard, Eye, EyeOff, CalendarCheck, Wallet, Users } from 'lucide-react';

const DEMO_SHORTCUTS = {
  admin: { email: 'admin@school.com', password: 'Admin@123' },
  teacher: { email: 'teacher@school.com', password: 'Teacher@123' },
};

// A phone number is all digits (and common separators), 10+ digits long.
// Anything else — "admin@school.com", "admin", a parent's actual email —
// goes through staff login. This is what makes one field work for both portals.
const looksLikePhone = (value) => {
  const digitsOnly = value.replace(/[\s()+-]/g, '');
  return /^\d{10,}$/.test(digitsOnly);
};

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login, parentLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isPhone = useMemo(() => looksLikePhone(identifier.trim()), [identifier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      addToast('Enter your email or phone number, and your password', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      let user;
      if (looksLikePhone(cleanIdentifier)) {
        user = await parentLogin({ phoneNumber: cleanIdentifier, password: cleanPassword });
      } else {
        let email = cleanIdentifier;
        let demoPassword = cleanPassword;
        const shortcut = DEMO_SHORTCUTS[email.toLowerCase()];
        if (import.meta.env.DEV && shortcut) {
          email = shortcut.email;
          if (demoPassword.toLowerCase() === email.split('@')[0].toLowerCase() || demoPassword.toLowerCase() === 'password') {
            demoPassword = shortcut.password;
          }
        }
        user = await login({ email, password: demoPassword });
      }

      addToast(`Welcome back, ${user.name || user.email}!`, 'success');
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEACHER') navigate('/teacher');
      else if (user.role === 'PARENT') navigate('/parent');
      else navigate('/');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Login failed. Check your details and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (kind) => {
    if (kind === 'parent') {
      setIdentifier('9876543210');
      setPassword('Parent@123');
    } else {
      setIdentifier(DEMO_SHORTCUTS[kind].email);
      setPassword(DEMO_SHORTCUTS[kind].password);
    }
  };

  return (
    <div className="auth-shell">
      {/* Brand side: who this is and what it does (hidden on phones) */}
      <aside className="auth-brand" aria-label="About EduCore">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Logo size={44} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>EduCore</div>
            <div style={{ fontSize: '0.75rem', color: '#8e9bbd', fontWeight: 500 }}>School Management System</div>
          </div>
        </div>

        <div>
          <h2>Everything your school runs on, in one place.</h2>
          <ul className="auth-points">
            <li>
              <span><CalendarCheck size={16} /></span>
              <div><strong>Attendance and leave</strong>Daily records and leave requests, kept in step with the parent portal.</div>
            </li>
            <li>
              <span><Wallet size={16} /></span>
              <div><strong>Fees and billing</strong>Bills, payments and what is still outstanding, class by class.</div>
            </li>
            <li>
              <span><Users size={16} /></span>
              <div><strong>One sign-in for everyone</strong>Admins, teachers and parents each see only what they need.</div>
            </li>
          </ul>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#7d8ab0' }}>&copy; {new Date().getFullYear()} EduCore</div>
      </aside>

      {/* Form side */}
      <main className="auth-panel" id="main-content">
        <div className="auth-card">
        {/* Brand Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ marginBottom: '1.1rem' }} className="auth-mobile-logo">
            <Logo size={48} />
          </div>
          <h1 style={{ margin: 0 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Sign in with your email or mobile number to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email or Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="you@school.com or your mobile number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
                autoComplete="username"
                required
                autoFocus
              />
              <IdCard
                size={15}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
            </div>
            {identifier.trim() && (
              <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.35rem', fontWeight: 600 }}>
                {isPhone ? 'Signing in to the parent portal' : 'Signing in to the staff portal'}
              </p>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.4rem', paddingRight: '2.4rem' }}
                autoComplete="current-password"
                required
              />
              <KeyRound
                size={15}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontWeight: 650, marginBottom: '1.25rem' }}
            disabled={submitting}
          >
            <LogIn size={15} />
            <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Quick-Fill Credentials (dev builds only, never shown in production) */}
        {import.meta.env.DEV && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Demo Login
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem' }} onClick={() => handleQuickFill('admin')}>
                Admin
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem' }} onClick={() => handleQuickFill('teacher')}>
                Teacher
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem' }} onClick={() => handleQuickFill('parent')}>
                Parent
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
              Demo Passwords: <code>Admin@123</code> &bull; <code>Teacher@123</code> &bull; <code>Parent@123</code>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};
