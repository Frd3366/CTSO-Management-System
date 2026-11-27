import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ShiftSchedule } from './pages/ShiftSchedule';
import { JobdeskView } from './pages/JobdeskView';
import { RequestsAndLeaves } from './pages/RequestsAndLeaves';
import { ShiftMaster } from './pages/ShiftMaster';
import { JobdeskMaster } from './pages/JobdeskMaster';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { UserManagement } from './pages/UserManagement';
import { RolePermission } from './pages/RolePermission';
import { AnnouncementManagement } from './pages/AnnouncementManagement';
import { ActivityLogList } from './pages/ActivityLogList';
import { ScheduleHistory } from './pages/ScheduleHistory';
import { Reports } from './pages/Reports';
import { Analytics } from './pages/Analytics';
import { SettingsProfile } from './pages/SettingsProfile';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: ('Admin' | 'SPV' | 'Employee')[] }> = ({
  children,
  allowedRoles
}) => {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role gate checking
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const getBasename = () => {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/cms')
    ? '/cms'
    : '';
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter basename={getBasename()}>
        <ModalProvider>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                {/* Public Dual-View 3D Landing Page & Login Route */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                {/* Protected App Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="schedule" element={<ShiftSchedule />} />
                  <Route path="jobdesk" element={<JobdeskView />} />
                  
                  {/* Unified Requests & Leaves page (English title, combined workflow) */}
                  <Route path="requests" element={<RequestsAndLeaves />} />
                  <Route path="management/requests" element={<Navigate to="/requests" replace />} />
                  <Route path="management/leave" element={<Navigate to="/requests" replace />} />

                  {/* Management & Master Data with Role Gating */}
                  <Route path="management/employees" element={<EmployeeManagement />} />
                  
                  {/* Restricted for Employee: User Accounts, Role Permissions, Activity Logs, Schedule History */}
                  <Route
                    path="management/users"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/shift-master"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <ShiftMaster />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/jobdesk-master"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <JobdeskMaster />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/permissions"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <RolePermission />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/announcements"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <AnnouncementManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/activity-logs"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <ActivityLogList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="management/schedule-history"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <ScheduleHistory />
                      </ProtectedRoute>
                    }
                  />

                  {/* Reports, Analytics & Profile */}
                  <Route
                    path="analytics"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <Analytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'SPV']}>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="settings/profile" element={<SettingsProfile />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </ModalProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
