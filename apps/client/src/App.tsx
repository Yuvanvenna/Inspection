import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { ClientsPage } from './pages/manager/ClientsPage';
import { ProjectsPage } from './pages/manager/ProjectsPage';
import { ProjectDetailPage } from './pages/manager/ProjectDetailPage';
import { StageDetailPage } from './pages/manager/StageDetailPage';
import { EmployeesPage } from './pages/manager/EmployeesPage';
import { MyTasksPage } from './pages/employee/MyTasksPage';
import { TaskDetailPage } from './pages/shared/TaskDetailPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeProjectsPage } from './pages/employee/EmployeeProjectsPage';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import { AuditLogsPage } from './pages/manager/AuditLogsPage';
import { SettingsPage } from './pages/manager/SettingsPage';
import { ProfilePage } from './pages/employee/ProfilePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard'} replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Manager Protected Routes */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute requiredRole="MANAGER">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="stages/:id" element={<StageDetailPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Employee Protected Routes */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute requiredRole="EMPLOYEE">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="projects" element={<EmployeeProjectsPage />} />
            <Route path="tasks" element={<MyTasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
};
