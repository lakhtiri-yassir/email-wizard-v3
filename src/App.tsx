import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import Dashboard from './pages/app/Dashboard';
import { Contacts } from './pages/app/Contacts';
import { Campaigns } from './pages/app/Campaigns';
import Templates from './pages/app/Templates';
import TemplateEditor from './components/templates/TemplateEditor';
import { Analytics } from './pages/app/Analytics';
import { Settings } from './pages/app/Settings';
import TemplateEdit from './pages/app/TemplateEdit';
import Domains from './pages/app/settings/Domains'; // ADD THIS IMPORT
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';
import { AdminLayout } from './components/admin/AdminLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { adminUser, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected App Routes */}
            <Route
  path="/app/templates/edit/:templateId"
  element={
    <ProtectedRoute>
      <TemplateEdit />
    </ProtectedRoute>
  }
/>
            <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/app/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/app/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/app/template/editor" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
            <Route path="/app/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/app/settings/domains" element={<ProtectedRoute><Domains /></ProtectedRoute>} /> {/* ADD THIS ROUTE */}

            {/* Redirect old routes */}
            <Route path="/app/audience" element={<Navigate to="/app/contacts" replace />} />
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminDashboardPage />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminUsersPage />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/system"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminSystemPage />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;