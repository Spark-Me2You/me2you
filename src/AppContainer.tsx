/**
 * App Container Component
 * Contains the authenticated app with state machine
 */

import { StateProvider, useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { ErrorBoundary } from '@/core/monitoring';
import { DiscoveryView } from '@/features/discovery';
import { MyProfileView } from '@/features/profile-editor';
import { useAuth } from '@/core/auth/AuthContext';
import './App.css';

/**
 * App Container Content
 * Renders different views based on current state machine state
 */
function AppContainerContent() {
  const { currentState, transitionTo } = useAppState();
  const { signOut, organization } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Render different views based on current state
  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return (
          <div>
            <h1>me2you</h1>
            <p>Welcome, {organization?.name || 'Organization'}!</p>
            <p>State: {currentState}</p>
            <p>Waiting for user presence...</p>
            <button
              onClick={() => transitionTo(AppState.DISCOVERY)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                marginTop: '1rem',
                marginRight: '1rem',
              }}
            >
              Try Discovery
            </button>
            <button
              onClick={() => transitionTo(AppState.MY_PROFILE)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                marginTop: '1rem',
                marginRight: '1rem',
              }}
            >
              My Profile
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                marginTop: '1rem',
              }}
            >
              Logout
            </button>
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
