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
import { KioskErrorBoundary } from "@/core/monitoring/KioskErrorBoundary";
import { DiscoveryView } from "@/features/discovery";
import { HubView } from "@/features/hub";
import { KioskActivityProvider, RegistrationQRProvider, ReturnHome } from "@/features/kiosk";
import { IdleScreen } from "@/features/kiosk/components/IdleScreen";
import { GamesView } from "@/features/games";

/**
 * App Container Content
 * Renders different views based on current state machine state
 */
function AppContainerContent() {
  const { currentState, transitionTo } = useAppState();

  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return <IdleScreen />;

      case AppState.HUB:
        return <HubView />;

      case AppState.DISCOVERY:
        return <DiscoveryView />;

      case AppState.GAMES:
        return <GamesView />;

      default:
        return (
          <div>
            <h1 className="text-[3.2em] leading-[1.1]">Unknown State</h1>
          </div>
        );
    }
  };

  return (
    <>
      <KioskErrorBoundary onRestart={() => transitionTo(AppState.IDLE)}>
        <div className="fixed inset-0 h-screen w-screen overflow-hidden">{renderCurrentState()}</div>
      </KioskErrorBoundary>
      {/* Outside the kiosk boundary so the inactivity return survives a view crash. */}
      <ErrorBoundary fallback={null}>
        <ReturnHome />
      </ErrorBoundary>
    </>
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
          <KioskActivityProvider>
            <RegistrationQRProvider>
              <AppContainerInner />
            </RegistrationQRProvider>
          </KioskActivityProvider>
        </StateProvider>
      </SharedCameraProvider>
    </CvCursorEnabledProvider>
  );
}

export default AppContainer;
