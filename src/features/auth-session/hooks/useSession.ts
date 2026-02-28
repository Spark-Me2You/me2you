/**
 * Session Hook
 * TODO: Implement 90s inactivity tracking
 */
export const useSession = () => {
  // TODO: Implement session hook

  return {
    // TODO: Define return shape
    isActive: false,
    timeRemaining: 0,
    extendSession: () => {},
    endSession: () => {},
  };
};
