import { Routes, Route, Navigate } from "react-router-dom";
import {
  ProtectedRoute,
  AdminOnlyRoute,
  UserProtectedRoute,
} from "@/core/auth";
import { AdminLoginPage, OrgSelectorPage } from "@/features/admin";
import { RegistrationPage } from "@/features/registration";
import { UserLandingPage, UserProfileView } from "@/features/user";
import { ClaimPage, ClaimSuccessPage, ClaimErrorPage } from "@/features/claim";
import AppContainer from "./AppContainer";
import "./App.css";

/**
 * Main App Component
 * Configures routing for user sign-in, admin login, registration, and kiosk mode
 * - /: Redirects to /user (main entry point)
 * - /user: Public mobile user sign-in landing page
 * - /user/profile: Protected user profile view
 * - /register: Public mobile user registration page (via QR code)
 * - /login: Public admin login page
 * - /select-org: Admin-only organization selector (leads to kiosk mode)
 * - /app: Protected route wrapping the state machine (admin or kiosk only)
 */
function App() {
  return (
    <Routes>
      {/* Public route: Admin login */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* Public route: Mobile user sign-in */}
      <Route path="/user" element={<UserLandingPage />} />

      {/* Public route: Mobile user registration */}
      <Route path="/register" element={<RegistrationPage />} />

      {/* User-only route: Mobile user profile */}
      <Route
        path="/user/profile"
        element={
          <UserProtectedRoute>
            <UserProfileView />
          </UserProtectedRoute>
        }
      />

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

      {/* Public routes: claim flow (ClaimPage handles its own auth redirect) */}
      <Route path="/claim/:tokenId" element={<ClaimPage />} />
      <Route path="/claim/success" element={<ClaimSuccessPage />} />
      <Route path="/claim/error" element={<ClaimErrorPage />} />

      {/* Default redirect to user landing page */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      {/* Catch-all: redirect to user landing page */}
      <Route path="*" element={<Navigate to="/user" replace />} />
    </Routes>
  );
}

export default App;
