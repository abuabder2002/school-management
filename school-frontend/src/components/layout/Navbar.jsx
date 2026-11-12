import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, HeartHandshake, LogOut, Menu, CalendarDays } from 'lucide-react';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'ADMIN':
        return (
          <span className="badge badge-primary">
            <ShieldCheck size={13} /> Administrator
          </span>
        );
      case 'TEACHER':
        return (
          <span className="badge badge-success">
            <UserCheck size={13} /> Teacher
          </span>
        );
      case 'PARENT':
        return (
          <span className="badge badge-warning">
            <HeartHandshake size={13} /> Parent
          </span>
        );
      default:
        return <span className="badge badge-secondary">{user?.role}</span>;
    }
  };

  return (
    <header className="top-navbar">
      <div className="navbar-brand-section">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation"
          >
            <Menu size={18} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="navbar-title" style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 650, letterSpacing: '-0.01em' }}>
            School Management System
          </span>
          <span className="navbar-date">
            <CalendarDays size={14} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="navbar-user-section">
        {getRoleBadge()}
        <div className="user-badge">
          <div className="user-avatar">{(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</div>
          <span className="user-name" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {user?.name || user?.email || 'User'}
          </span>
        </div>
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign Out"
        >
          <LogOut size={14} />
          <span className="logout-label">Logout</span>
        </button>
      </div>
    </header>
  );
};
