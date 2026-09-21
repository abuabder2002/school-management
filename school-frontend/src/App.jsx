import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentsPage } from './pages/admin/StudentsPage';
import { ParentsPage } from './pages/admin/ParentsPage';
import { AcademicsPage } from './pages/admin/AcademicsPage';
import { FeesPage } from './pages/admin/FeesPage';
import { HomeworkPage } from './pages/admin/HomeworkPage';
import { HolidayPage } from './pages/admin/HolidayPage';
import { LeaveRequestsPage } from './pages/admin/LeaveRequestsPage';
import { ImportExportPage } from './pages/admin/ImportExportPage';

// Teacher & Parent Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { ParentDashboard } from './pages/parent/ParentDashboard';

import { ErrorBoundary } from './components/common/ErrorBoundary';

// Index Landing Resolver
const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'TEACHER') return <Navigate to="/teacher" replace />;
  if (user?.role === 'PARENT') return <Navigate to="/parent" replace />;
  return <Navigate to="/login" replace />;
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
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<HomeRedirect />} />

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
                <Route path="students" element={<StudentsPage />} />
                <Route path="parents" element={<ParentsPage />} />
                <Route path="academics" element={<AcademicsPage />} />
                <Route path="fees" element={<FeesPage />} />
                <Route path="homework" element={<HomeworkPage />} />
                <Route path="holidays" element={<HolidayPage />} />
                <Route path="leave" element={<LeaveRequestsPage />} />
                <Route path="import-export" element={<ImportExportPage />} />
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
