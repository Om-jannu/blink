import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './lib/theme-provider';
import { AuthProvider } from './lib/auth-provider';
import { useAuth } from '@clerk/clerk-react';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { MySecretsPage } from './pages/MySecretsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ApiPage from './pages/ApiPage';
import './App.css';


// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/view/:id" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/secrets"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MySecretsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/analytics"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AnalyticsDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/api"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ApiPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

function AppWrapper() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="blink-theme">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppWrapper;