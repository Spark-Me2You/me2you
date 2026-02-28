import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { ErrorBoundary } from '@/core/monitoring';
import './App.css';

/**
 * Main App Component
 * TODO: Implement state machine orchestrator (replaces routing)
 */
function App() {
  const { currentState } = useAppState();

  // Render different views based on current state
  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return (
          <div>
            {/* TODO: Render idle/screensaver state */}
            <h1>me2you</h1>
            <p>State: {currentState}</p>
            <p>Waiting for user presence...</p>
          </div>
        );

      case AppState.AUTH:
        return (
          <div>
            {/* TODO: Render authentication state */}
            <h1>Authentication</h1>
            <p>State: {currentState}</p>
            <p>Please swipe your card</p>
          </div>
        );

      case AppState.ONBOARDING:
        return (
          <div>
            {/* TODO: Render onboarding/tutorial state */}
            <h1>Welcome!</h1>
            <p>State: {currentState}</p>
            <p>Let's create your profile</p>
          </div>
        );

      case AppState.PROFILE_EDITOR:
        return (
          <div>
            {/* TODO: Render profile editor state */}
            <h1>Profile Editor</h1>
            <p>State: {currentState}</p>
          </div>
        );

      case AppState.HUB:
        return (
          <div>
            {/* TODO: Render hub/community dashboard state */}
            <h1>Community Hub</h1>
            <p>State: {currentState}</p>
          </div>
        );

      case AppState.DISCOVERY:
        return (
          <div>
            {/* TODO: Render gesture discovery state */}
            <h1>Discovery</h1>
            <p>State: {currentState}</p>
            <p>Match a gesture to discover profiles</p>
          </div>
        );

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
      <div className="app">
        {renderCurrentState()}
      </div>
    </ErrorBoundary>
  );
}

export default App;
