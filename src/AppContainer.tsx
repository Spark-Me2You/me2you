/**
 * App Container Component
 * Contains the authenticated app with state machine
 */

import { StateProvider, useAppState } from "@/core/state-machine";
import {
  CvCursorOverlay,
  CvCursorEnabledProvider,
  useCvCursorEnabled,
} from "@/core/cv/cursor";
import { SharedCameraProvider } from "@/core/cv/SharedCameraProvider";
import { AppState } from "@/core/state-machine/appStateMachine";
import { ErrorBoundary } from "@/core/monitoring";
import { DiscoveryView } from "@/features/discovery";
import { HubView } from "@/features/hub";
import { RegistrationQRProvider } from "@/features/kiosk";
import { IdleScreen } from "@/features/kiosk/components/IdleScreen";
import { GamesView } from "@/features/games";

/**
 * App Container Content
 * Renders different views based on current state machine state
 */
function AppContainerContent() {
  const { currentState } = useAppState();

  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return <IdleScreen />;

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

      case AppState.HUB:
        return <HubView />;

      case AppState.DISCOVERY:
        return <DiscoveryView />;

      case AppState.GAMES:
        return <GamesView />;

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
      <div className="fixed inset-0 h-screen w-screen overflow-hidden">{renderCurrentState()}</div>
    </ErrorBoundary>
  );
}

function AppContainerInner() {
  const { enabled } = useCvCursorEnabled();
  return (
    <>
      <AppContainerContent />
      <CvCursorOverlay enabled={enabled} />
    </>
  );
}

function AppContainer() {
  return (
    <CvCursorEnabledProvider>
      <SharedCameraProvider>
        <StateProvider>
          <RegistrationQRProvider>
            <AppContainerInner />
          </RegistrationQRProvider>
        </StateProvider>
      </SharedCameraProvider>
    </CvCursorEnabledProvider>
  );
}

export default AppContainer;
