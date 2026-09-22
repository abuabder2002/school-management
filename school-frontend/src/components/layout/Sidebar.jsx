import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  DollarSign,
  LogOut,
  CalendarCheck,
  Award,
  ClipboardList,
  FileSpreadsheet,
  Palmtree,
  FileText,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout, isAdmin, isTeacher, isParent } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <GraduationCap size={24} />
        </div>
        <div>
          <div className="sidebar-brand-text">EduCore</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Management System</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {isAdmin && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem 0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
              Admin Portal
            </div>
            <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={19} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/students" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={19} />
              <span>Students</span>
            </NavLink>
            <NavLink to="/admin/parents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <UserCheck size={19} />
              <span>Parents</span>
            </NavLink>
            <NavLink to="/admin/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BookOpen size={19} />
              <span>Academics</span>
            </NavLink>
            <NavLink to="/admin/fees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <DollarSign size={19} />
              <span>Fees</span>
            </NavLink>
            <NavLink to="/admin/homework" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ClipboardList size={19} />
              <span>Homework</span>
            </NavLink>
            <NavLink to="/admin/holidays" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Palmtree size={19} />
              <span>Holidays</span>
            </NavLink>
            <NavLink to="/admin/leave" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={19} />
              <span>Leave Requests</span>
            </NavLink>
            <NavLink to="/admin/import-export" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileSpreadsheet size={19} />
              <span>Import / Export</span>
            </NavLink>
          </>
        )}

        {isTeacher && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem 0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
              Teacher Portal
            </div>
            <NavLink to="/teacher" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={19} />
              <span>Attendance & Marks</span>
            </NavLink>
          </>
        )}

        {isParent && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem 0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
              Parent Portal
            </div>
            <NavLink to="/parent" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={19} />
              <span>Student Overview</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#312e81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#818cf8',
            }}
          >
            {(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{user?.name || user?.username}</div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-sm)',
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
