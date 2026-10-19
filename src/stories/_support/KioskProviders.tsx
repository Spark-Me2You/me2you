/**
 * Kiosk providers
 * The provider stack AppContainer sets up, for rendering an individual kiosk
 * view (or a component that needs camera/cursor/state context) in isolation.
 */

import type { ReactNode } from 'react';
import { CvCursorEnabledProvider, CvCursorOverlay, useCvCursorEnabled } from '@/core/cv/cursor';
import { SharedCameraProvider } from '@/core/cv/SharedCameraProvider';
import { AppState, StateProvider } from '@/core/state-machine';
import { RegistrationQRProvider } from '@/features/kiosk';

function CursorOverlay() {
  const { enabled } = useCvCursorEnabled();
  return <CvCursorOverlay enabled={enabled} />;
}

export function KioskProviders({ state = AppState.IDLE, children }: { state?: AppState; children: ReactNode }) {
  return (
    <CvCursorEnabledProvider>
      <SharedCameraProvider>
        <StateProvider initialState={state}>
          <RegistrationQRProvider>
            <div className="fixed inset-0 h-screen w-screen overflow-hidden">{children}</div>
            <CursorOverlay />
          </RegistrationQRProvider>
        </StateProvider>
      </SharedCameraProvider>
    </CvCursorEnabledProvider>
  );
}
