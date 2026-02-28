/**
 * Overlay Dismiss Hook
 * TODO: Implement gesture/button to close overlay
 */
export const useOverlayDismiss = (onDismiss: () => void) => {
  // TODO: Implement overlay dismiss hook (gesture or button)

  return {
    // TODO: Define return shape
    dismiss: onDismiss,
  };
};
