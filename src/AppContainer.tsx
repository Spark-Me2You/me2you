/**
 * App Container Component
 * Contains the authenticated app with state machine
 */

import { useEffect } from "react";
import { StateProvider, useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { ErrorBoundary } from "@/core/monitoring";
import { DiscoveryView } from "@/features/discovery";
import { MyProfileView } from "@/features/profile-editor";
import { useAuth } from "@/core/auth";
import "./App.css";
import logo from "@/assets/me2you.png";

/**
 * App Container Content
 * Renders different views based on current state machine state
 * Displays appropriate logout button based on auth mode (admin vs kiosk)
 */
function AppContainerContent() {
  const { currentState, transitionTo } = useAppState();
  const { signOut, admin, authMode, kioskOrgId, exitKioskMode } = useAuth();

  // Log current auth mode on mount and when it changes
  useEffect(() => {
    console.log("[AppContainer] Rendered in auth mode:", authMode);
    if (authMode === "kiosk") {
      console.log("[AppContainer] Kiosk mode active for org:", kioskOrgId);
    } else if (authMode === "admin") {
      console.log("[AppContainer] Admin mode active:", admin?.email);
    }
  }, [authMode, kioskOrgId, admin]);

  // Render logout button based on auth mode
  const renderLogoutButton = () => {
    if (authMode === "admin") {
      return (
        <button
          onClick={handleAdminLogout}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            marginTop: "1rem",
          }}
        >
          Admin Logout
        </button>
      );
    } else if (authMode === "kiosk") {
      return (
        <button
          onClick={handleExitKiosk}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#ff6f00",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            marginTop: "1rem",
          }}
        >
          Exit Kiosk Mode
        </button>
      );
    }
    return null;
  };

  // Handle admin logout
  const handleAdminLogout = async () => {
    console.log("[AppContainer] Admin logout clicked");
    try {
      await signOut();
      console.log("[AppContainer] Admin signed out, redirecting to /login");
      // Router will automatically redirect to /login
    } catch (error) {
      console.error("[AppContainer] Admin logout failed:", error);
    }
  };

  // Handle exit kiosk mode
  const handleExitKiosk = async () => {
    console.log("[AppContainer] Exit kiosk clicked");
    try {
      await exitKioskMode();
      console.log("[AppContainer] Kiosk mode exited, redirecting to /login");
      // Router will automatically redirect to /login
    } catch (error) {
      console.error("[AppContainer] Exit kiosk failed:", error);
    }
  };

  // Render different views based on current state
  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return (
          <div>
            <img id="logo" src={logo} alt="me2you"></img>
            <p>State: {currentState}</p>
            {authMode === "admin" && admin && (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                Admin: {admin.email}
              </p>
            )}
            {authMode === "kiosk" && kioskOrgId && (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                Kiosk Mode - Org: {kioskOrgId}
              </p>
            )}
            <p>Waiting for user presence...</p>
            <button
              onClick={() => transitionTo(AppState.DISCOVERY)}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                cursor: "pointer",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                marginTop: "1rem",
                marginRight: "1rem",
              }}
            >
              Try Discovery
            </button>
            <button
              onClick={() => transitionTo(AppState.MY_PROFILE)}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                cursor: "pointer",
                backgroundColor: "#333",
                color: "#fff",
                border: "1px solid #555",
                borderRadius: "4px",
                marginTop: "1rem",
                marginRight: "1rem",
              }}
            >
              My Profile
            </button>
            {renderLogoutButton()}
          </div>
        );

      case AppState.AUTH:
        return (
          <div>
            <h1>Authentication</h1>
            <p>State: {currentState}</p>
            <p>Please swipe your card</p>
          </div>
        );

      case AppState.ONBOARDING:
        return (
          <div>
            <h1>Welcome!</h1>
            <p>State: {currentState}</p>
            <p>Let's create your profile</p>
          </div>
        );

      case AppState.PROFILE_EDITOR:
        return (
          <div>
            <h1>Profile Editor</h1>
            <p>State: {currentState}</p>
          </div>
        );

      case AppState.HUB:
        return (
          <div>
            <h1>Community Hub</h1>
            <p>State: {currentState}</p>
          </div>
        );

      case AppState.DISCOVERY:
        return <DiscoveryView />;

      case AppState.MY_PROFILE:
        return <MyProfileView onBack={() => transitionTo(AppState.IDLE)} />;

      default:
        return (
          <div>
            <h1>Unknown State</h1>
            <p>State: {currentState}</p>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="app">{renderCurrentState()}</div>
    </ErrorBoundary>
  );
}

/**
 * App Container
 * Wraps authenticated app with StateProvider
 */
function AppContainer() {
  return (
    <StateProvider>
      <AppContainerContent />
    </StateProvider>
  );
}

export default AppContainer;
