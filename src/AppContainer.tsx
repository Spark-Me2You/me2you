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
import { HubView } from "@/features/hub";
import { useAuth } from "@/core/auth";
import logo from "@/assets/me2you.png";
import styles from "./AppContainer.module.css";

/**
 * App Container Content
 * Renders different views based on current state machine state
 * Displays appropriate logout button based on auth mode (admin vs kiosk)
 */
function AppContainerContent() {
  const { currentState, transitionTo } = useAppState();
  const { signOut, admin, authMode, kioskOrgId, exitKioskMode } = useAuth();

  // Log current auth mode on mount and when it changes
  // useEffect(() => {
  //   console.log("[AppContainer] Rendered in auth mode:", authMode);
  //   if (authMode === "kiosk") {
  //     console.log("[AppContainer] Kiosk mode active for org:", kioskOrgId);
  //   } else if (authMode === "admin") {
  //     console.log("[AppContainer] Admin mode active:", admin?.email);
  //   }
  // }, [authMode, kioskOrgId, admin]);

  // Render logout button based on auth mode
  const renderLogoutButton = () => {
    if (authMode === "admin") {
      return (
        <button
          onClick={handleAdminLogout}
          className={`${styles.buttonBase} ${styles.adminLogoutButton}`}
        >
          Admin Logout
        </button>
      );
    } else if (authMode === "kiosk") {
      return (
        <button
          onClick={handleExitKiosk}
          className={`${styles.buttonBase} ${styles.kioskLogoutButton}`}
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
            {/* {authMode === "admin" && admin && (
              <p className={styles.authMeta}>Admin: {admin.email}</p>
            )}
            {authMode === "kiosk" && kioskOrgId && (
              <p className={styles.authMeta}>Kiosk Mode - Org: {kioskOrgId}</p>
            )} */}
            <button
              onClick={() => transitionTo(AppState.DISCOVERY)}
              className={`${styles.buttonBase} ${styles.stateActionButton} ${styles.discoveryButton}`}
            >
              Try Discovery
            </button>
            {/* <button
              onClick={() => transitionTo(AppState.MY_PROFILE)}
              className={`${styles.buttonBase} ${styles.stateActionButton} ${styles.profileButton}`}
            >
              My Profile
            </button> */}
            <button
              onClick={() => transitionTo(AppState.HUB)}
              className={`${styles.buttonBase} ${styles.stateActionButton} ${styles.hubButton}`}
            >
              Community Hub
            </button>
            {renderLogoutButton()}
          </div>
        );

      case AppState.AUTH:
        return (
          <div>
            <h1>Authentication</h1>
            <p>Please swipe your card</p>
          </div>
        );

      case AppState.ONBOARDING:
        return (
          <div>
            <h1>Welcome!</h1>
            <p>Let's create your profile</p>
          </div>
        );

      case AppState.PROFILE_EDITOR:
        return (
          <div>
            <h1>Profile Editor</h1>
          </div>
        );

      case AppState.HUB:
        return <HubView />;

      case AppState.DISCOVERY:
        return <DiscoveryView />;

      case AppState.MY_PROFILE:
        return <MyProfileView onBack={() => transitionTo(AppState.IDLE)} />;

      default:
        return (
          <div>
            <h1>Unknown State</h1>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className={styles.app}>{renderCurrentState()}</div>
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
