/**
 * Idle Timeout Hook
 * TODO: Implement 30s no presence → screensaver
 */
export const useIdleTimeout = (_timeout: number = 30000, _onIdle: () => void) => {
  // TODO: Implement idle timeout hook

  return {
    // TODO: Define return shape
    isIdle: false,
    resetIdleTimer: () => {},
  };
};
