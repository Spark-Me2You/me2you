import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminOnlyRoute } from '@/core/auth';
import { AdminLoginPage, OrgSelectorPage } from '@/features/admin';
import { RegistrationPage } from '@/features/registration';
import AppContainer from './AppContainer';
import './App.css';

/**
 * Main App Component
 * Configures routing for admin login, org selection, registration, and kiosk mode
 * - /login: Public admin login page
 * - /register: Public mobile user registration page
 * - /select-org: Admin-only organization selector (leads to kiosk mode)
 * - /app: Protected route wrapping the state machine (admin or kiosk)
 * - /: Redirects to /app (will redirect to /login if not authenticated)
 */
function App() {
  return (
    <Routes>
      {/* Public route: Admin login */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* Public route: Mobile user registration */}
      <Route path="/register" element={<RegistrationPage />} />

      {/* Admin-only route: Organization selector */}
      <Route
        path="/select-org"
        element={
          <AdminOnlyRoute>
            <OrgSelectorPage />
          </AdminOnlyRoute>
        }
      />

      {/* Protected route: Main app with state machine (admin or kiosk) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppContainer />
          </ProtectedRoute>
        }
      />

      {/* Default redirect to app (will redirect to login if not authenticated) */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Catch-all: redirect to app */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;
