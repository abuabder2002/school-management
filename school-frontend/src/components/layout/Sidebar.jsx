import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFeatureToggles } from '../../hooks/useFeatureToggles';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  LogOut,
  Award,
  FileText,
  Bell,
  BookMarked,
  KeyRound,
  ShieldCheck,
  GraduationCap,
  IdCard,
  Building2,
  CalendarClock,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isSuperAdmin, isAdmin, isTeacher, isParent } = useAuth();
  const { isEnabled: isTeacherModuleEnabled } = useFeatureToggles(isTeacher ? 'TEACHER' : null);

  const handleLinkClick = () => {
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <Logo size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-brand-text">EduCore</div>
          <div className="sidebar-brand-sub">School Management System</div>
        </div>
        {isOpen && (
          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'none',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {isSuperAdmin && (
          <>
            <div className="sidebar-section-title">Super Admin</div>
            <NavLink
              to="/super-admin/schools"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Building2 size={18} />
              <span>Add School</span>
            </NavLink>
            <NavLink
              to="/super-admin/subscription"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <CalendarClock size={18} />
              <span>Subscription</span>
            </NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <div className="sidebar-section-title">Administration</div>
            <NavLink
              to="/admin"
              end
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/students"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Students</span>
            </NavLink>
            <NavLink
              to="/admin/marks"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Award size={18} />
              <span>Marks</span>
            </NavLink>
            <NavLink
              to="/admin/fees"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <DollarSign size={18} />
              <span>Billing</span>
            </NavLink>
            <NavLink
              to="/admin/leave"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <FileText size={18} />
              <span>Leave Records</span>
            </NavLink>
            <NavLink
              to="/admin/leave-reasons"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <BookMarked size={18} />
              <span>Leave Reasons</span>
            </NavLink>
            <NavLink
              to="/admin/notifications"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Bell size={18} />
              <span>Notifications</span>
            </NavLink>
            <NavLink
              to="/admin/staff"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <KeyRound size={18} />
              <span>Staff Accounts</span>
            </NavLink>
            <NavLink
              to="/admin/module-access"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={18} />
              <span>Module Access</span>
            </NavLink>
            <NavLink
              to="/admin/board-results"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <GraduationCap size={18} />
              <span>Board Results</span>
            </NavLink>
            <NavLink
              to="/admin/id-cards"
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <IdCard size={18} />
              <span>ID Cards</span>
            </NavLink>
          </>
        )}

        {isTeacher && (
          <>
            <div className="sidebar-section-title">Teacher Portal</div>
            <NavLink
              to="/teacher"
              end
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard & Homework</span>
            </NavLink>
            {isTeacherModuleEnabled('LEAVE') && (
              <NavLink
                to="/teacher/leave"
                onClick={handleLinkClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <FileText size={18} />
                <span>Leave Records</span>
              </NavLink>
            )}
          </>
        )}

        {isParent && (
          <>
            <div className="sidebar-section-title">Parent Portal</div>
            <NavLink
              to="/parent"
              end
              onClick={handleLinkClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Student Overview</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#312e81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#a5b4fc',
              flexShrink: 0,
            }}
          >
            {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || user?.email || 'User'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{user?.role}</div>
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
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-xs)',
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};