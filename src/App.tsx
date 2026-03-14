import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/core/auth';
import { AdminLoginPage } from '@/features/admin';
import AppContainer from './AppContainer';
import './App.css';

/**
 * Main App Component
 * Configures routing between login and authenticated app
 * - /login: Public admin login page
 * - /app: Protected route wrapping the state machine (AppContainer)
 * - /: Redirects to /app (will redirect to /login if not authenticated)
 */
function App() {
  return (
    <Routes>
      {/* Public route: Admin login */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* Protected route: Main app with state machine */}
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
