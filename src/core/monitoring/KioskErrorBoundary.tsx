import { useEffect, useRef, type ReactNode } from "react";
import { ErrorBoundary } from "./errorBoundary";

/** How long the crash screen waits before sending the kiosk back to Home by itself. */
export const KIOSK_AUTO_RECOVER_MS = 10_000;
/** A second crash this soon after a restart means restarting didn't help: reload the page. */
export const KIOSK_RELOAD_WINDOW_MS = 30_000;

const PILL =
  "cursor-pointer rounded-glass border-0 bg-action-discover/93 px-20 py-10 font-jersey text-display-md tracking-brand text-white lowercase shadow-glass-card active:scale-95";

/**
 * Full-screen crash screen for the kiosk. The button is a big target for the hand cursor,
 * and the screen restarts on its own so nobody has to be standing there to fix it.
 */
function KioskCrashFallback({ onRestart }: { onRestart: () => void }) {
  const restartRef = useRef(onRestart);
  useEffect(() => {
    restartRef.current = onRestart;
  });

  useEffect(() => {
    const id = setTimeout(() => restartRef.current(), KIOSK_AUTO_RECOVER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-10 bg-page-gradient text-center"
    >
      <h1 className="m-0 font-jersey text-display-xl tracking-brand text-orange lowercase">
        something went wrong
      </h1>
      <p className="m-0 font-averia text-body-xl tracking-brand text-ink-soft lowercase">
        let's head back home!
      </p>
      <button type="button" className={PILL} onClick={onRestart}>
        start over
      </button>
    </div>
  );
}

interface KioskErrorBoundaryProps {
  children: ReactNode;
  /** Send the kiosk back to Home (the boundary then renders its children again). */
  onRestart: () => void;
  /** Hard reload when a restart doesn't fix the crash. Defaults to `window.location.reload`. */
  onReload?: () => void;
}

/**
 * Error boundary for the kiosk views: shows `KioskCrashFallback`, restarts on click or after
 * `KIOSK_AUTO_RECOVER_MS`, and reloads the page if it crashes again soon after a restart.
 */
export function KioskErrorBoundary({
  children,
  onRestart,
  onReload = () => window.location.reload(),
}: KioskErrorBoundaryProps) {
  const lastRestartRef = useRef<number | null>(null);

  const handleError = () => {
    const last = lastRestartRef.current;
    if (last !== null && Date.now() - last < KIOSK_RELOAD_WINDOW_MS) onReload();
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={({ reset }) => (
        <KioskCrashFallback
          onRestart={() => {
            lastRestartRef.current = Date.now();
            onRestart();
            reset();
          }}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
