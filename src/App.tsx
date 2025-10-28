import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme-provider';
import { AuthProvider } from './lib/auth-provider';
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRouteWithModal } from './components/ProtectedRouteWithModal';
import { Dashboard } from './pages/Dashboard';
import { MySecretsPage } from './pages/MySecretsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { SecretViewPage } from './pages/SecretViewPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ApiDocs } from './pages/ApiDocs';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ApiPage from './pages/ApiPage';
import './App.css';



// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/view/:id" element={<SecretViewPage />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRouteWithModal>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRouteWithModal>
          }
        />
        <Route
          path="/dashboard/secrets"
          element={
            <ProtectedRouteWithModal>
              <DashboardLayout>
                <MySecretsPage />
              </DashboardLayout>
            </ProtectedRouteWithModal>
          }
        />
        <Route
          path="/dashboard/analytics"
          element={
            <ProtectedRouteWithModal>
              <DashboardLayout>
                <AnalyticsDashboard />
              </DashboardLayout>
            </ProtectedRouteWithModal>
          }
        />
        <Route
          path="/dashboard/api"
          element={
            <ProtectedRouteWithModal>
              <DashboardLayout>
                <ApiPage />
              </DashboardLayout>
            </ProtectedRouteWithModal>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRouteWithModal>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRouteWithModal>
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