import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { Dashboard } from './pages/app/Dashboard';
import { Audience } from './pages/app/Audience';
import { Campaigns } from './pages/app/Campaigns';
import { Automations } from './pages/app/Automations';
import { Templates } from './pages/app/Templates';
import { ContentStudio } from './pages/app/ContentStudio';
import { LandingPages } from './pages/app/LandingPages';
import { Analytics } from './pages/app/Analytics';
import { Settings } from './pages/app/Settings';
import { AdminDashboard } from './pages/admin/AdminDashboard';

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/audience" element={<ProtectedRoute><Audience /></ProtectedRoute>} />
          <Route path="/app/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="/app/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
          <Route path="/app/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/app/content" element={<ProtectedRoute><ContentStudio /></ProtectedRoute>} />
          <Route path="/app/landing-pages" element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
          <Route path="/app/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
