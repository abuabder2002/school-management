import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useSchoolModules } from './context/SchoolModulesContext';

// Auth Pages
import { Login } from './pages/Login';

// Every other page is split into its own chunk and fetched when its route is first opened,
// so the login screen and dashboard do not download the whole application up front.
const CHUNK_RELOAD_KEY = 'app.chunkReloaded';

const lazyPage = (loader, name) => lazy(() => loader()
  .then((module) => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return { default: module[name] };
  })
  .catch((error) => {
    // A new deployment replaces the hashed chunk files, so a tab opened before it cannot
    // fetch the old ones. Reload once to pick up the new build instead of showing an error.
    if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }));

const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const StudentsPage = lazyPage(() => import('./pages/admin/StudentsPage'), 'StudentsPage');
const ParentsPage = lazyPage(() => import('./pages/admin/ParentsPage'), 'ParentsPage');
const StaffAccountsPage = lazyPage(() => import('./pages/admin/StaffAccountsPage'), 'StaffAccountsPage');
const MarksPage = lazyPage(() => import('./pages/admin/MarksPage'), 'MarksPage');
const AttendancePage = lazyPage(() => import('./pages/admin/AttendancePage'), 'AttendancePage');
const FeesPage = lazyPage(() => import('./pages/admin/FeesPage'), 'FeesPage');
const HomeworkPage = lazyPage(() => import('./pages/admin/HomeworkPage'), 'HomeworkPage');
const HolidayPage = lazyPage(() => import('./pages/admin/HolidayPage'), 'HolidayPage');
const LeaveRequestsPage = lazyPage(() => import('./pages/admin/LeaveRequestsPage'), 'LeaveRequestsPage');
const LeaveReasonsPage = lazyPage(() => import('./pages/admin/LeaveReasonsPage'), 'LeaveReasonsPage');
const ImportExportPage = lazyPage(() => import('./pages/admin/ImportExportPage'), 'ImportExportPage');
const NotificationsPage = lazyPage(() => import('./pages/admin/NotificationsPage'), 'NotificationsPage');
const ModuleAccessPage = lazyPage(() => import('./pages/admin/ModuleAccessPage'), 'ModuleAccessPage');
const BoardResultsPage = lazyPage(() => import('./pages/admin/BoardResultsPage'), 'BoardResultsPage');
const IdCardsPage = lazyPage(() => import('./pages/admin/IdCardsPage'), 'IdCardsPage');
const DailySchedulePage = lazyPage(() => import('./pages/admin/DailySchedulePage'), 'DailySchedulePage');
const VacanciesPage = lazyPage(() => import('./pages/admin/VacanciesPage'), 'VacanciesPage');
const SubscriptionViewPage = lazyPage(() => import('./pages/admin/SubscriptionViewPage'), 'SubscriptionViewPage');
const TeacherDashboard = lazyPage(() => import('./pages/teacher/TeacherDashboard'), 'TeacherDashboard');
const TeacherLeavePage = lazyPage(() => import('./pages/teacher/TeacherLeavePage'), 'TeacherLeavePage');
const ParentDashboard = lazyPage(() => import('./pages/parent/ParentDashboard'), 'ParentDashboard');
const SuperAdminDashboard = lazyPage(() => import('./pages/superadmin/SuperAdminDashboard'), 'SuperAdminDashboard');
const AddSchoolPage = lazyPage(() => import('./pages/superadmin/AddSchoolPage'), 'AddSchoolPage');
const SubscriptionPage = lazyPage(() => import('./pages/superadmin/SubscriptionPage'), 'SubscriptionPage');

// Index Landing Resolver
const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading EduCore Portal...</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role?.toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
  if (role === 'ADMIN' || role === 'ROLE_ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'TEACHER' || role === 'ROLE_TEACHER') return <Navigate to="/teacher" replace />;
  if (role === 'PARENT' || role === 'ROLE_PARENT') return <Navigate to="/parent" replace />;
  return <Navigate to="/login" replace />;
};

// Blocks direct URL navigation to a module the Super Admin has disabled for this school —
// the sidebar already hides the link, this stops typing the URL from bypassing that.
// Stays open while toggles are still loading (fail-open, same as the sidebar's own gating)
// so a slow network never bounces an admin out of a page that's actually allowed.
const ModuleGate = ({ moduleKey, children }) => {
  const { isModuleEnabled, loading } = useSchoolModules();
  if (!loading && !isModuleEnabled(moduleKey)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<HomeRedirect />} />

              {/* Super Admin Protected Routes */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SuperAdminDashboard />} />
                <Route path="schools" element={<AddSchoolPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                 <Route path="students" element={<ModuleGate moduleKey="STUDENTS"><StudentsPage /></ModuleGate>} />
                <Route path="parents" element={<ParentsPage />} />
                <Route path="staff" element={<ModuleGate moduleKey="STAFF"><StaffAccountsPage /></ModuleGate>} />
                <Route path="marks" element={<ModuleGate moduleKey="MARKS"><MarksPage /></ModuleGate>} />
                <Route path="academics" element={<Navigate to="/admin/marks" replace />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="fees" element={<ModuleGate moduleKey="BILLING"><FeesPage /></ModuleGate>} />
                <Route path="billing" element={<ModuleGate moduleKey="BILLING"><FeesPage /></ModuleGate>} />
                <Route path="homework" element={<HomeworkPage />} />
                <Route path="holidays" element={<HolidayPage />} />
                <Route path="leave" element={<ModuleGate moduleKey="LEAVE_RECORDS"><LeaveRequestsPage /></ModuleGate>} />
                <Route path="leave-reasons" element={<ModuleGate moduleKey="LEAVE_REASONS"><LeaveReasonsPage /></ModuleGate>} />
                <Route path="import-export" element={<ImportExportPage />} />
                <Route path="notifications" element={<ModuleGate moduleKey="NOTICE"><NotificationsPage /></ModuleGate>} />
                <Route path="module-access" element={<ModuleGate moduleKey="MODULE_ACCESS"><ModuleAccessPage /></ModuleGate>} />
                <Route path="board-results" element={<ModuleGate moduleKey="BOARD_RESULTS"><BoardResultsPage /></ModuleGate>} />
                <Route path="id-cards" element={<ModuleGate moduleKey="ID_CARDS"><IdCardsPage /></ModuleGate>} />
                <Route path="daily-schedule" element={<ModuleGate moduleKey="DAILY_SCHEDULE"><DailySchedulePage /></ModuleGate>} />
                <Route path="vacancies" element={<ModuleGate moduleKey="VACANCIES"><VacanciesPage /></ModuleGate>} />
                <Route path="subscription" element={<ModuleGate moduleKey="SUBSCRIPTION"><SubscriptionViewPage /></ModuleGate>} />
              </Route>

              {/* Teacher Protected Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<TeacherDashboard />} />
                <Route path="leave" element={<TeacherLeavePage />} />
              </Route>

              {/* Parent Protected Routes */}
              <Route
                path="/parent"
                element={
                  <ProtectedRoute allowedRoles={['PARENT']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ParentDashboard />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
