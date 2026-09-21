import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, HeartHandshake, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'ADMIN':
        return (
          <span className="badge badge-primary">
            <ShieldCheck size={14} /> Administrator
          </span>
        );
      case 'TEACHER':
        return (
          <span className="badge badge-success">
            <UserCheck size={14} /> Teacher
          </span>
        );
      case 'PARENT':
        return (
          <span className="badge badge-warning">
            <HeartHandshake size={14} /> Parent
          </span>
        );
      default:
        return <span className="badge badge-secondary">{user?.role}</span>;
    }
  };

  return (
    <header className="top-navbar">
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>School Management Portal</h2>
      </div>

      <div className="navbar-user-section">
        {getRoleBadge()}
        <div className="user-badge">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.35rem' }}
          title="Sign Out"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
